"use client"

import type React from "react"
import { createContext, useContext, useMemo, useCallback } from "react"
import type { Emoji, UserWithEmojiCount } from "@/lib/services/emoji-service"
import { getUserLeaderboard, calculateEmojiStats } from "@/lib/services/emoji-service"
import { useEmojiData } from "./use-emoji-data"

// Split contexts for better performance - components only subscribe to what they need

// Core emoji data context (most components need this)
interface EmojiCoreContextType {
  emojiData: Emoji[]
  loading: boolean
  error: string | null
  workspace: string
  workspaceDisplayName: string
  hasRealData: boolean
  useDemoData: boolean
}

const EmojiCoreContext = createContext<EmojiCoreContextType | undefined>(undefined)

// Statistics context (only dashboard/analytics need this)
interface EmojiStatsContextType {
  stats: ReturnType<typeof calculateEmojiStats> | null
  userLeaderboard: ReturnType<typeof getUserLeaderboard>
  demoChartData: any
  filterByDateRange: (start: Date, end: Date) => Emoji[]
}

const EmojiStatsContext = createContext<EmojiStatsContextType | undefined>(undefined)

// Actions context (only components that modify data need this)
interface EmojiActionsContextType {
  setEmojiData: React.Dispatch<React.SetStateAction<Emoji[]>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setUseDemoData: React.Dispatch<React.SetStateAction<boolean>>
  setDemoTimeRange: React.Dispatch<React.SetStateAction<string>>
  setHasRealData: React.Dispatch<React.SetStateAction<boolean>>
  setWorkspace: React.Dispatch<React.SetStateAction<string>>
  setWorkspaceDisplayName: React.Dispatch<React.SetStateAction<string>>
}

const EmojiActionsContext = createContext<EmojiActionsContextType | undefined>(undefined)

// Provider that wraps the original context and provides split contexts
export const OptimizedEmojiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const originalContext = useEmojiData()

  // Memoize core context to prevent unnecessary re-renders
  const coreContextValue = useMemo<EmojiCoreContextType>(() => ({
    emojiData: originalContext.emojiData,
    loading: originalContext.loading,
    error: originalContext.error,
    workspace: originalContext.workspace,
    workspaceDisplayName: originalContext.workspaceDisplayName,
    hasRealData: originalContext.hasRealData,
    useDemoData: originalContext.useDemoData,
  }), [
    originalContext.emojiData,
    originalContext.loading,
    originalContext.error,
    originalContext.workspace,
    originalContext.workspaceDisplayName,
    originalContext.hasRealData,
    originalContext.useDemoData,
  ])

  // Memoize stats context - recalculate only when core data changes
  const statsContextValue = useMemo<EmojiStatsContextType>(() => ({
    stats: originalContext.stats,
    userLeaderboard: originalContext.userLeaderboard,
    demoChartData: originalContext.demoChartData,
    filterByDateRange: originalContext.filterByDateRange,
  }), [
    originalContext.stats,
    originalContext.userLeaderboard,
    originalContext.demoChartData,
    originalContext.filterByDateRange,
  ])

  // Memoize actions context - these rarely change
  const actionsContextValue = useMemo<EmojiActionsContextType>(() => ({
    setEmojiData: originalContext.setEmojiData,
    setLoading: originalContext.setLoading,
    setUseDemoData: originalContext.setUseDemoData,
    setDemoTimeRange: originalContext.setDemoTimeRange,
    setHasRealData: originalContext.setHasRealData,
    setWorkspace: originalContext.setWorkspace,
    setWorkspaceDisplayName: originalContext.setWorkspaceDisplayName,
  }), [
    originalContext.setEmojiData,
    originalContext.setLoading,
    originalContext.setUseDemoData,
    originalContext.setDemoTimeRange,
    originalContext.setHasRealData,
    originalContext.setWorkspace,
    originalContext.setWorkspaceDisplayName,
  ])

  return (
    <EmojiCoreContext.Provider value={coreContextValue}>
      <EmojiStatsContext.Provider value={statsContextValue}>
        <EmojiActionsContext.Provider value={actionsContextValue}>
          {children}
        </EmojiActionsContext.Provider>
      </EmojiStatsContext.Provider>
    </EmojiCoreContext.Provider>
  )
}

// Optimized hooks that only subscribe to what they need
export const useEmojiCore = () => {
  const context = useContext(EmojiCoreContext)
  if (context === undefined) {
    throw new Error("useEmojiCore must be used within an OptimizedEmojiProvider")
  }
  return context
}

export const useEmojiStats = () => {
  const context = useContext(EmojiStatsContext)
  if (context === undefined) {
    throw new Error("useEmojiStats must be used within an OptimizedEmojiProvider")
  }
  return context
}

export const useEmojiActions = () => {
  const context = useContext(EmojiActionsContext)
  if (context === undefined) {
    throw new Error("useEmojiActions must be used within an OptimizedEmojiProvider")
  }
  return context
}

// Enhanced hooks for common combinations
export const useEmojiCoreAndActions = () => {
  const core = useEmojiCore()
  const actions = useEmojiActions()
  return { ...core, ...actions }
}

export const useEmojiStatsAndCore = () => {
  const core = useEmojiCore()
  const stats = useEmojiStats()
  return { ...core, ...stats }
}

// Memoized selectors for common data transformations
export const useFilteredEmojis = (filterFn?: (emoji: Emoji) => boolean) => {
  const { emojiData } = useEmojiCore()

  return useMemo(() => {
    if (!filterFn) return emojiData
    return emojiData.filter(filterFn)
  }, [emojiData, filterFn])
}

export const useSortedEmojis = (sortFn?: (a: Emoji, b: Emoji) => number) => {
  const { emojiData } = useEmojiCore()

  return useMemo(() => {
    if (!sortFn) return [...emojiData].sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
    return [...emojiData].sort(sortFn)
  }, [emojiData, sortFn])
}

export const useUserEmojis = (userId: string) => {
  const { emojiData } = useEmojiCore()

  return useMemo(() => {
    return emojiData.filter(emoji => emoji.user_id === userId)
  }, [emojiData, userId])
}