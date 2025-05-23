"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { DashboardOverlay } from "@/components/dashboard-overlay"
import { Emoji } from "@/lib/services/emoji-service"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Rss, Download, Loader2 } from "lucide-react"
import EmojiOverlay from "@/components/emoji-overlay"
import UserOverlay from "@/components/user-overlay"
import { getUserLeaderboard } from "@/lib/services/emoji-service"
import { format } from "date-fns"
import { useAnalytics } from "@/lib/analytics"
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import DownloadProgressOverlay from '@/components/download-progress-overlay';

function ExplorerPage() {
  // Ref for overlay scroll lock and positioning
  const contentRef = useRef<HTMLDivElement>(null);
  // Add client-side only rendering to avoid hydration mismatches
  const [isClient, setIsClient] = useState(false);
  
  const { emojiData, loading } = useEmojiData();
  const analytics = useAnalytics();

  // State for filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [selectedEmoji, setSelectedEmoji] = useState<Emoji | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithEmojiCount | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [processedFileCount, setProcessedFileCount] = useState(0);
  const [totalFilesToDownload, setTotalFilesToDownload] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null); // For cancelling fetch

  // Pagination state
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  const [displayedEmojis, setDisplayedEmojis] = useState<Emoji[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  
  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const searchParam = urlParams.get('search');
      if (searchParam) {
        setSearchQuery(searchParam);
        if (searchParam.startsWith('U')) {
          analytics.trackEmojiFilter('user_id', searchParam);
        }
      }
    }
  }, []);

  // Fetch leaderboard for user overlay
  const [leaderboard, setLeaderboard] = useState<UserWithEmojiCount[]>([]);
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // getUserLeaderboard expects emoji array and current timestamp
        const data = getUserLeaderboard(emojiData, Math.floor(Date.now() / 1000));
        setLeaderboard(data);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setLeaderboard([]);
      }
    };
    fetchLeaderboard();
  }, [emojiData]);

  // Filter and sort emojis based on search query and sort option
  const filteredEmojis = useMemo(() => {
    if (!emojiData) return [];
    
    return emojiData.filter((emoji) => {
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      const nameMatch = emoji.name.toLowerCase().includes(query);
      const creatorMatch = emoji.user_display_name?.toLowerCase().includes(query) || false;
      const userIdMatch = emoji.user_id?.toLowerCase().includes(query) || false;
      
      return nameMatch || creatorMatch || userIdMatch;
    });
  }, [emojiData, searchQuery]);

  // Sort emojis
  const sortedEmojis = useMemo(() => {
    if (!filteredEmojis) return [];
    
    return [...filteredEmojis].sort((a, b) => {
      if (sortBy === "newest") {
        return (b.created || 0) - (a.created || 0);
      } else if (sortBy === "oldest") {
        return (a.created || 0) - (b.created || 0);
      } else {
        return a.name.localeCompare(b.name);
      }
    });
  }, [filteredEmojis, sortBy]);

  // Load more emojis when scrolling
  const loadMore = useCallback(() => {
    const nextEmojis = sortedEmojis.slice(0, page * PAGE_SIZE);
    setDisplayedEmojis(nextEmojis);
    setHasMore(nextEmojis.length < sortedEmojis.length);
    setPage((prevPage) => prevPage + 1);
  }, [sortedEmojis, page]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setDisplayedEmojis(sortedEmojis.slice(0, PAGE_SIZE));
    setHasMore(sortedEmojis.length > PAGE_SIZE);
  }, [sortedEmojis]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (loading) return;
    
    if (observer.current) {
      observer.current.disconnect();
    }
    
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMore();
      }
    });
    
    if (sentinelRef.current) {
      observer.current.observe(sentinelRef.current);
    }
    
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [sentinelRef.current, loadMore, hasMore, loading]);

  const handleImageError = (emojiName: string) => {
    setImageErrors(prev => ({ ...prev, [emojiName]: true }));
  };

  const getPlaceholderImage = (name: string) => {
    return `https://via.placeholder.com/64x64/EAEAEA/999999?text=${name.slice(0, 2)}`;
  };

  const handleCancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsDownloading(false);
    setDownloadError('Download cancelled by user.');
    analytics.trackDownloadAllCancelled(totalFilesToDownload, searchQuery, processedFileCount);
    // Reset progress states immediately on cancel
    setDownloadProgress(0);
    setProcessedFileCount(0);
    setTotalFilesToDownload(0);
    console.log('Download cancelled by user.');
  };

  const handleDownloadAll = async () => {
    if (!sortedEmojis.length || isDownloading) return;

    abortControllerRef.current = new AbortController(); // Initialize AbortController
    const signal = abortControllerRef.current.signal;

    setIsDownloading(true);
    setDownloadError(null);
    setImageErrors({});
    analytics.trackDownloadAllClicked(sortedEmojis.length, searchQuery);

    // Initialize progress states
    const filesToProcess = sortedEmojis.filter(emoji => !emoji.is_alias && !emoji.url.startsWith('alias:')).length;
    setTotalFilesToDownload(filesToProcess);
    setProcessedFileCount(0);
    setDownloadProgress(0);

    const zip = new JSZip();
    let currentFileNumber = 0; // To update progress

    try {
      for (const emoji of sortedEmojis) {
        if (signal.aborted) {
          console.log('Download aborted, breaking loop.');
          // No need to set error here, handleCancelDownload does it.
          break; // Exit loop if download was cancelled
        }
        
        if (emoji.is_alias || emoji.url.startsWith('alias:')) {
          console.log(`Skipping alias: ${emoji.name}`);
          // Even if skipped, consider it processed for overall progress if it was in the initial count
          // However, totalFilesToDownload already filters these out, so no need to increment processedFileCount here.
          continue;
        }
        
        currentFileNumber++;
        setProcessedFileCount(currentFileNumber);
        if (filesToProcess > 0) {
          setDownloadProgress(Math.round((currentFileNumber / filesToProcess) * 100));
        }

        try {
          const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(emoji.url)}`;
          console.log(`Attempting to fetch emoji via proxy: ${emoji.name}, Proxy URL: ${proxyUrl}`); 
          const response = await fetch(proxyUrl, { signal }); // Pass signal to fetch
          if (!response.ok) {
            if (signal.aborted) break; // Check again if aborted during fetch response handling
            console.error(`Failed to fetch ${emoji.name} (via Proxy URL: ${proxyUrl}): HTTP ${response.status} ${response.statusText}`); 
            handleImageError(emoji.name); 
            continue;
          }
          const blob = await response.blob();
          let extension = '.png'; // Default extension
          const contentType = response.headers.get('content-type');
          if (contentType) {
            if (contentType.includes('gif')) extension = '.gif';
            else if (contentType.includes('jpeg')) extension = '.jpg';
            else if (contentType.includes('png')) extension = '.png';
          }
          // Sanitize emoji name for filename
          const fileName = `${emoji.name.replace(/[^a-zA-Z0-9_\-]/g, '_')}${extension}`;
          zip.file(fileName, blob);
        } catch (error: any) { 
          if (error.name === 'AbortError') {
            console.log('Fetch aborted for emoji:', emoji.name);
            // Error state is handled by handleCancelDownload
            break; // Exit loop
          }
          console.error(`Error processing emoji ${emoji.name} (Original URL: ${emoji.url}):`, error.message, error.stack); 
          handleImageError(emoji.name);
        }
      }

      if (signal.aborted) {
        // If aborted, handleCancelDownload has already managed state.
        return;
      }

      if (Object.keys(imageErrors).length > 0 && processedFileCount < totalFilesToDownload) {
        setDownloadError(`Download completed with ${Object.keys(imageErrors).length} errors. Some images may be missing.`);
        analytics.trackDownloadAllFailed(totalFilesToDownload, searchQuery, 'partial_completion_with_errors');
      } else if (processedFileCount === 0 && totalFilesToDownload > 0) {
        setDownloadError('No emojis were processed. Please check the console for errors.');
        analytics.trackDownloadAllFailed(totalFilesToDownload, searchQuery, 'no_emojis_processed');
      } else if (totalFilesToDownload === 0) {
        setDownloadError('No emojis found to download (after filtering aliases).');
        analytics.trackDownloadAllFailed(0, searchQuery, 'no_emojis_to_download');
      } else {
        setDownloadError(null); // Clear previous errors if successful
      }

      // Only generate zip if not aborted and there are files
      if (zip.files && Object.keys(zip.files).length > 0) {
        zip.generateAsync({ type: 'blob' })
          .then((content) => {
            if (signal.aborted) return; // Check again before saving
            saveAs(content, `emojis-${searchQuery || 'all'}-${sortBy}.zip`);
            analytics.trackDownloadAllSuccess(totalFilesToDownload, searchQuery);
          })
          .catch((err) => {
            if (err.name === 'AbortError') {
              console.log('Zip generation aborted.');
              return;
            }
            console.error('Error generating zip file:', err);
            setDownloadError('Failed to generate zip file. Please try again.');
            analytics.trackDownloadAllFailed(totalFilesToDownload, searchQuery, 'zip_generation_failed');
          });
      } else if (!signal.aborted) {
        console.log('No files to zip.');
        if (totalFilesToDownload > 0) { // If there were files expected but none were added to zip (e.g. all errored)
          setDownloadError('No images could be added to the zip. Check for errors.');
          analytics.trackDownloadAllFailed(totalFilesToDownload, searchQuery, 'empty_zip_due_to_errors');
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Download operation aborted.');
        // State handled by handleCancelDownload
      } else {
        console.error('An unexpected error occurred during download:', error);
        setDownloadError('An unexpected error occurred. Please try again.');
        analytics.trackDownloadAllFailed(totalFilesToDownload, searchQuery, 'unexpected_error');
      }
    } finally {
      // Only set timeout if not aborted, as handleCancelDownload hides modal immediately
      if (!abortControllerRef.current?.signal.aborted) {
        setTimeout(() => {
          setIsDownloading(false);
          setDownloadProgress(0);
          setProcessedFileCount(0);
          setTotalFilesToDownload(0);
        }, 2000); // Keep overlay for 2 seconds after completion/error
      }
      abortControllerRef.current = null; // Clean up controller ref
    }
  };

  if (!isClient) return null;

  return (
    <div className="relative h-screen">
      <div ref={contentRef} className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 overflow-auto h-full">
        <div className="px-4 lg:px-6">
          <div className="rounded-xl bg-card border border-border shadow p-4">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Rss className="h-5 w-5" />
                <span>Emoji Explorer</span>
              </h1>
              <p className="text-muted-foreground">Browse and search all emojis in your Slack workspace.</p>
            </div>
            {/* Filters */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name, creator, or user ID..."
                  className="w-full rounded-lg bg-background pl-10 pr-4 py-2 text-sm shadow-sm"
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.length > 2 || e.target.value.length === 0) {
                      analytics.trackEmojiFilter('search', e.target.value);
                    }
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={(value: "newest" | "oldest" | "name") => setSortBy(value)}>
                  <SelectTrigger className="w-full md:w-auto">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleDownloadAll}
                  disabled={isDownloading || !sortedEmojis.length}
                  variant="outline"
                  className="w-full md:w-auto"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download All ({sortedEmojis.length})
                    </>
                  )}
                </Button>
              </div>
            </div>
            {/* Emoji Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center justify-center p-4 border rounded-lg bg-card">
                    <Skeleton className="h-12 w-12 rounded" />
                    <Skeleton className="h-4 w-16 mt-2" />
                    <Skeleton className="h-3 w-12 mt-1" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {displayedEmojis.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No emojis found matching your search.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {displayedEmojis.map((emoji) => (
                      <div
                        key={`${emoji.name}-${emoji.url}`}
                        className="flex flex-col items-center justify-center rounded-lg border bg-card p-4 shadow hover:border-primary/30 cursor-pointer w-full min-h-[112px]"
                        title={emoji.name}
                        onClick={() => {
                          setSelectedEmoji(emoji);
                          analytics.trackEmojiView(emoji.name, emoji.user_display_name || "");
                        }}
                      >
                        {imageErrors[emoji.name] ? (
                          <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs overflow-hidden">
                            {emoji.name.slice(0, 2)}
                          </div>
                        ) : (
                          <img
                            src={emoji.url || getPlaceholderImage(emoji.name)}
                            alt={`:${emoji.name}:`}
                            className="h-12 w-12 object-contain rounded"
                            onError={() => handleImageError(emoji.name)}
                          />
                        )}
                        <span
                          className="mt-2 text-xs text-muted-foreground text-center w-full max-w-[128px] truncate overflow-hidden whitespace-nowrap block"
                          title={":" + emoji.name + ":"}
                        >
                          :{emoji.name && emoji.name.length > 10 ? emoji.name.slice(0, 10) + "…" : emoji.name}:
                        </span>
                        <span
                          className="mt-1 text-xs text-slate-400 text-center w-full max-w-[128px] truncate overflow-hidden whitespace-nowrap block"
                          title={emoji.user_display_name}
                        >
                          {emoji.user_display_name ? emoji.user_display_name.split(" ")[0] : ""}
                        </span>
                        <span
                          className="mt-1 text-xs text-slate-400 text-center w-full max-w-[128px] truncate overflow-hidden whitespace-nowrap block"
                        >
                          {emoji.created ? format(new Date(emoji.created * 1000), "MMM d") : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} style={{ height: 1 }} />
                {hasMore && (
                  <div className="flex justify-center py-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Emoji Overlay */}
      {selectedEmoji && (
        <EmojiOverlay
          emoji={selectedEmoji}
          onClose={() => setSelectedEmoji(null)}
          onEmojiClick={(emoji) => {
            setSelectedEmoji(emoji);
          }}
          onUserClick={(userId: string, userName: string) => {
            const userFromLeaderboard = leaderboard.find(u => u.user_id === userId);
            if (userFromLeaderboard) {
              setSelectedUser(userFromLeaderboard);
            } else {
              setSelectedUser({
                user_id: userId,
                user_display_name: userName || 'Unknown User',
                emoji_count: 0, 
                l4wepw: 0,
                l4wepwChange: 0,
                most_recent_emoji_timestamp: 0,
                oldest_emoji_timestamp: 0
              } as UserWithEmojiCount);
            }
            analytics.trackUserProfileView(userName);
          }}
        />
      )}
      {/* User Overlay */}
      {selectedUser && (
        <UserOverlay 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
        />
      )}
      {/* Dashboard Overlay - shows when no emoji data is loaded */}
      <DashboardOverlay />
      {/* Download Progress Overlay */}
      <DownloadProgressOverlay 
        isOpen={isDownloading}
        progress={downloadProgress}
        processedFiles={processedFileCount}
        totalFiles={totalFilesToDownload}
        onCancel={handleCancelDownload} // Pass the cancel handler
      />
    </div>
  );
}

export default ExplorerPage;

// Define base User interface locally
interface User {
  user_id: string;
  user_display_name: string;
}

// Define UserWithEmojiCount type if not already globally available
// This is based on the structure returned by getUserLeaderboard
interface UserWithEmojiCount extends User {
  emoji_count: number;
  most_recent_emoji_timestamp: number;
  oldest_emoji_timestamp: number;
  l4wepw: number;
  l4wepwChange: number;
  // rank?: number; // Optional rank if you plan to use it
}