"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { RequireData } from "@/components/require-data"
import { DashboardOverlay } from "@/components/dashboard-overlay"
import { Emoji } from "@/lib/services/emoji-service"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Rss } from "lucide-react"
import EmojiOverlay from "@/components/emoji-overlay"
import UserOverlay from "@/components/user-overlay"
import { getUserLeaderboard } from "@/lib/services/emoji-service"
import { format } from "date-fns"
import { useAnalytics } from "@/lib/analytics"

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
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

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
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
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
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by emoji name, creator, or user ID (e.g., U01E982T26T)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 h-10"
                />
              </div>
              <div className="flex-shrink-0 w-full sm:w-48">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <SelectTrigger className="h-10">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
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
          onUserClick={(userId, userName) => {
            setSelectedEmoji(null);
            const userEmojis = emojiData.filter((e) => e.user_id === userId);
            if (userEmojis.length > 0) {
              // Filter out aliases for accurate counts
              const filteredUserEmojis = userEmojis.filter((e) => !e.is_alias);
              const emojiCount = filteredUserEmojis.length;
              const timestamps = filteredUserEmojis.map((e) => e.created);
              const mostRecentTimestamp = Math.max(...timestamps);
              const oldestTimestamp = Math.min(...timestamps);
              const userRank = leaderboard.findIndex(u => u.user_id === userId) + 1;
              
              // Calculate L4WEPW (Last 4 Weeks Emojis Per Week)
              const now = Math.floor(Date.now() / 1000);
              const fourWeeksAgo = now - (28 * 24 * 60 * 60); // 4 weeks in seconds
              const eightWeeksAgo = now - (56 * 24 * 60 * 60); // 8 weeks in seconds
              
              const last4WeeksEmojis = filteredUserEmojis.filter((emoji) => emoji.created >= fourWeeksAgo);
              const l4wepw = last4WeeksEmojis.length / 4;
              
              // Calculate previous 4 weeks for comparison
              const previous4WeeksEmojis = filteredUserEmojis.filter(
                (emoji) => emoji.created >= eightWeeksAgo && emoji.created < fourWeeksAgo
              );
              const previous4wepw = previous4WeeksEmojis.length / 4;
              
              // Calculate percentage change
              const l4wepwChange = previous4wepw > 0 ? ((l4wepw - previous4wepw) / previous4wepw) * 100 : 0;
              
              setSelectedUser({
                user_id: userId,
                user_display_name: userName,
                emoji_count: emojiCount,
                most_recent_emoji_timestamp: mostRecentTimestamp,
                oldest_emoji_timestamp: oldestTimestamp,
                l4wepw,
                l4wepwChange,
                rank: userRank > 0 ? userRank : undefined
              });
            }
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
    </div>
  );
}

export default function ExplorerPageWrapper() {
  return (
    <RequireData>
      <ExplorerPage />
    </RequireData>
  );
}