"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react"
import type React from "react"
import { type Emoji, getUserLeaderboard, calculateEmojiStats } from "@/lib/services/emoji-service"
import { DataCache, SWRCache, RequestDebouncer } from "@/lib/utils/data-cache"
import { 
  generateDemoData,
  generateDemoStats,
  generateDemoLeaderboard,
  generateDemoChartData
} from "@/lib/demo-data"

// Cache instances
const emojiCache = new SWRCache<Emoji[]>(60 * 1000, 5 * 60 * 1000) // 1 min stale, 5 min max
const statsCache = new DataCache<ReturnType<typeof calculateEmojiStats>>(2 * 60 * 1000) // 2 min TTL
const leaderboardCache = new DataCache<ReturnType<typeof getUserLeaderboard>>(2 * 60 * 1000) // 2 min TTL
const chartCache = new DataCache<any>(5 * 60 * 1000) // 5 min TTL
const searchDebouncer = new RequestDebouncer()

interface OptimizedEmojiDataContextType {
  // Core data
  emojis: Emoji[]
  stats: ReturnType<typeof calculateEmojiStats> | null
  leaderboard: ReturnType<typeof getUserLeaderboard>
  chartData: any
  
  // Loading states
  loading: boolean
  isValidating: boolean
  
  // Settings
  useDemoData: boolean
  workspace: string
  timeRange: string
  
  // Actions
  setUseDemoData: (value: boolean) => void
  setWorkspace: (value: string) => void
  setTimeRange: (value: string) => void
  refresh: () => Promise<void>
  filterByDateRange: (start: Date, end: Date) => Emoji[]
  searchEmojis: (query: string) => Promise<Emoji[]>
}

const OptimizedEmojiDataContext = createContext<OptimizedEmojiDataContextType | undefined>(undefined)

export const OptimizedEmojiDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [emojis, setEmojis] = useState<Emoji[]>([])
  const [stats, setStats] = useState<ReturnType<typeof calculateEmojiStats> | null>(null)
  const [leaderboard, setLeaderboard] = useState<ReturnType<typeof getUserLeaderboard>>([])
  const [chartData, setChartData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isValidating, setIsValidating] = useState(false)
  const [useDemoData, setUseDemoData] = useState(false)
  const [workspace, setWorkspace] = useState("")
  const [timeRange, setTimeRange] = useState("90d")
  
  // Track if component is mounted
  const mountedRef = useRef(true)
  // Use ref to access emojis without triggering re-renders in callbacks
  const emojisRef = useRef<Emoji[]>([])
  emojisRef.current = emojis

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Load data with caching and deduplication
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!mountedRef.current) return

    const cacheKey = useDemoData ? `demo-${timeRange}` : `real-${workspace}-${timeRange}`
    
    try {
      setLoading(true)
      
      // Use Promise.all for parallel loading with individual error handling
      const [emojisResult, statsResult, leaderboardResult, chartResult] = await Promise.allSettled([
        // Load emojis with SWR
        emojiCache.get(
          `emojis-${cacheKey}`,
          async () => {
            if (useDemoData) {
              return await generateDemoData()
            }
            // Load from localStorage or API
            const stored = localStorage.getItem("emojiData")
            if (stored) {
              return JSON.parse(stored)
            }
            return []
          },
          (updatedEmojis) => {
            // Update UI when revalidation completes
            if (mountedRef.current) {
              setEmojis(updatedEmojis)
              setIsValidating(false)
            }
          }
        ),
        
        // Load stats
        statsCache.get(`stats-${cacheKey}`, async () => {
          if (useDemoData) {
            return generateDemoStats()
          }
          return calculateEmojiStats(emojisRef.current, Date.now())
        }),

        // Load leaderboard
        leaderboardCache.get(`leaderboard-${cacheKey}`, async () => {
          if (useDemoData) {
            return generateDemoLeaderboard()
          }
          return getUserLeaderboard(emojisRef.current, Date.now())
        }),
        
        // Load chart data
        chartCache.get(`chart-${cacheKey}`, async () => {
          return generateDemoChartData(timeRange)
        })
      ])

      if (!mountedRef.current) return

      // Update state with successful results
      if (emojisResult.status === 'fulfilled') {
        setEmojis(emojisResult.value)
      }
      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value)
      }
      if (leaderboardResult.status === 'fulfilled') {
        setLeaderboard(leaderboardResult.value)
      }
      if (chartResult.status === 'fulfilled') {
        setChartData(chartResult.value)
      }
      
    } catch (error) {
      console.error("Error loading emoji data:", error)
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [useDemoData, workspace, timeRange])

  // Initial load
  useEffect(() => {
    // Load workspace from localStorage
    const storedWorkspace = localStorage.getItem("workspace")
    if (storedWorkspace) {
      setWorkspace(storedWorkspace)
    }

    // Check if we have real data
    const hasRealData = localStorage.getItem("emojiData") !== null
    if (!hasRealData) {
      setUseDemoData(true)
    }

    loadData()
  }, [])

  // Reload when key settings change
  useEffect(() => {
    loadData()
  }, [useDemoData, workspace, timeRange])

  // Optimized search with debouncing
  const searchEmojis = useCallback(async (query: string): Promise<Emoji[]> => {
    if (!query) return emojis

    return searchDebouncer.debounce(
      'emoji-search',
      async () => {
        const lowercaseQuery = query.toLowerCase()
        return emojis.filter(emoji => 
          emoji.name.toLowerCase().includes(lowercaseQuery) ||
          emoji.user_display_name?.toLowerCase().includes(lowercaseQuery)
        )
      },
      300
    )
  }, [emojis])

  // Filter by date range
  const filterByDateRange = useCallback((start: Date, end: Date): Emoji[] => {
    const startTime = start.getTime() / 1000
    const endTime = end.getTime() / 1000
    
    return emojis.filter(emoji => {
      if (!emoji.created) return false
      return emoji.created >= startTime && emoji.created <= endTime
    })
  }, [emojis])

  // Manual refresh
  const refresh = useCallback(async () => {
    // Clear all caches
    emojiCache.clear()
    statsCache.clear()
    leaderboardCache.clear()
    chartCache.clear()
    
    // Reload data
    await loadData(true)
  }, [loadData])

  // Memoized context value
  const contextValue = useMemo(() => ({
    emojis,
    stats,
    leaderboard,
    chartData,
    loading,
    isValidating,
    useDemoData,
    workspace,
    timeRange,
    setUseDemoData: (value: boolean) => {
      setUseDemoData(value)
      // Save preference
      localStorage.setItem("useDemoData", value.toString())
    },
    setWorkspace: (value: string) => {
      setWorkspace(value)
      localStorage.setItem("workspace", value)
    },
    setTimeRange,
    refresh,
    filterByDateRange,
    searchEmojis
  }), [
    emojis,
    stats,
    leaderboard,
    chartData,
    loading,
    isValidating,
    useDemoData,
    workspace,
    timeRange,
    refresh,
    filterByDateRange,
    searchEmojis
  ])

  return (
    <OptimizedEmojiDataContext.Provider value={contextValue}>
      {children}
    </OptimizedEmojiDataContext.Provider>
  )
}

// Hook to use the optimized emoji data
export function useOptimizedEmojiData() {
  const context = useContext(OptimizedEmojiDataContext)
  if (!context) {
    throw new Error("useOptimizedEmojiData must be used within OptimizedEmojiDataProvider")
  }
  return context
}

// Export original hook name for backward compatibility
export const useEmojiData = useOptimizedEmojiData