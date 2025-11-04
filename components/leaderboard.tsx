"use client"

import { ChevronLeft, ChevronRight, Calendar, Info, Search, Trophy, Check, TrendingUp, TrendingDown, Minus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import React, { useState, useMemo, useEffect, useCallback } from "react"
import { format, subYears } from "date-fns"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import EmojiOverlay from "@/components/emoji-overlay"; 
import type { Emoji } from "@/lib/services/emoji-service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile"; 

// Remove this import and define a fallback type below if @shared/schema.js is missing
// import { UserWithEmojiCount } from "@shared/schema.js";
// (Removed: @shared/schema.js is not present. Using fallback type below.)

export type DateRange = "7days" | "30days" | "quarter" | "year" | "all"

export type LeaderboardVariant = "compact" | "expanded"

// Fallback type definition for UserWithEmojiCount if not available from schema
// Ensure this matches the structure used by getUserLeaderboard and expected by onViewUser
export interface UserWithEmojiCount {
  user_id: string
  user_display_name: string
  emoji_count: number
  l4wepw?: number
  l4wepwChange?: number
  most_recent_emoji_timestamp?: number
  oldest_emoji_timestamp?: number
  recent_emojis?: Emoji[]
  rank?: number
}

export interface LeaderboardProps {
  leaderboard?: UserWithEmojiCount[]
  isLoading?: boolean
  error?: any
  onViewUser?: (user: UserWithEmojiCount) => void
  dateRange: DateRange
  setDateRange: (range: DateRange) => void

  /**
   * Variant controls whether the leaderboard is compact (dashboard) or expanded (full page)
   * - 'compact': show only top N users, hide pagination and advanced filters
   * - 'expanded': show all features
   */
  variant?: LeaderboardVariant
  showDemoData?: boolean
  showInactiveUsers?: boolean
  setShowInactiveUsers?: (show: boolean) => void
  /**
   * Optional search query to filter users by name
   */
  searchQuery?: string
}

/**
 * Helper function to get trend icon and color based on percentage change
 */
function getTrendIndicator(change: number) {
  if (change > 5) {
    return {
      icon: TrendingUp,
      color: "text-green-500",
      label: "Increasing activity"
    }
  } else if (change < -5) {
    return {
      icon: TrendingDown,
      color: "text-red-500",
      label: "Decreasing activity"
    }
  } else {
    return {
      icon: Minus,
      color: "text-yellow-500",
      label: "Stable activity"
    }
  }
}

/**
 * Calculate "Top X%" ranking (what percentage tier from the top)
 */
function calculatePercentile(userIndex: number, totalUsers: number): number {
  if (totalUsers <= 0) return 100
  return Math.round(((userIndex + 1) / totalUsers) * 100)
}

const Leaderboard = ({
  leaderboard,
  isLoading,
  error,
  onViewUser,
  dateRange,
  setDateRange,

  variant = "expanded", 
  showDemoData = false,
  showInactiveUsers = false,
  setShowInactiveUsers,
  searchQuery: externalSearchQuery,
}: LeaderboardProps) => {
  const isMobile = useIsMobile()
  // Hydration-safe now/oneYearAgo for client-only date logic
  const [now, setNow] = useState<Date | null>(null)
  const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null)
  const [selectedEmoji, setSelectedEmoji] = useState<Emoji | null>(null); 

  // Hydration-safe: only set dates on client
  useEffect(() => {
    const n = new Date()
    setNow(n)
    setOneYearAgo(subYears(n, 1))
  }, [])

  const [sortBy, setSortBy] = useState<"emoji_count" | "l4wepw" | "epw">("emoji_count")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  // Use external searchQuery if provided, otherwise use internal state
  const [internalSearchQuery, setInternalSearchQuery] = useState("")
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery
  // Show top 10 items in compact mode (dashboard)
  const compactLimit = 10
  const itemsPerPage = variant === "compact" ? compactLimit : 25

  const handleSort = useCallback(
    (column: "emoji_count" | "l4wepw" | "epw") => {
      if (sortBy === column) {
        const newDirection = sortDirection === "desc" ? "asc" : "desc"
        setSortDirection(newDirection)
      } else {
        setSortBy(column)
        setSortDirection("desc")
      }
    },
    [sortBy, sortDirection],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [dateRange])

  const sortedLeaderboard = useMemo(() => {
    const list = [...(leaderboard || [])]
    list.sort((a, b) => {
      if (sortBy === "emoji_count") {
        return sortDirection === "desc" ? b.emoji_count - a.emoji_count : a.emoji_count - b.emoji_count
      } else {
        const aVal = a.l4wepw ?? 0
        const bVal = b.l4wepw ?? 0
        return sortDirection === "desc" ? bVal - aVal : aVal - bVal
      }
    })
    return list
  }, [leaderboard, sortBy, sortDirection])

  // Filter inactive users (users with no recent emoji activity)
  const filteredByActivityLeaderboard = useMemo(() => {
    if (!sortedLeaderboard) return [];
    
    let filtered = sortedLeaderboard;
    
    // Filter by activity status if needed
    if (!showInactiveUsers) {
      // Only show active users (with activity in the last 90 days)
      const ninetyDaysAgo = now ? new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).getTime() / 1000 : 0;
      filtered = filtered.filter(user => {
        // Consider a user active if they've created an emoji in the last 90 days
        return user.most_recent_emoji_timestamp && user.most_recent_emoji_timestamp > ninetyDaysAgo;
      });
    }
    
    return filtered;
  }, [sortedLeaderboard, showInactiveUsers, now]);
  
  // Filter by search query - Using useEffect  // Initialize with empty array for server-side rendering
  const [filteredBySearchLeaderboard, setFilteredBySearchLeaderboard] = useState<UserWithEmojiCount[]>([]);
  
  // Initialize with the activity-filtered leaderboard
  useEffect(() => {
    setFilteredBySearchLeaderboard(filteredByActivityLeaderboard);
  }, [filteredByActivityLeaderboard]);
  
  // Apply search filtering on the client side only
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBySearchLeaderboard(filteredByActivityLeaderboard);
      return;
    }
    
    const query = searchQuery.toLowerCase().trim();
    const filtered = filteredByActivityLeaderboard.filter(user => {
      const displayName = user.user_display_name?.toLowerCase() || "";
      return displayName.includes(query);
    });
    
    setFilteredBySearchLeaderboard(filtered);
  }, [filteredByActivityLeaderboard, searchQuery]);

  // Update total pages based on filtered search results
  const totalPages = Math.ceil((filteredBySearchLeaderboard?.length || 0) / itemsPerPage)
  
  // Initialize with empty array for server-side rendering
  const [paginatedLeaderboard, setPaginatedLeaderboard] = useState<UserWithEmojiCount[]>([]);

  // Track number of empty rows needed for consistent display
  const [emptyRowsCount, setEmptyRowsCount] = useState(0);
  
  // Compute paginated data - make this a useMemo to ensure consistent rendering
  const computedPaginatedLeaderboard = useMemo(() => {
    // During server-side rendering, return an empty array
    if (typeof window === 'undefined') return [];
    
    // Always show only the top results in compact variant
    if (variant === "compact") {
      return filteredBySearchLeaderboard.slice(0, compactLimit);
    } else {
      // Use pagination for expanded variant
      return filteredBySearchLeaderboard.slice(
        (currentPage - 1) * itemsPerPage, 
        currentPage * itemsPerPage
      );
    }
  }, [filteredBySearchLeaderboard, currentPage, itemsPerPage, variant, compactLimit]);
  
  // Calculate empty rows needed - also use useMemo for consistency
  const computedEmptyRowsCount = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    if (variant === "compact") return 0;
    
    // Calculate empty rows needed when showing search results
    if (computedPaginatedLeaderboard.length < itemsPerPage && searchQuery.trim()) {
      return itemsPerPage - computedPaginatedLeaderboard.length;
    }
    return 0;
  }, [computedPaginatedLeaderboard, itemsPerPage, searchQuery, variant]);
  
  // Update state from computed values - use useEffect to avoid direct state updates during render
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPaginatedLeaderboard(computedPaginatedLeaderboard);
    setEmptyRowsCount(computedEmptyRowsCount);
  }, [computedPaginatedLeaderboard, computedEmptyRowsCount])
  
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  if (!now || !oneYearAgo) { // Also check oneYearAgo for completeness, though `now` is the primary gate for useEffect-dependent logic
    // Render a placeholder or null on the server/initial client render to avoid hydration issues
    return null; 
  }

  const todayStr = format(new Date(), "yyyy-MM-dd")

  return (
    <div className="flex flex-col gap-4"> {/* Main component wrapper */}
      {/* Header with Search and Filters */}
      {variant === "expanded" && (
        <div className={`flex flex-col gap-3 ${isMobile ? 'px-3' : 'px-1'} pt-1 pb-2 md:pb-4 border-b border-border/60`}>
          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setInternalSearchQuery(e.target.value)}
              className="w-full pl-9"
            />
          </div>
          
          {/* Filters Row - Mobile Optimized */}
          <div className="flex items-center gap-2">
            {/* Date Range Selector */}
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
              <SelectTrigger className="flex-1 h-8 text-xs sm:text-sm">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Show Inactive Toggle - Ultra Compact for Mobile */}
            <button
              onClick={() => setShowInactiveUsers?.(!showInactiveUsers)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 h-8 rounded-md transition-colors text-xs whitespace-nowrap",
                showInactiveUsers 
                  ? "bg-primary/10 text-primary hover:bg-primary/20" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted/70"
              )}
              aria-label="Toggle inactive users"
            >
              <div className={cn(
                "h-3 w-3 rounded-sm border transition-colors flex items-center justify-center",
                showInactiveUsers 
                  ? "bg-primary border-primary" 
                  : "bg-background border-input"
              )}>
                {showInactiveUsers && (
                  <Check className="h-2 w-2 text-primary-foreground" />
                )}
              </div>
              <span>Inactive</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slack-purple mb-4"></div>
          <p>Loading leaderboard...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center py-10 text-destructive">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-red-500 font-medium">Failed to load leaderboard data</p>
          {error instanceof Error ? <p className="text-red-400 text-sm mt-2">{error.message}</p> : null}
        </div>
      )}

      {/* No Data State */}
      {!isLoading && !error && paginatedLeaderboard.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <p>No emoji creators found for the selected date range</p>
          <button
            className="mt-4 px-4 py-2 bg-slack-purple text-white rounded-lg hover:bg-purple-700 transition"
            onClick={() => setDateRange("all")}
          >
            Show All Time
          </button>
        </div>
      )}

      {/* Leaderboard Table */}
      {!isLoading && !error && paginatedLeaderboard.length > 0 && (
        <div className="overflow-x-auto flex-1 border-t border-border/60">
          <Table className="min-w-full">
            <TableHeader className="[&_tr]:border-b-0 bg-muted/20 dark:bg-black/10">
              <TableRow>
                <TableHead className="w-[40px] sm:w-[50px] text-center text-xs sm:text-sm p-2 sm:p-3">
                  <span className="sm:hidden">#</span>
                  <span className="hidden sm:inline">Rank</span>
                </TableHead>
                <TableHead className="text-left text-xs sm:text-sm p-2 sm:p-3">User</TableHead>
                {variant === "expanded" && (
                  <TableHead className="hidden md:table-cell w-[150px] text-left">Emoji Samples</TableHead>
                )}
                {dateRange === "all" && (
                  <>
                    <TableHead className="w-[50px] sm:w-[100px] text-right text-xs sm:text-sm p-2 sm:p-3">
                      <TooltipProvider>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger className="cursor-help border-b border-dotted border-muted-foreground">
                            EPW
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Emojis Per Week (last 4 weeks)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="w-[60px] sm:w-[80px] text-center text-xs sm:text-sm p-2 sm:p-3">
                      <TooltipProvider>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger className="cursor-help border-b border-dotted border-muted-foreground">
                            Trend
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Activity trend (last 4 weeks vs previous 4 weeks)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                  </>
                )}
                <TableHead
                  className="w-[60px] sm:w-[120px] text-right text-xs sm:text-sm cursor-pointer hover:text-primary transition-colors p-2 sm:p-3"
                  onClick={() => handleSort("emoji_count")}
                >
                  Total
                </TableHead>
                {variant === "expanded" && (
                  <TableHead className="w-[70px] sm:w-[100px] text-center text-xs sm:text-sm p-2 sm:p-3">
                    <TooltipProvider>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger className="cursor-help border-b border-dotted border-muted-foreground">
                          Rank
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Percentile ranking</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeaderboard.map((user) => {
                
                const ts = user.most_recent_emoji_timestamp
                // Use client-calculated now/oneYearAgo for hydration safety
                const lastDate = ts ? new Date(ts > 1e12 ? ts : ts * 1000) : null
                const isInactive = now && oneYearAgo && lastDate !== null && lastDate < oneYearAgo
                let displayName = "Unknown"
                if (user.user_display_name && typeof user.user_display_name === "string") {
                  const nameParts = user.user_display_name.split(" ")
                  displayName =
                    nameParts.length === 1
                      ? nameParts[0]
                      : `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
                }
                
                // Calculate position based on the appropriate leaderboard
                // When showing inactive users, use the original sorted leaderboard
                // When hiding inactive users, use the filtered leaderboard for ranking
                const rankingList = showInactiveUsers ? sortedLeaderboard : filteredByActivityLeaderboard
                const userIndex = rankingList.findIndex(u => u.user_id === user.user_id)
                return (
                  <TableRow
                    key={user.user_id}
                    className={`transition-colors hover:bg-muted cursor-pointer border-b border-border last:border-0 active:bg-muted/80 ${
                      variant === "compact" ? "h-14 sm:h-auto" : ""
                    }`}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    onClick={() => {
                      if (onViewUser) {
                        onViewUser(user)
                      }
                    }}
                  >
                    <TableCell className={`text-center font-medium ${
                      variant === "compact"
                        ? "w-[50px] sm:w-[80px] p-3 sm:p-4"
                        : "w-[40px] sm:w-[80px] p-2 sm:p-4"
                    }`}>
                      {userIndex === 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <Trophy className={`${
                            variant === "compact" ? "h-5 w-5" : "h-4 w-4 sm:h-5 sm:w-5"
                          } text-yellow-400 drop-shadow-md`} />
                          <div
                            className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 text-white font-bold shadow-lg ${
                              variant === "compact"
                                ? "h-8 w-8 sm:h-9 sm:w-9 text-sm"
                                : "h-7 w-7 sm:h-9 sm:w-9 text-xs sm:text-sm"
                            }`}
                            title="1st Place"
                          >
                            1
                          </div>
                        </div>
                      ) : userIndex === 1 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <Trophy className={`${
                            variant === "compact" ? "h-4 w-4" : "h-3 w-3 sm:h-4 sm:w-4"
                          } text-gray-400 drop-shadow-md`} />
                          <div
                            className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-400 text-white font-bold shadow-lg ${
                              variant === "compact"
                                ? "h-7 w-7 sm:h-8 sm:w-8 text-sm"
                                : "h-6 w-6 sm:h-8 sm:w-8 text-xs sm:text-sm"
                            }`}
                            title="2nd Place"
                          >
                            2
                          </div>
                        </div>
                      ) : userIndex === 2 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <Trophy className={`${
                            variant === "compact" ? "h-3 w-3" : "h-2 w-2 sm:h-3 sm:w-3"
                          } text-amber-700 drop-shadow-md`} />
                          <div
                            className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-white font-bold shadow-lg ${
                              variant === "compact"
                                ? "h-7 w-7 sm:h-8 sm:w-8 text-sm"
                                : "h-6 w-6 sm:h-8 sm:w-8 text-xs sm:text-sm"
                            }`}
                            title="3rd Place"
                          >
                            3
                          </div>
                        </div>
                      ) : (
                        <span className={`text-muted-foreground ${
                          variant === "compact" ? "text-sm" : "text-xs sm:text-sm"
                        }`}>{userIndex + 1}</span>
                      )}
                    </TableCell>
                    <TableCell className={`font-medium text-left ${
                      variant === "compact"
                        ? "p-3 sm:p-4"
                        : "p-2 sm:p-4"
                    }`}>
                      <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <span
                        className={`truncate text-left ${
                          variant === "compact"
                            ? "text-sm sm:text-sm max-w-[100px] sm:max-w-[140px]"
                            : "text-xs sm:text-sm max-w-[120px] sm:max-w-none"
                        }`}
                      >
                        {displayName}
                      </span>
                        {/* Show emoji samples inline for compact variant */}
                        {variant === "compact" && user.recent_emojis && user.recent_emojis.length > 0 && (
                          <div className="flex items-center gap-0.5 sm:gap-1 ml-auto">
                            {user.recent_emojis.slice(0, 10).map((sampleEmoji) => (
                              <TooltipProvider key={sampleEmoji.name + sampleEmoji.created}>
                                <Tooltip delayDuration={100}>
                                  <TooltipTrigger asChild>
                                    <img
                                      src={sampleEmoji.url}
                                      alt={sampleEmoji.name}
                                      className="h-6 w-6 sm:h-7 sm:w-7 rounded cursor-pointer hover:opacity-80 transition-opacity hover:scale-110"
                                      loading="lazy"
                                      onClick={(e) => { 
                                        e.stopPropagation();
                                        setSelectedEmoji(sampleEmoji); 
                                      }}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>:{sampleEmoji.name}:</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        )}
                        {/* Show emoji count inline on mobile when samples are hidden */}
                        {variant === "expanded" && user.recent_emojis && user.recent_emojis.length > 0 && (
                          <div className="flex md:hidden items-center -space-x-2">
                            {user.recent_emojis.slice(0, 2).map((sampleEmoji) => (
                              <img
                                key={sampleEmoji.name + sampleEmoji.created}
                                src={sampleEmoji.url}
                                alt={sampleEmoji.name}
                                className="h-5 w-5 rounded-full border border-background"
                                loading="lazy"
                                onClick={(e) => { 
                                  e.stopPropagation();
                                  setSelectedEmoji(sampleEmoji); 
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {variant === "expanded" && (
                      <TableCell className="hidden md:table-cell text-left p-4"> 
                        {user.recent_emojis && user.recent_emojis.length > 0 ? (
                          <div className="flex items-center space-x-1">
                            {user.recent_emojis.slice(0, 5).map((sampleEmoji) => (
                              <TooltipProvider key={sampleEmoji.name + sampleEmoji.created}>
                                <Tooltip delayDuration={100}>
                                  <TooltipTrigger asChild>
                                    <img
                                      src={sampleEmoji.url}
                                      alt={sampleEmoji.name}
                                      className="h-6 w-6 rounded cursor-pointer hover:opacity-80 transition-opacity"
                                      loading="lazy"
                                      onClick={(e) => { 
                                        e.stopPropagation();
                                        setSelectedEmoji(sampleEmoji); 
                                      }}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>:{sampleEmoji.name}:</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No recent emojis</span>
                        )}
                      </TableCell>
                    )}
                    {dateRange === "all" && (
                      <>
                        <TableCell className="text-right p-2 sm:p-4 text-xs sm:text-sm">
                          {typeof user.l4wepw === "number" ? user.l4wepw.toFixed(1) : "-"}
                        </TableCell>
                        <TableCell className="text-center p-2 sm:p-4">
                          {typeof user.l4wepwChange === "number" ? (
                            <TooltipProvider>
                              <Tooltip delayDuration={100}>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center justify-center gap-1">
                                    {(() => {
                                      const trend = getTrendIndicator(user.l4wepwChange);
                                      const TrendIcon = trend.icon;
                                      return (
                                        <>
                                          <TrendIcon className={cn("h-3 w-3 sm:h-4 sm:w-4", trend.color)} />
                                          <span className={cn("text-xs font-medium", trend.color)}>
                                            {user.l4wepwChange > 0 ? "+" : ""}{user.l4wepwChange.toFixed(0)}%
                                          </span>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{getTrendIndicator(user.l4wepwChange).label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {user.l4wepwChange > 0 ? "+" : ""}{user.l4wepwChange.toFixed(1)}% vs previous 4 weeks
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </>
                    )}
                    <TableCell
                      className={`text-right cursor-pointer hover:text-primary transition-colors font-semibold ${
                        variant === "compact"
                          ? "p-3 sm:p-4 text-sm sm:text-sm"
                          : "p-2 sm:p-4 text-xs sm:text-sm"
                      }`}
                      onClick={() => handleSort("emoji_count")}
                    >
                      {user.emoji_count}
                    </TableCell>
                    {variant === "expanded" && (
                      <TableCell className="text-center p-2 sm:p-4">
                        <TooltipProvider>
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                Top {calculatePercentile(userIndex, rankingList.length)}%
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ranked #{userIndex + 1} out of {rankingList.length} creators</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
              {/* Render empty placeholder rows when needed */}
              {emptyRowsCount > 0 && (
                Array.from({ length: emptyRowsCount }).map((_, index) => (
                  <TableRow key={`empty-${index}`} className="h-[53px]">
                    <TableCell colSpan={
                      // Base columns: Rank, User, Total = 3
                      // Add 1 for Emoji Samples if variant is expanded
                      // Add 2 for EPW + Trend if dateRange is all
                      // Add 1 for Percentile Rank if variant is expanded
                      3 +
                      (variant === "expanded" ? 1 : 0) +
                      (dateRange === "all" ? 2 : 0) +
                      (variant === "expanded" ? 1 : 0)
                    } />
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
      {/* Pagination for expanded view */}
      {variant === "expanded" && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <Button
            asChild
            variant="default"
            size="default"
            className="min-w-[140px]"
          >
            <a href="/leaderboard">See More</a>
          </Button>
          <div className="text-sm text-muted-foreground">
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, sortedLeaderboard.length)} to{" "}
            {Math.min(currentPage * itemsPerPage, sortedLeaderboard.length)} of {sortedLeaderboard.length} users
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`p-1 rounded-md ${
                currentPage === 1 ? "text-slate-600 cursor-not-allowed" : "text-slate-300 hover:bg-slate-700"
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 rounded-md text-sm ${
                    currentPage === pageNum ? "bg-slack-purple text-white" : "text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="px-1 text-slate-400">...</span>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  className="w-8 h-8 rounded-md text-sm text-slate-300 hover:bg-slate-700"
                >
                  {totalPages}
                </button>
              </>
            )}
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`p-1 rounded-md ${
                currentPage === totalPages
                  ? "text-slate-600 cursor-not-allowed"
                  : "text-slate-300 hover:bg-slate-700"
              }`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      {/* See More CTA for compact mode */}
      {variant === "compact" && (
        <div className="w-full flex justify-center mt-4 mb-2">
          <Button asChild variant="default" size="default" className="min-w-[140px]">
            <a href="/leaderboard">See More</a>
          </Button>
        </div>
      )}
      {/* Empty State */}
      {!isLoading && !error && sortedLeaderboard.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <p>No emoji creators found for the selected date range</p>
          <button
            className="mt-4 px-4 py-2 bg-slack-purple text-white rounded-lg hover:bg-purple-700 transition"
            onClick={() => setDateRange("all")}
          >
            Show All Time
          </button>
        </div>
      )}
      {/* Selected Emoji Overlay */}
      {selectedEmoji && (
        <EmojiOverlay
          emoji={selectedEmoji}
          onClose={() => setSelectedEmoji(null)}
        />
      )}
    </div> /* End of Main component wrapper */
  );
};

export default Leaderboard;
