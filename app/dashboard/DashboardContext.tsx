"use client"

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { getUserLeaderboard, type Emoji } from "@/lib/services/emoji-service"
import type { UserWithEmojiCount } from "@/components/user-overlay"
import type { DateRange } from "@/components/leaderboard"

// ============================================================================
// Data Context - emoji data, loading states, leaderboard
// ============================================================================

interface DashboardDataContextType {
  emojiData: Emoji[]
  filteredLeaderboard: UserWithEmojiCount[]
  loading: boolean
  hasRealData: boolean
  useDemoData: boolean
  showDemoData: boolean
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined)

export function useDashboardData() {
  const context = useContext(DashboardDataContext)
  if (context === undefined) {
    throw new Error("useDashboardData must be used within a DashboardProvider")
  }
  return context
}

// ============================================================================
// Filters Context - date range, search query, user filter toggles
// ============================================================================

interface DashboardFiltersContextType {
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  showInactiveUsers: boolean
  setShowInactiveUsers: (show: boolean) => void
}

const DashboardFiltersContext = createContext<DashboardFiltersContextType | undefined>(undefined)

export function useDashboardFilters() {
  const context = useContext(DashboardFiltersContext)
  if (context === undefined) {
    throw new Error("useDashboardFilters must be used within a DashboardProvider")
  }
  return context
}

// ============================================================================
// Selection Context - selected user, selected emoji, overlay state
// ============================================================================

interface DashboardSelectionContextType {
  selectedUser: UserWithEmojiCount | null
  setSelectedUser: (user: UserWithEmojiCount | null) => void
  selectedEmojiForOverlay: Emoji | null
  setSelectedEmojiForOverlay: (emoji: Emoji | null) => void
  onViewUser: (user: UserWithEmojiCount) => void
  handleEmojiClickFromUserOverlay: (emoji: Emoji) => void
}

const DashboardSelectionContext = createContext<DashboardSelectionContextType | undefined>(undefined)

export function useDashboardSelection() {
  const context = useContext(DashboardSelectionContext)
  if (context === undefined) {
    throw new Error("useDashboardSelection must be used within a DashboardProvider")
  }
  return context
}

// ============================================================================
// Combined Context (for backwards compatibility)
// ============================================================================

interface DashboardContextType extends
  DashboardDataContextType,
  DashboardFiltersContextType,
  DashboardSelectionContextType {}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

interface DashboardProviderProps {
  children: ReactNode
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const {
    emojiData,
    filterByDateRange,
    loading,
    hasRealData,
    userLeaderboard,
    useDemoData
  } = useEmojiData()

  // Filter state
  const [dateRange, setDateRange] = useState<DateRange>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showInactiveUsers, setShowInactiveUsers] = useState(true)

  // Selection state
  const [selectedUser, setSelectedUser] = useState<UserWithEmojiCount | null>(null)
  const [selectedEmojiForOverlay, setSelectedEmojiForOverlay] = useState<Emoji | null>(null)

  // Determine if we should show demo data
  const showDemoData = useMemo(() => {
    return !hasRealData || emojiData.length === 0
  }, [emojiData.length, hasRealData])

  // Compute filtered leaderboard based on dateRange
  const filteredLeaderboard = useMemo(() => {
    // If showing demo data, use the userLeaderboard from the hook
    if (showDemoData) {
      return userLeaderboard || []
    }

    let filteredEmojis = emojiData
    const now = new Date()
    if (dateRange === "7days") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      filteredEmojis = filterByDateRange(start, now)
    } else if (dateRange === "30days") {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      filteredEmojis = filterByDateRange(start, now)
    } else if (dateRange === "quarter") {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      filteredEmojis = filterByDateRange(start, now)
    }
    // Aggregate leaderboard from filtered emojis
    return getUserLeaderboard(filteredEmojis, Math.floor(Date.now() / 1000))
  }, [emojiData, dateRange, filterByDateRange, showDemoData, userLeaderboard])

  // View user action - adds rank to user object
  const onViewUser = useCallback((user: UserWithEmojiCount) => {
    const userRank = filteredLeaderboard.findIndex((u: UserWithEmojiCount) => u.user_id === user.user_id) + 1
    const userWithRank = {
      ...user,
      rank: userRank > 0 ? userRank : undefined
    }
    setSelectedUser(userWithRank)
  }, [filteredLeaderboard])

  // Handler for clicking an emoji within UserOverlay
  const handleEmojiClickFromUserOverlay = useCallback((emoji: Emoji) => {
    setSelectedUser(null)
    setSelectedEmojiForOverlay(emoji)
  }, [])

  // Separate memoized values for each context
  const dataValue = useMemo<DashboardDataContextType>(() => ({
    emojiData,
    filteredLeaderboard,
    loading,
    hasRealData,
    useDemoData,
    showDemoData,
  }), [emojiData, filteredLeaderboard, loading, hasRealData, useDemoData, showDemoData])

  const filtersValue = useMemo<DashboardFiltersContextType>(() => ({
    dateRange,
    setDateRange,
    searchQuery,
    setSearchQuery,
    showInactiveUsers,
    setShowInactiveUsers,
  }), [dateRange, searchQuery, showInactiveUsers])

  const selectionValue = useMemo<DashboardSelectionContextType>(() => ({
    selectedUser,
    setSelectedUser,
    selectedEmojiForOverlay,
    setSelectedEmojiForOverlay,
    onViewUser,
    handleEmojiClickFromUserOverlay,
  }), [selectedUser, selectedEmojiForOverlay, onViewUser, handleEmojiClickFromUserOverlay])

  // Combined value for backwards compatibility
  const combinedValue = useMemo<DashboardContextType>(() => ({
    ...dataValue,
    ...filtersValue,
    ...selectionValue,
  }), [dataValue, filtersValue, selectionValue])

  return (
    <DashboardContext.Provider value={combinedValue}>
      <DashboardDataContext.Provider value={dataValue}>
        <DashboardFiltersContext.Provider value={filtersValue}>
          <DashboardSelectionContext.Provider value={selectionValue}>
            {children}
          </DashboardSelectionContext.Provider>
        </DashboardFiltersContext.Provider>
      </DashboardDataContext.Provider>
    </DashboardContext.Provider>
  )
}

// Backwards compatible hook - use the specific hooks for better performance
export function useDashboardContext() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error("useDashboardContext must be used within a DashboardProvider")
  }
  return context
}
