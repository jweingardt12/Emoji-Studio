"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { Emoji } from "@/lib/services/emoji-service"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Rss, Download, Loader2, Sparkles, X } from "lucide-react"
const EmojiOverlay = React.lazy(() => import("@/components/emoji-overlay"))
const UserOverlay = React.lazy(() => import("@/components/user-overlay"))
import { getUserLeaderboard, type UserWithEmojiCount } from "@/lib/services/emoji-service"
// Lightweight date formatter to replace date-fns
const format = (date: Date | number, formatStr: string) => {
  const d = typeof date === 'number' ? new Date(date * 1000) : date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
import { useAnalytics } from "@/lib/analytics"
import DownloadProgressOverlay from '@/components/download-progress-overlay';
import { cn } from "@/lib/utils"

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
  
  // State for date filtering (for notifications)
  const [sinceFilter, setSinceFilter] = useState<number | null>(null);
  const [showNewBadge, setShowNewBadge] = useState(false);

  // Remove pagination state as we're using virtual scrolling
  
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
      
      // Check for date filter from notifications
      const sinceParam = urlParams.get('since');
      if (sinceParam) {
        const timestamp = parseInt(sinceParam, 10);
        if (!isNaN(timestamp)) {
          setSinceFilter(timestamp);
          setShowNewBadge(true);
          analytics.trackEmojiFilter('since_date', timestamp.toString());
          analytics.track('Explorer: Opened From Notification', { timestamp });
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
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = emoji.name.toLowerCase().includes(query);
        const creatorMatch = emoji.user_display_name?.toLowerCase().includes(query) || false;
        const userIdMatch = emoji.user_id?.toLowerCase().includes(query) || false;
        
        if (!nameMatch && !creatorMatch && !userIdMatch) {
          return false;
        }
      }
      
      // Apply date filter
      if (sinceFilter && emoji.created) {
        if (emoji.created < sinceFilter) {
          return false;
        }
      }
      
      return true;
    });
  }, [emojiData, searchQuery, sinceFilter]);
  
  // Count non-alias emojis for consistency with dashboard
  const nonAliasCount = useMemo(() => {
    return filteredEmojis.filter(emoji => !emoji.is_alias).length;
  }, [filteredEmojis]);

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
    if (!nonAliasCount || isDownloading) return;

    // Dynamically import JSZip and file-saver to reduce initial bundle size
    const [JSZip, { saveAs }] = await Promise.all([
      import('jszip').then(m => m.default),
      import('file-saver')
    ]);

    abortControllerRef.current = new AbortController(); // Initialize AbortController
    const signal = abortControllerRef.current.signal;

    setIsDownloading(true);
    setDownloadError(null);
    setImageErrors({});
    
    // Initialize progress states - filter out aliases
    const nonAliasEmojis = sortedEmojis.filter(emoji => !emoji.is_alias && !emoji.url.startsWith('alias:'));
    analytics.trackDownloadAllClicked(nonAliasEmojis.length, searchQuery);
    const filesToProcess = nonAliasEmojis.length;
    setTotalFilesToDownload(filesToProcess);
    setProcessedFileCount(0);
    setDownloadProgress(0);

    const zip = new JSZip();
    let currentFileNumber = 0; // To update progress

    try {
      for (const emoji of nonAliasEmojis) {
        if (signal.aborted) {
          console.log('Download aborted, breaking loop.');
          // No need to set error here, handleCancelDownload does it.
          break; // Exit loop if download was cancelled
        }
        
        // Aliases are already filtered out, but keeping this check for safety
        if (emoji.is_alias || emoji.url.startsWith('alias:')) {
          console.log(`Skipping alias: ${emoji.name}`);
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
            saveAs(content, 'emoji-download.zip'); // Updated filename
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
    <div className="relative">
      <div ref={contentRef} className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 md:py-6">
        <div className="rounded-xl bg-card border border-border shadow p-3 sm:p-4 md:p-6">
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Rss className="h-5 w-5" />
                    <span>Emoji Explorer</span>
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    Browse and search all emojis in your Slack workspace.
                  </p>
                </div>
                <div className="flex flex-col sm:items-end gap-1">
                  <div className="text-lg sm:text-xl font-semibold tabular-nums">
                    {nonAliasCount.toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {nonAliasCount === 1 ? 'emoji' : 'emojis'}
                  </div>
                </div>
              </div>
            </div>
            {/* Filters */}
            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              {/* New Emojis Badge */}
              {sinceFilter && (
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    <span className="font-medium">Showing new emojis from the last 24 hours</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      analytics.track('Explorer: Clear Date Filter');
                      setSinceFilter(null);
                      setShowNewBadge(false);
                      // Remove since param from URL
                      const url = new URL(window.location.href);
                      url.searchParams.delete('since');
                      window.history.replaceState({}, '', url.toString());
                    }}
                  >
                    <X className="h-4 w-4" />
                    <span className="ml-1">Clear filter</span>
                  </Button>
                </div>
              )}
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name, creator, or user ID..."
                  className="w-full rounded-lg bg-background pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm shadow-sm"
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.length > 2 || e.target.value.length === 0) {
                      analytics.trackEmojiFilter('search', e.target.value);
                    }
                  }}
                />
              </div>
              
              {/* Sort and Download Controls */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Select value={sortBy} onValueChange={(value: "newest" | "oldest" | "name") => setSortBy(value)}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  onClick={handleDownloadAll}
                  disabled={isDownloading || !nonAliasCount}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download All ({nonAliasCount})
                    </>
                  )}
                </Button>
              </div>
            </div>
            {/* Emoji Grid */}
            {loading ? (
              <div className="mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center justify-center p-2 sm:p-3 border rounded-lg bg-card min-h-[120px] sm:min-h-[130px]">
                      {/* Emoji Image Skeleton */}
                      <div className="flex-shrink-0 mb-1.5 sm:mb-2">
                        <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded" />
                      </div>
                      {/* Emoji Name Skeleton */}
                      <Skeleton className="h-3 w-16 mb-0.5" />
                      {/* Creator Name Skeleton */}
                      <Skeleton className="h-3 w-12 mb-0.5" />
                      {/* Date Skeleton */}
                      <Skeleton className="h-3 w-10" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {sortedEmojis.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Search className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-2">No emojis found</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {searchQuery ? `No emojis match "${searchQuery}"` : 'No emojis available'}
                    </p>
                    {searchQuery && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4"
                        onClick={() => setSearchQuery('')}
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="mt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                      {sortedEmojis.map((emoji) => (
                        <div
                          key={`${emoji.name}-${emoji.url}`}
                          className={cn(
                            "relative flex flex-col items-center justify-center rounded-lg border bg-card p-2 sm:p-3 shadow hover:border-primary/30 hover:shadow-md transition-all cursor-pointer w-full min-h-[120px] sm:min-h-[130px]",
                            showNewBadge && sinceFilter && emoji.created && emoji.created >= sinceFilter && "ring-2 ring-primary/50 bg-primary/5"
                          )}
                          title={emoji.name}
                          onClick={() => {
                            setSelectedEmoji(emoji);
                            analytics.trackEmojiView(emoji.name, emoji.user_display_name || "");
                          }}
                        >
                          {/* New badge */}
                          {showNewBadge && sinceFilter && emoji.created && emoji.created >= sinceFilter && (
                            <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full font-medium">
                              New
                            </div>
                          )}
                          {/* Emoji Image */}
                          <div className="flex-shrink-0 mb-1.5 sm:mb-2">
                            {imageErrors[emoji.name] ? (
                              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                                {emoji.name.slice(0, 2).toUpperCase()}
                              </div>
                            ) : (
                              <img
                                src={emoji.url || getPlaceholderImage(emoji.name)}
                                alt={`:${emoji.name}:`}
                                className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded"
                                onError={() => handleImageError(emoji.name)}
                                loading="lazy"
                              />
                            )}
                          </div>
                          
                          {/* Emoji Name */}
                          <span
                            className="text-xs font-medium text-foreground text-center w-full truncate px-1 mb-0.5"
                            title={`:${emoji.name}:`}
                          >
                            :{emoji.name && emoji.name.length > 12 ? emoji.name.slice(0, 12) + "…" : emoji.name}:
                          </span>
                          
                          {/* Creator Name */}
                          <span
                            className="text-xs text-muted-foreground text-center w-full truncate px-1 mb-0.5"
                            title={emoji.user_display_name}
                          >
                            {emoji.user_display_name ? emoji.user_display_name.split(" ")[0] : ""}
                          </span>
                          
                          {/* Creation Date */}
                          <span className="text-xs text-muted-foreground text-center w-full truncate px-1">
                            {emoji.created ? new Date(emoji.created * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
        </div>
      </div>
      {/* Emoji Overlay */}
      {selectedEmoji && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />}>
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
        </Suspense>
      )}
      {/* User Overlay */}
      {selectedUser && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />}>
          <UserOverlay 
            user={selectedUser} 
            onClose={() => setSelectedUser(null)} 
          />
        </Suspense>
      )}
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