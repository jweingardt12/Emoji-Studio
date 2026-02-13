"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense, startTransition } from "react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { useIsMobile } from "@/hooks/use-mobile"
import { Emoji } from "@/lib/services/emoji-service"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Download, Loader2, Sparkles, X, Copy, ExternalLink, Image as ImageIcon, CheckSquare, Square, Trash2 } from "lucide-react"
const EmojiOverlay = React.lazy(() => import("@/components/emoji-overlay"))
const UserOverlay = React.lazy(() => import("@/components/user-overlay"))
import { getUserLeaderboard, type UserWithEmojiCount } from "@/lib/services/emoji-service"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast as sonner } from "sonner"
import { Badge } from "@/components/ui/badge"
// Lightweight date formatter to replace date-fns
const format = (date: Date | number, formatStr: string) => {
  const d = typeof date === 'number' ? new Date(date * 1000) : date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
import { useAnalytics } from "@/lib/analytics"
import { useTrack } from "@/lib/hooks/use-track"
import DownloadProgressOverlay from '@/components/download-progress-overlay';
import { RefreshButton } from "@/components/refresh-button"
import { cn } from "@/lib/utils"
import { OptimizedEmojiImage } from "@/components/optimized-emoji-image"
import { VirtualizedExplorerGrid } from "@/components/virtualized-explorer-grid"
import { downloadEmojisInParallel, saveZipFile } from "@/lib/utils/download-utils"

function ExplorerPage() {
  // Ref for overlay scroll lock and positioning
  const contentRef = useRef<HTMLDivElement>(null);
  // Add client-side only rendering to avoid hydration mismatches
  const [isClient, setIsClient] = useState(false);
  const isMobile = useIsMobile();

  const { emojiData, loading } = useEmojiData();
  const analytics = useAnalytics();
  const track = useTrack();

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

  // Bulk selection state
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);
  const [selectedEmojis, setSelectedEmojis] = useState<Set<string>>(new Set());

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
          track('Explorer: Opened From Notification', { timestamp });
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

  // Copy actions
  const copyToClipboard = async (text: string, message: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    try {
      await navigator.clipboard.writeText(text);
      sonner.success(message);
    } catch (error) {
      sonner.error("Failed to copy to clipboard");
    }
  };

  const copyEmojiName = (emoji: Emoji, e?: React.MouseEvent) => {
    copyToClipboard(`:${emoji.name}:`, "Emoji name copied!", e);
  };

  const copyEmojiUrl = (emoji: Emoji, e?: React.MouseEvent) => {
    copyToClipboard(emoji.url, "Emoji URL copied!", e);
  };

  const copyImageToClipboard = async (emoji: Emoji, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    try {
      // GIFs can't be reliably copied to clipboard, so copy URL instead
      if (emoji.url.toLowerCase().includes('.gif')) {
        await navigator.clipboard.writeText(emoji.url);
        sonner.success("GIF URL copied! (Animated GIFs can't be copied as images)");
        return;
      }

      const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(emoji.url)}`);
      if (!response.ok) throw new Error('Failed to fetch image');

      const blob = await response.blob();

      // Check if the clipboard API supports this image type
      if (!ClipboardItem.supports(blob.type)) {
        // Fallback to copying URL
        await navigator.clipboard.writeText(emoji.url);
        sonner.success("Image URL copied! (Image format not supported for clipboard)");
        return;
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      sonner.success("Image copied to clipboard!");
    } catch (error) {
      sonner.error("Failed to copy image to clipboard");
    }
  };

  const downloadSingleEmoji = async (emoji: Emoji, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    try {
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(emoji.url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      let extension = '.png';
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('gif')) extension = '.gif';
      else if (contentType?.includes('jpeg')) extension = '.jpg';

      a.download = `${emoji.name}${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      sonner.success(`Downloaded :${emoji.name}:`);
    } catch (error) {
      sonner.error("Failed to download emoji");
    }
  };

  // Bulk selection handlers
  const toggleEmojiSelection = (emojiName: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedEmojis(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emojiName)) {
        newSet.delete(emojiName);
      } else {
        newSet.add(emojiName);
      }
      return newSet;
    });
  };

  const selectAllEmojis = () => {
    const allNames = new Set(sortedEmojis.map(e => e.name));
    setSelectedEmojis(allNames);
  };

  const clearSelection = () => {
    setSelectedEmojis(new Set());
    setBulkSelectionMode(false);
  };

  const downloadSelectedEmojis = async () => {
    if (selectedEmojis.size === 0) return;

    sonner.loading(`Downloading ${selectedEmojis.size} emojis...`, { id: "bulk-download-selected" });

    try {
      const emojisToDownload = sortedEmojis.filter(e => selectedEmojis.has(e.name));

      const { zip, errors, successCount } = await downloadEmojisInParallel(emojisToDownload, {
        batchSize: 10,
      });

      await saveZipFile(zip, `emoji-selection-${Date.now()}.zip`);

      if (errors.length > 0) {
        sonner.success(`Downloaded ${successCount} emojis (${errors.length} failed)`, { id: "bulk-download-selected" });
      } else {
        sonner.success(`Downloaded ${successCount} emojis`, { id: "bulk-download-selected" });
      }
      clearSelection();
    } catch (error) {
      sonner.error("Failed to download selected emojis", { id: "bulk-download-selected" });
    }
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
  };

  const handleDownloadAll = async () => {
    if (!nonAliasCount || isDownloading) return;

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsDownloading(true);
    setDownloadError(null);
    setImageErrors({});

    // Filter out aliases
    const nonAliasEmojis = sortedEmojis.filter(emoji => !emoji.is_alias && !emoji.url.startsWith('alias:'));
    analytics.trackDownloadAllClicked(nonAliasEmojis.length, searchQuery);
    const filesToProcess = nonAliasEmojis.length;
    setTotalFilesToDownload(filesToProcess);
    setProcessedFileCount(0);
    setDownloadProgress(0);

    try {
      const { zip, errors, successCount } = await downloadEmojisInParallel(nonAliasEmojis, {
        batchSize: 10,
        signal,
        onProgress: (processed, total) => {
          setProcessedFileCount(processed);
          setDownloadProgress(Math.round((processed / total) * 100));
        },
      });

      if (signal.aborted) {
        return;
      }

      // Handle errors
      if (errors.length > 0) {
        errors.forEach(name => handleImageError(name));
        setDownloadError(`Download completed with ${errors.length} errors. Some images may be missing.`);
        analytics.trackDownloadAllFailed(filesToProcess, searchQuery, 'partial_completion_with_errors');
      } else if (successCount === 0 && filesToProcess > 0) {
        setDownloadError('No emojis were processed. Please check the console for errors.');
        analytics.trackDownloadAllFailed(filesToProcess, searchQuery, 'no_emojis_processed');
      } else if (filesToProcess === 0) {
        setDownloadError('No emojis found to download (after filtering aliases).');
        analytics.trackDownloadAllFailed(0, searchQuery, 'no_emojis_to_download');
      } else {
        setDownloadError(null);
      }

      // Save the zip file
      if (successCount > 0) {
        await saveZipFile(zip, 'emoji-download.zip');
        analytics.trackDownloadAllSuccess(filesToProcess, searchQuery);
      }

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Handled by handleCancelDownload
      } else {
        setDownloadError('An unexpected error occurred. Please try again.');
        analytics.trackDownloadAllFailed(filesToProcess, searchQuery, 'unexpected_error');
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setTimeout(() => {
          setIsDownloading(false);
          setDownloadProgress(0);
          setProcessedFileCount(0);
          setTotalFilesToDownload(0);
        }, 2000);
      }
      abortControllerRef.current = null;
    }
  };

  if (!isClient) return null;

  const content = (
    <>
      <div className={`${isMobile ? 'px-3 pt-4 pb-3' : 'mb-4 sm:mb-6'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-2xl sm:text-3xl'} font-bold tracking-tight`}>
              Emoji Explorer
            </h1>
            {!isMobile && (
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Browse and search all emojis in your Slack workspace.
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col sm:items-end gap-1">
              <div className={`${isMobile ? 'text-base' : 'text-lg sm:text-xl'} font-semibold tabular-nums`}>
                {nonAliasCount.toLocaleString()}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                {nonAliasCount === 1 ? 'emoji' : 'emojis'}
              </div>
            </div>
            <RefreshButton />
          </div>
        </div>
      </div>
            {/* Filters */}
            <div className={`space-y-3 sm:space-y-4 ${isMobile ? 'px-3 pb-3' : 'mb-4 sm:mb-6'}`}>
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
                      track('Explorer: Clear Date Filter');
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
                  className="w-full rounded-lg bg-background pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
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
                  onClick={() => setBulkSelectionMode(!bulkSelectionMode)}
                  variant={bulkSelectionMode ? "default" : "outline"}
                  className="w-full sm:w-auto"
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  {bulkSelectionMode ? 'Exit Selection' : 'Select Multiple'}
                </Button>

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

              {/* Bulk Selection Actions Bar */}
              {bulkSelectionMode && (
                <div className="flex flex-wrap items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <span className="text-sm font-medium">
                    {selectedEmojis.size} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllEmojis}
                    disabled={selectedEmojis.size === sortedEmojis.length}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    disabled={selectedEmojis.size === 0}
                  >
                    Clear
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={downloadSelectedEmojis}
                    disabled={selectedEmojis.size === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Selected ({selectedEmojis.size})
                  </Button>
                </div>
              )}
            </div>
            {/* Emoji Grid */}
            {loading ? (
              <div className={`mt-4 ${isMobile ? 'px-3' : ''}`}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center rounded-xl border bg-card text-card-foreground p-3 sm:p-4 shadow-sm overflow-hidden">
                      {/* Emoji Image Skeleton */}
                      <div className="flex-shrink-0 my-2">
                        <Skeleton className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg" />
                      </div>
                      <div className="w-full mt-auto space-y-1">
                        {/* Emoji Name Skeleton */}
                        <Skeleton className="h-3.5 w-20 mx-auto" />
                        {/* Creator Name Skeleton */}
                        <Skeleton className="h-3 w-14 mx-auto" />
                        {/* Date Skeleton */}
                        <Skeleton className="h-2.5 w-16 mx-auto" />
                      </div>
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
                  <div className={`mt-4 ${isMobile ? 'px-3' : ''}`}>
                    <VirtualizedExplorerGrid
                      emojis={sortedEmojis}
                      onEmojiClick={(emoji) => setSelectedEmoji(emoji)}
                      getPlaceholderImage={getPlaceholderImage}
                      onImageError={handleImageError}
                      bulkSelectionMode={bulkSelectionMode}
                      selectedEmojis={selectedEmojis}
                      toggleEmojiSelection={toggleEmojiSelection}
                      showNewBadge={showNewBadge}
                      sinceFilter={sinceFilter}
                      copyEmojiName={copyEmojiName}
                      copyEmojiUrl={copyEmojiUrl}
                      copyImageToClipboard={copyImageToClipboard}
                      trackEmojiView={(name, creator) => analytics.trackEmojiView(name, creator)}
                      isMobile={isMobile ?? false}
                    />
                  </div>
                )}
              </>
            )}
    </>
  );

  return (
    <div className="relative">
      <div ref={contentRef} className={`${isMobile ? 'pt-4' : 'px-3 sm:px-4 lg:px-6 py-3 sm:py-4 md:py-6'}`}>
        {isMobile ? (
          // Mobile: No card wrapper
          content
        ) : (
          // Desktop: With card wrapper
          <div className="rounded-xl bg-card border border-border shadow p-3 sm:p-4 md:p-6">
            {content}
          </div>
        )}
      </div>

      {/* Emoji Overlay */}
      {selectedEmoji && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />}>
          <EmojiOverlay
            emoji={selectedEmoji}
            onClose={() => setSelectedEmoji(null)}
            onEmojiClick={(emoji) => {
              startTransition(() => {
                setSelectedEmoji(emoji);
              });
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

// UserWithEmojiCount is now imported from @/lib/services/emoji-service