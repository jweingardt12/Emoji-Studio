"use client"

import { ChevronLeft, ChevronRight, Calendar, Info, Search, Trophy } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import React, { useState, useMemo, useEffect, useCallback } from "react"
import { format, subYears } from "date-fns"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

// Remove this import and define a fallback type below if @shared/schema.js is missing
// import { UserWithEmojiCount } from "@shared/schema.js";
// (Removed: @shared/schema.js is not present. Using fallback type below.)

type UserWithEmojiCount = {
  user_id: string
  user_display_name: string
  emoji_count: number
  l4wepw?: number
  most_recent_emoji_timestamp?: number
}

// Define date range options
export type DateRange = "all" | "7days" | "30days" | "quarter"

export type LeaderboardVariant = "compact" | "expanded"

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
}

const Leaderboard = ({
  leaderboard,
  isLoading,
  error,
  onViewUser,
  dateRange,
  setDateRange,

  variant = "expanded", // default to expanded
  showDemoData = false,
  showInactiveUsers = false,
  setShowInactiveUsers,
}: LeaderboardProps) => {
  // Hydration-safe now/oneYearAgo for client-only date logic
  const [now, setNow] = useState<Date | null>(null)
  const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null)

  // Hydration-safe: only set dates on client
  useEffect(() => {
    const n = new Date()
    setNow(n)
    setOneYearAgo(subYears(n, 1))
  }, [])

  const [sortBy, setSortBy] = useState<"emoji_count" | "l4wepw" | "epw">("emoji_count")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
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



  const todayStr = format(new Date(), "yyyy-MM-dd")

  return (
    <div className="flex flex-col flex-1 w-full">
      <div className="bg-background rounded-xl shadow h-full flex flex-col w-full overflow-hidden">
        {/* Leaderboard List, Pagination, and Empty State all in one parent */}
        <div className="flex flex-col flex-1 w-full p-0 m-0">
          <div className="pt-6 pb-4 px-0 w-full">
            <div className="flex flex-col">
              <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    <Link href="/leaderboard" className="focus:outline-none cursor-pointer hover:opacity-80">
                      <span className="border-b border-dotted border-muted-foreground">Leaderboard</span>
                    </Link>
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 pb-1">
                    {/* Dropdown for all screen sizes */}
                    <div className="flex-shrink-0">
                      <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
                        <SelectTrigger className="w-32 sm:w-40 h-9 text-xs" aria-label="Select time range">
                          <SelectValue placeholder="All Time" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all" className="rounded-lg text-xs">
                            All Time
                          </SelectItem>
                          <SelectItem value="7days" className="rounded-lg text-xs">
                            Last 7 days
                          </SelectItem>
                          <SelectItem value="30days" className="rounded-lg text-xs">
                            Last 30 days
                          </SelectItem>
                          <SelectItem value="quarter" className="rounded-lg text-xs">
                            Quarter
                          </SelectItem>

                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Switch for showing inactive users - only show in expanded mode */}
                    {variant !== 'compact' && setShowInactiveUsers && (
                      <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
                        <Switch
                          id="show-inactive"
                          checked={showInactiveUsers}
                          onCheckedChange={(checked) => setShowInactiveUsers(checked)}
                          className="scale-90 sm:scale-100 flex-shrink-0"
                        />
                        <Label htmlFor="show-inactive" className="text-xs cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis">
                          Show Inactive
                        </Label>
                      </div>
                    )}
                  </div>
                  

                </div>
                
                {/* Search box */}
                <div className="relative w-full mt-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 text-sm w-full rounded-md"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 flex items-center justify-center"
                      onClick={() => setSearchQuery("")}
                    >
                      <span className="sr-only">Clear</span>
                      <span className="text-lg">×</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Loading State */}
          {isLoading && (
            <div className="py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slack-purple mb-4"></div>
              <p className="text-gray-500">Loading leaderboard data...</p>
            </div>
          )}
          {/* Error State */}
          {error !== null && error !== undefined && (
            <div className="py-16 text-center">
              <div className="text-red-500 text-5xl mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <p className="text-red-500 font-medium">Failed to load leaderboard data</p>
              {error instanceof Error ? <p className="text-red-400 text-sm mt-2">{error.message}</p> : null}
            </div>
          )}
          {/* Leaderboard List */}
          {!isLoading && !error && paginatedLeaderboard.length > 0 && (
            <div className="w-full overflow-x-auto p-0 m-0">
              
                <Table className="w-full text-xs border-collapse p-0 m-0">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[60px] text-center font-semibold px-0">Rank</TableHead>
                      <TableHead className="font-semibold px-2">Creator</TableHead>
                      {dateRange === "all" && (
                        <TableHead className="text-center font-semibold hidden sm:table-cell px-2">
                          <div className="flex flex-col items-center justify-center">
                            <span>EPW</span>
                            <span className="text-[10px] text-muted-foreground font-normal">Emojis Per Week</span>
                          </div>
                        </TableHead>
                      )}
                      <TableHead className="text-center font-semibold px-2">
                        <div className="flex items-center justify-center">
                          <span>Total</span>
                        </div>
                      </TableHead>
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
                          className="transition-colors hover:bg-muted cursor-pointer border-b border-border last:border-0"
                          onClick={() => onViewUser && onViewUser(user)}
                        >
                          <TableCell className="text-center w-[80px] font-medium">
                            {userIndex === 0 ? (
                              <div
                                className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-yellow-400 text-white font-bold"
                                title="1st Place"
                              >
                                1
                              </div>
                            ) : userIndex === 1 ? (
                              <div
                                className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-300 text-white font-bold"
                                title="2nd Place"
                              >
                                2
                              </div>
                            ) : userIndex === 2 ? (
                              <div
                                className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-amber-700 text-white font-bold"
                                title="3rd Place"
                              >
                                3
                              </div>
                            ) : (
                              <span className="text-muted-foreground">{userIndex + 1}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {displayName}
                            {isInactive && (
                              <span className="ml-2 px-2 py-0.5 rounded-full bg-muted text-xs font-normal">
                                Inactive
                              </span>
                            )}
                          </TableCell>
                          {dateRange === "all" && (
                            <TableCell className="text-center hidden sm:table-cell">
                              {typeof user.l4wepw === "number" ? user.l4wepw.toFixed(2) : "-"}
                            </TableCell>
                          )}
                          <TableCell className="text-center font-medium">{user.emoji_count}</TableCell>
                        </TableRow>
                      )
                    })}
                    {/* Render empty placeholder rows when needed */}
                    {Array.from({ length: emptyRowsCount }).map((_, index) => (
                      <TableRow
                        key={`empty-${index}`}
                        className="border-b border-border last:border-0"
                      >
                        <TableCell className="text-center w-[80px]"></TableCell>
                        <TableCell></TableCell>
                        {dateRange === "all" && (
                          <TableCell className="text-center hidden sm:table-cell"></TableCell>
                        )}
                        <TableCell className="text-center"></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              
            </div>
          )}
          {/* Pagination (hide in compact mode) */}
          {variant !== "compact" && totalPages > 1 && (
            <div className="px-6 py-3 flex items-center justify-between">
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
              <Button asChild variant="default" size="default">
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
        </div>
      </div>
    </div>
  )
}

export default Leaderboard
