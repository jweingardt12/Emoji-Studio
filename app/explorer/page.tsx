"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react"
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
import { openpanel } from "@/lib/safe-openpanel"
import DownloadProgressOverlay from '@/components/download-progress-overlay';
import { RefreshButton } from "@/components/refresh-button"
import { cn } from "@/lib/utils"

function ExplorerPage() {
  // Ref for overlay scroll lock and positioning
  const contentRef = useRef<HTMLDivElement>(null);
  // Add client-side only rendering to avoid hydration mismatches
  const [isClient, setIsClient] = useState(false);
  const isMobile = useIsMobile();
  
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

  // Bulk selection state
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);
  const [selectedEmojis, setSelectedEmojis] = useState<Set<string>>(new Set());

  // Hover preview state
  const [hoveredEmoji, setHoveredEmoji] = useState<Emoji | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

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
          openpanel.track('Explorer: Opened From Notification', { timestamp });
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

    const [JSZip, { saveAs }] = await Promise.all([
      import('jszip').then(m => m.default),
      import('file-saver')
    ]);

    sonner.loading(`Downloading ${selectedEmojis.size} emojis...`, { id: "bulk-download-selected" });

    try {
      const zip = new JSZip();
      const emojisToDownload = sortedEmojis.filter(e => selectedEmojis.has(e.name));

      for (const emoji of emojisToDownload) {
        try {
          const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(emoji.url)}`;
          const response = await fetch(proxyUrl);

          if (!response.ok) continue;

          const blob = await response.blob();
          let extension = '.png';
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('gif')) extension = '.gif';
          else if (contentType?.includes('jpeg')) extension = '.jpg';

          const fileName = `${emoji.name.replace(/[^a-zA-Z0-9_\-]/g, '_')}${extension}`;
          zip.file(fileName, blob);
        } catch (error) {
          console.error(`Failed to download ${emoji.name}`, error);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `emoji-selection-${Date.now()}.zip`);

      sonner.success(`Downloaded ${selectedEmojis.size} emojis`, { id: "bulk-download-selected" });
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
          continue;
        }
        
        currentFileNumber++;
        setProcessedFileCount(currentFileNumber);
        if (filesToProcess > 0) {
          setDownloadProgress(Math.round((currentFileNumber / filesToProcess) * 100));
        }

        try {
          const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(emoji.url)}`;
          const response = await fetch(proxyUrl, { signal: abortControllerRef.current.signal });
          
          if (!response.ok) {
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
            break; // Exit loop if fetch was aborted
          }
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
            setDownloadError('Failed to generate zip file. Please try again.');
            analytics.trackDownloadAllFailed(totalFilesToDownload, searchQuery, 'zip_generation_failed');
          });
      } else if (!signal.aborted) {
        if (totalFilesToDownload > 0) { // If there were files expected but none were added to zip (e.g. all errored)
          setDownloadError('No images could be added to the zip. Check for errors.');
          analytics.trackDownloadAllFailed(totalFilesToDownload, searchQuery, 'empty_zip_due_to_errors');
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // No need to set error here, handleCancelDownload does it.
      } else {
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
                      openpanel.track('Explorer: Clear Date Filter');
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
                <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg border">
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
                    <div key={i} className="flex flex-col items-center justify-between rounded-xl border-2 bg-card p-4 shadow-sm">
                      {/* Emoji Image Skeleton - Larger */}
                      <div className="flex-shrink-0 mb-3 mt-2">
                        <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg" />
                      </div>
                      <div className="w-full space-y-2">
                        {/* Emoji Name Skeleton */}
                        <Skeleton className="h-4 w-24 mx-auto" />
                        {/* Creator Name Skeleton */}
                        <Skeleton className="h-3 w-16 mx-auto" />
                        {/* Date Skeleton */}
                        <Skeleton className="h-3 w-20 mx-auto" />
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                      {sortedEmojis.map((emoji) => (
                        <div
                          key={`${emoji.name}-${emoji.url}`}
                          className={cn(
                            "group relative flex flex-col items-center justify-between rounded-xl border-2 bg-card p-4 shadow-sm hover:shadow-lg transition-all cursor-pointer w-full",
                            showNewBadge && sinceFilter && emoji.created && emoji.created >= sinceFilter && "ring-2 ring-primary/50 bg-primary/5",
                            selectedEmojis.has(emoji.name) && bulkSelectionMode && "ring-2 ring-primary bg-primary/5 border-primary",
                            !bulkSelectionMode && "hover:border-primary/40"
                          )}
                          onClick={(e) => {
                            if (bulkSelectionMode) {
                              toggleEmojiSelection(emoji.name, e);
                            } else {
                              setSelectedEmoji(emoji);
                              analytics.trackEmojiView(emoji.name, emoji.user_display_name || "");
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (!isMobile && !bulkSelectionMode) {
                              setHoveredEmoji(emoji);
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoverPosition({ x: rect.left, y: rect.top });
                            }
                          }}
                          onMouseLeave={() => {
                            if (!isMobile) {
                              setHoveredEmoji(null);
                            }
                          }}
                        >
                          {/* Bulk Selection Checkbox */}
                          {bulkSelectionMode && (
                            <div className="absolute top-2 left-2 z-10">
                              <div className={cn(
                                "h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
                                selectedEmojis.has(emoji.name)
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "bg-background border-muted-foreground/30"
                              )}>
                                {selectedEmojis.has(emoji.name) && (
                                  <CheckSquare className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          )}

                          {/* New badge */}
                          {showNewBadge && sinceFilter && emoji.created && emoji.created >= sinceFilter && (
                            <Badge variant="default" className="absolute top-2 right-2 text-xs px-2 py-0.5">
                              New
                            </Badge>
                          )}

                          {/* Type Badge */}
                          {!bulkSelectionMode && (
                            <Badge
                              variant={emoji.url.includes('.gif') ? "default" : "secondary"}
                              className="absolute top-2 right-2 text-xs px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {emoji.url.includes('.gif') ? 'GIF' : 'IMG'}
                            </Badge>
                          )}

                          {/* Emoji Image - Larger */}
                          <div className="flex-shrink-0 mb-3 mt-2">
                            {imageErrors[emoji.name] ? (
                              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                                {emoji.name.slice(0, 2).toUpperCase()}
                              </div>
                            ) : (
                              <img
                                src={emoji.url || getPlaceholderImage(emoji.name)}
                                alt={`:${emoji.name}:`}
                                className="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-lg group-hover:scale-110 transition-transform duration-200"
                                onError={() => handleImageError(emoji.name)}
                                loading="lazy"
                              />
                            )}
                          </div>

                          {/* Emoji Details */}
                          <div className="w-full space-y-1">
                            {/* Emoji Name */}
                            <p className="text-sm font-semibold text-foreground text-center truncate px-1" title={`:${emoji.name}:`}>
                              :{emoji.name.length > 14 ? emoji.name.slice(0, 14) + "…" : emoji.name}:
                            </p>

                            {/* Creator Name */}
                            {emoji.user_display_name && (
                              <p className="text-xs text-muted-foreground text-center truncate px-1" title={emoji.user_display_name}>
                                by {emoji.user_display_name.split(" ")[0]}
                              </p>
                            )}

                            {/* Creation Date */}
                            {emoji.created && (
                              <p className="text-xs text-muted-foreground/80 text-center">
                                {new Date(emoji.created * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                              </p>
                            )}
                          </div>

                          {/* Quick Actions - Desktop Only */}
                          {!isMobile && !bulkSelectionMode && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-1 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => copyEmojiName(emoji, e)}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copy name</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => copyEmojiUrl(emoji, e)}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copy URL</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => downloadSingleEmoji(emoji, e)}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Download</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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

      {/* Enhanced Hover Preview - Desktop Only */}
      {hoveredEmoji && !isMobile && (
        <div
          className="fixed z-40 pointer-events-none"
          style={{
            left: hoverPosition.x + 200,
            top: hoverPosition.y,
          }}
        >
          <div className="bg-popover border-2 border-primary/50 rounded-xl shadow-2xl p-4 w-64 animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Large Emoji Preview */}
            <div className="flex justify-center mb-4">
              <img
                src={hoveredEmoji.url}
                alt={`:${hoveredEmoji.name}:`}
                className="h-32 w-32 object-contain rounded-lg"
                onError={() => {}}
              />
            </div>

            {/* Emoji Details */}
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Name</p>
                <p className="font-semibold text-sm break-all">:{hoveredEmoji.name}:</p>
              </div>

              {hoveredEmoji.user_display_name && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Creator</p>
                  <p className="text-sm">{hoveredEmoji.user_display_name}</p>
                </div>
              )}

              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Type</p>
                  <Badge variant={hoveredEmoji.url.includes('.gif') ? "default" : "secondary"} className="text-xs">
                    {hoveredEmoji.url.includes('.gif') ? 'GIF' : 'Image'}
                  </Badge>
                </div>

                {hoveredEmoji.created && (
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Created</p>
                    <p className="text-xs">
                      {new Date(hoveredEmoji.created * 1000).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>

              {hoveredEmoji.is_alias === 1 && hoveredEmoji.alias_for && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Alias</p>
                  <p className="text-xs">Points to :{hoveredEmoji.alias_for}:</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

// UserWithEmojiCount is now imported from @/lib/services/emoji-service