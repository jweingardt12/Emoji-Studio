"use client"

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { getUserLeaderboard, type Emoji } from "@/lib/services/emoji-service"
import type { UserWithEmojiCount } from "@/components/user-overlay"
import type { DateRange } from "@/components/leaderboard"

interface DashboardContextType {
  // Data
  emojiData: Emoji[]
  filteredLeaderboard: UserWithEmojiCount[]
  loading: boolean
  hasRealData: boolean
  useDemoData: boolean

  // Filters
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  showInactiveUsers: boolean
  setShowInactiveUsers: (show: boolean) => void

  // Selection state
  selectedUser: UserWithEmojiCount | null
  setSelectedUser: (user: UserWithEmojiCount | null) => void
  selectedEmojiForOverlay: Emoji | null
  setSelectedEmojiForOverlay: (emoji: Emoji | null) => void

  // Actions
  onViewUser: (user: UserWithEmojiCount) => void
  handleEmojiClickFromUserOverlay: (emoji: Emoji) => void

  // Computed
  showDemoData: boolean
}

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

  const value = useMemo<DashboardContextType>(() => ({
    // Data
    emojiData,
    filteredLeaderboard,
    loading,
    hasRealData,
    useDemoData,

    // Filters
    dateRange,
    setDateRange,
    searchQuery,
    setSearchQuery,
    showInactiveUsers,
    setShowInactiveUsers,

    // Selection state
    selectedUser,
    setSelectedUser,
    selectedEmojiForOverlay,
    setSelectedEmojiForOverlay,

    // Actions
    onViewUser,
    handleEmojiClickFromUserOverlay,

    // Computed
    showDemoData,
  }), [
    emojiData,
    filteredLeaderboard,
    loading,
    hasRealData,
    useDemoData,
    dateRange,
    searchQuery,
    showInactiveUsers,
    selectedUser,
    selectedEmojiForOverlay,
    onViewUser,
    handleEmojiClickFromUserOverlay,
    showDemoData,
  ])

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboardContext() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error("useDashboardContext must be used within a DashboardProvider")
  }
  return context
}
