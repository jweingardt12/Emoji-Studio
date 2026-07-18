"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react"
import { toast } from "sonner"
import { StorageWarningDetail } from "@/lib/storage/safe-emoji-local-storage"
import { type Emoji, getUserLeaderboard, calculateEmojiStats } from "@/lib/services/emoji-service"
import { 
  generateDemoChartData, 
  generateDemoLeaderboard, 
  generateDemoStats,
  loadDemoChartData,
  loadDemoLeaderboard,
  loadDemoStats,
  generateDemoData
} from "@/lib/demo-data"
import { emojiStorage, settingsStorage } from "@/lib/storage/indexed-db"
import { maybeCelebrateFirstSync } from "@/lib/utils/celebrate"

// Define the context type
interface EmojiDataContextType {
  emojiData: Emoji[]
  setEmojiData: React.Dispatch<React.SetStateAction<Emoji[]>>
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  error: string | null
  filterByDateRange: (start: Date, end: Date) => Emoji[]
  stats: ReturnType<typeof calculateEmojiStats> | null
  userLeaderboard: ReturnType<typeof getUserLeaderboard>
  useDemoData: boolean
  setUseDemoData: React.Dispatch<React.SetStateAction<boolean>>
  demoChartData: any
  setDemoTimeRange: React.Dispatch<React.SetStateAction<string>>
  hasRealData: boolean
  setHasRealData: React.Dispatch<React.SetStateAction<boolean>>
  workspace: string
  setWorkspace: React.Dispatch<React.SetStateAction<string>>
  workspaceDisplayName: string
  setWorkspaceDisplayName: React.Dispatch<React.SetStateAction<string>>
}

// Create the context with a default value
const EmojiDataContext = createContext<EmojiDataContextType | undefined>(undefined)

// Provider component
export const EmojiDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [emojiData, setEmojiDataInternal] = useState<Emoji[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useDemoData, setUseDemoData] = useState(false)
  const [demoTimeRange, setDemoTimeRange] = useState("90d")
  const [hasRealData, setHasRealData] = useState(false)
  const [workspaceInternal, setWorkspaceInternal] = useState<string>("")
  const [workspaceDisplayNameInternal, setWorkspaceDisplayNameInternal] = useState<string>("")
  const previousWorkspaceRef = useRef<string>("")
  const hasShownStorageWarningRef = useRef(false)
  // Tracks the current emoji count for the emojiDataUpdated handler (whose
  // closure would otherwise see stale state) so a no-data → data transition
  // can be detected for the one-time first-sync celebration.
  const emojiCountRef = useRef(0)
  useEffect(() => {
    emojiCountRef.current = emojiData.length
  }, [emojiData])

  // Wrapper for setWorkspace that clears display name when workspace changes
  const setWorkspace = useCallback((value: React.SetStateAction<string>) => {
    setWorkspaceInternal(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value
      // If workspace actually changed, clear the custom display name
      if (previousWorkspaceRef.current && previousWorkspaceRef.current !== newValue) {
        setWorkspaceDisplayNameInternal("")
        localStorage.removeItem("workspaceDisplayName")
      }
      previousWorkspaceRef.current = newValue
      return newValue
    })
  }, [])

  // Wrapper for setWorkspaceDisplayName that persists to localStorage
  const setWorkspaceDisplayName = useCallback((value: React.SetStateAction<string>) => {
    setWorkspaceDisplayNameInternal(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value
      if (newValue && newValue.trim()) {
        localStorage.setItem("workspaceDisplayName", newValue)
      } else {
        localStorage.removeItem("workspaceDisplayName")
      }
      return newValue
    })
  }, [])
  
  const setEmojiData = useCallback((data: Emoji[] | ((prev: Emoji[]) => Emoji[])) => {
    setEmojiDataInternal(data);
  }, [])

  // Demo data state
  const [demoData, setDemoData] = useState<Emoji[]>([])
  const [demoLoading, setDemoLoading] = useState(true)

  // Load demo data
  useEffect(() => {
    let isMounted = true

    const loadDemoData = async () => {
      setDemoLoading(true)
      try {
        const data = await generateDemoData()
        if (isMounted) {
          setDemoData(data)
          setDemoLoading(false)
        }
      } catch (error) {
        if (isMounted) {
          setDemoLoading(false)
        }
      }
    }

    loadDemoData()

    return () => {
      isMounted = false
    }
  }, [])

  // Initialize demo data with synchronous versions for immediate display
  const [demoStats, setDemoStats] = useState<ReturnType<typeof calculateEmojiStats> | null>(generateDemoStats())
  const [demoLeaderboard, setDemoLeaderboard] = useState<ReturnType<typeof getUserLeaderboard>>(generateDemoLeaderboard())
  const [demoChartData, setDemoChartData] = useState<any>(generateDemoChartData(demoTimeRange))
  
  // Load enhanced demo data asynchronously
  useEffect(() => {
    let isMounted = true
    
    const loadEnhancedDemoData = async () => {
      try {
        // Load enhanced stats from JSON file
        const stats = await loadDemoStats()
        if (isMounted) {
          setDemoStats(stats)
        }
        
        // Load enhanced leaderboard from JSON file
        const leaderboard = await loadDemoLeaderboard()
        if (isMounted) {
          setDemoLeaderboard(leaderboard)
        }
      } catch (error) {
        // We already have the basic demo data loaded, so this is non-critical
      }
    }
    
    loadEnhancedDemoData()
    
    return () => {
      isMounted = false
    }
  }, [])
  
  // Load demo chart data when timeRange changes
  useEffect(() => {
    let isMounted = true
    
    // Update with synchronous data immediately
    setDemoChartData(generateDemoChartData(demoTimeRange))
    
    // Then try to load enhanced data
    const loadEnhancedChartData = async () => {
      try {
        const chartData = await loadDemoChartData(demoTimeRange)
        if (isMounted) {
          setDemoChartData(chartData)
        }
      } catch (error) {
        // We already have basic chart data, so this is non-critical
      }
    }
    
    loadEnhancedChartData()
    
    return () => {
      isMounted = false
    }
  }, [demoTimeRange])

  // Function to load emoji data from storage (IndexedDB with localStorage fallback)
  const loadEmojiData = useCallback(async () => {
    try {
      // Load workspace from settings
      const storedWorkspace = await settingsStorage.loadSetting("workspace") || localStorage.getItem("workspace")

      if (storedWorkspace) {
        // Set internal state directly to avoid triggering display name clear on initial load
        setWorkspaceInternal(storedWorkspace)
        previousWorkspaceRef.current = storedWorkspace
      }

      // Load custom workspace display name
      const storedDisplayName = localStorage.getItem("workspaceDisplayName")
      if (storedDisplayName) {
        setWorkspaceDisplayNameInternal(storedDisplayName)
      }

      // Try to load emoji data from IndexedDB first, with localStorage fallback
      const emojiData = await emojiStorage.loadEmojis()
      
      if (emojiData && Array.isArray(emojiData) && emojiData.length > 0) {
        setEmojiData(emojiData)
        
        // Check if this is demo data by checking the workspace
        if (storedWorkspace === "demo-workspace") {
          setHasRealData(false)
          setUseDemoData(true)
        } else {
          setHasRealData(true)
          setUseDemoData(false)
        }
      } else {
        setHasRealData(false)
        setUseDemoData(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load emoji data")
      setHasRealData(false)
      setUseDemoData(false)
    } finally {
      setLoading(false)
    }
  }, [setEmojiData])

  // Load emoji data from localStorage on mount
  useEffect(() => {
    loadEmojiData()

    // Listen for storage cleared event
    const handleStorageCleared = () => {
      setEmojiData([])
      setHasRealData(false)
      setUseDemoData(false)
      setWorkspaceInternal("")
      setWorkspaceDisplayNameInternal("")
      previousWorkspaceRef.current = ""
      localStorage.removeItem("workspaceDisplayName")
    }

    // Listen for emoji data updated event
    const handleEmojiDataUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;

      // Events MUST contain data to prevent race conditions
      if (customEvent.detail && customEvent.detail.emojiData) {
        const { emojiData, workspace } = customEvent.detail;

        const isFirstData = emojiCountRef.current === 0 && emojiData.length > 0;
        setEmojiData(emojiData);
        if (workspace) {
          setWorkspace(workspace);
          setHasRealData(true);
          setUseDemoData(false);
          if (isFirstData) {
            // First-ever sync of a real workspace — celebrate once.
            maybeCelebrateFirstSync(emojiData.length, workspace);
          }
        }
        setLoading(false);
      } else {
        // WARNING: This should never happen - events must include data
        // Do NOT reload from storage - this was causing the race condition
      }
    }

    window.addEventListener("localStorageCleared", handleStorageCleared)
    window.addEventListener("emojiDataUpdated", handleEmojiDataUpdated)

    return () => {
      window.removeEventListener("localStorageCleared", handleStorageCleared)
      window.removeEventListener("emojiDataUpdated", handleEmojiDataUpdated)
    }
  }, [loadEmojiData])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleEmojiStorageWarning = (event: Event) => {
      const detail = (event as CustomEvent<StorageWarningDetail>).detail
      if (!detail) return

      const { reason, byteSize, limit, source } = detail
      const payloadMb = byteSize ? (byteSize / (1024 * 1024)).toFixed(1) : null
      const limitMb = limit ? (limit / (1024 * 1024)).toFixed(1) : null
      const description = payloadMb && limitMb
        ? `We fetched about ${payloadMb} MB of emoji data, but browsers typically allow roughly ${limitMb} MB per site. We'll keep your emoji list in memory for this session. Refresh to re-sync when needed.`
        : `${reason} We'll keep your emoji list in memory for this session. Refresh to re-sync when needed.`

      if (!hasShownStorageWarningRef.current) {
        toast.warning("Large emoji library detected", {
          description,
          duration: 6000,
        })
        hasShownStorageWarningRef.current = true
      } else {
      }
    }

    window.addEventListener("emojiStorageWarning", handleEmojiStorageWarning as EventListener)
    return () => window.removeEventListener("emojiStorageWarning", handleEmojiStorageWarning as EventListener)
  }, [])

  // Filter emojis by date range
  const filterByDateRange = useCallback(
    (start: Date, end: Date) => {
      const startTimestamp = Math.floor(start.getTime() / 1000)
      const endTimestamp = Math.floor(end.getTime() / 1000)
      const data = useDemoData ? demoData : emojiData
      return data.filter((emoji) => emoji.created >= startTimestamp && emoji.created <= endTimestamp)
    },
    [emojiData, useDemoData, demoData],
  )

  // Calculate stats with stable timestamp to prevent unnecessary recalculations
  const currentTimestamp = useMemo(() => Math.floor(Date.now() / 1000), [])
  const stats = useMemo(() => {
    if (useDemoData) {
      return demoStats
    }
    if (emojiData.length === 0) return null
    return calculateEmojiStats(emojiData, currentTimestamp)
  }, [emojiData, useDemoData, demoStats, currentTimestamp])

  // Calculate user leaderboard. Derived with useMemo (rather than
  // useEffect + state) so consumers don't get an extra render pass on every
  // data change.
  const userLeaderboard = useMemo<ReturnType<typeof getUserLeaderboard>>(() => {
    if (useDemoData) {
      // Use the demo leaderboard that's already loaded asynchronously
      return demoLeaderboard
    }
    if (emojiData.length > 0) {
      // Calculate leaderboard from real data using stable timestamp
      return getUserLeaderboard(emojiData, currentTimestamp)
    }
    return []
  }, [emojiData, useDemoData, demoLeaderboard, currentTimestamp])

  // Create the context value with memoization to prevent unnecessary re-renders
  const contextValue: EmojiDataContextType = useMemo(() => ({
    emojiData: useDemoData && demoData.length > 0 ? demoData : emojiData,
    setEmojiData,
    loading: loading || (useDemoData && demoLoading),
    setLoading,
    error,
    filterByDateRange,
    stats: useDemoData && demoStats ? demoStats : stats,
    userLeaderboard: useDemoData && demoLeaderboard.length > 0 ? demoLeaderboard : userLeaderboard,
    useDemoData,
    setUseDemoData,
    demoChartData: useDemoData ? demoChartData : null,
    setDemoTimeRange,
    hasRealData,
    setHasRealData,
    workspace: workspaceInternal,
    setWorkspace,
    workspaceDisplayName: workspaceDisplayNameInternal,
    setWorkspaceDisplayName,
  }), [
    useDemoData,
    demoData,
    emojiData,
    setEmojiData,
    loading,
    demoLoading,
    setLoading,
    error,
    filterByDateRange,
    demoStats,
    stats,
    demoLeaderboard,
    userLeaderboard,
    setUseDemoData,
    demoChartData,
    setDemoTimeRange,
    hasRealData,
    setHasRealData,
    workspaceInternal,
    setWorkspace,
    workspaceDisplayNameInternal,
    setWorkspaceDisplayName,
  ])

  return <EmojiDataContext.Provider value={contextValue}>{children}</EmojiDataContext.Provider>
}

// Custom hook to use the emoji data context
export const useEmojiData = () => {
  const context = useContext(EmojiDataContext)
  if (context === undefined) {
    throw new Error("useEmojiData must be used within an EmojiDataProvider")
  }
  return context
}
