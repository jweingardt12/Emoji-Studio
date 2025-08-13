"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
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

// Define the context type
interface EmojiDataContextType {
  emojiData: Emoji[]
  setEmojiData: React.Dispatch<React.SetStateAction<Emoji[]>>
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
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
}

// Create the context with a default value
const EmojiDataContext = createContext<EmojiDataContextType | undefined>(undefined)

// Provider component
export const EmojiDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [emojiData, setEmojiDataInternal] = useState<Emoji[]>([])
  const [loading, setLoading] = useState(true)
  const [useDemoData, setUseDemoData] = useState(false)
  const [demoTimeRange, setDemoTimeRange] = useState("90d")
  const [hasRealData, setHasRealData] = useState(false)
  const [workspace, setWorkspace] = useState<string>("")
  
  // Wrapper for setEmojiData to add logging
  const setEmojiData = useCallback((data: Emoji[] | ((prev: Emoji[]) => Emoji[])) => {
    console.log('[EmojiDataContext] setEmojiData called with:', Array.isArray(data) ? `${data.length} emojis` : 'function');
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
        console.log("Loading demo data from API...")
        const data = await generateDemoData()
        if (isMounted) {
          console.log(`Loaded ${data.length} emojis for demo data`)
          setDemoData(data)
          setDemoLoading(false)
        }
      } catch (error) {
        console.error("Error loading demo data:", error)
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
        console.error("Error loading enhanced demo data:", error)
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
        console.error("Error loading enhanced chart data:", error)
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
    console.log('[EmojiDataContext] loadEmojiData called');
    try {
      // Load workspace from settings
      const storedWorkspace = await settingsStorage.loadSetting("workspace") || localStorage.getItem("workspace")
      
      if (storedWorkspace) {
        console.log('[EmojiDataContext] Setting workspace:', storedWorkspace);
        setWorkspace(storedWorkspace)
      }

      // Try to load emoji data from IndexedDB first, with localStorage fallback
      const emojiData = await emojiStorage.loadEmojis()
      
      if (emojiData && Array.isArray(emojiData) && emojiData.length > 0) {
        console.log(`[EmojiDataContext] Loaded ${emojiData.length} emojis from storage`)
        console.log('[EmojiDataContext] First few emojis:', emojiData.slice(0, 3));
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
        console.log("No emoji data found in storage")
        setHasRealData(false)
        setUseDemoData(false)
      }
    } catch (error) {
      console.error("Error loading emoji data from storage:", error)
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
      console.log("Local storage cleared event detected")
      setEmojiData([])
      setHasRealData(false)
      setUseDemoData(false)
      setWorkspace("")
    }

    // Listen for emoji data updated event
    const handleEmojiDataUpdated = (event: Event) => {
      console.log("Emoji data updated event detected")
      const customEvent = event as CustomEvent;
      
      // If the event contains data, use it directly
      if (customEvent.detail && customEvent.detail.emojiData) {
        console.log(`[EmojiDataContext] Using data from event, ${customEvent.detail.emojiData.length} emojis`);
        setEmojiData(customEvent.detail.emojiData);
        if (customEvent.detail.workspace) {
          setWorkspace(customEvent.detail.workspace);
          setHasRealData(true);
          setUseDemoData(false);
        }
        setLoading(false);
      } else {
        // Fallback to loading from localStorage
        setTimeout(() => {
          loadEmojiData() // Reload data when the emojiDataUpdated event is fired
        }, 100)
      }
    }

    window.addEventListener("localStorageCleared", handleStorageCleared)
    window.addEventListener("emojiDataUpdated", handleEmojiDataUpdated)

    return () => {
      window.removeEventListener("localStorageCleared", handleStorageCleared)
      window.removeEventListener("emojiDataUpdated", handleEmojiDataUpdated)
    }
  }, [loadEmojiData])

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

  // Calculate stats
  const stats = useMemo(() => {
    console.log(`Recalculating stats: useDemoData=${useDemoData}, emojiData.length=${emojiData.length}`)
    if (useDemoData) {
      return demoStats
    }
    if (emojiData.length === 0) return null
    const calculatedStats = calculateEmojiStats(emojiData, Math.floor(Date.now() / 1000))
    console.log('Calculated stats:', calculatedStats)
    return calculatedStats
  }, [emojiData, useDemoData, demoStats])

  // Calculate user leaderboard
  const [userLeaderboard, setUserLeaderboard] = useState<ReturnType<typeof getUserLeaderboard>>([])
  
  // Update user leaderboard when emojiData or demoLeaderboard changes
  useEffect(() => {
    if (useDemoData) {
      // Use the demo leaderboard that's already loaded asynchronously
      setUserLeaderboard(demoLeaderboard)
    } else if (emojiData.length > 0) {
      // Calculate leaderboard from real data
      const leaderboard = getUserLeaderboard(emojiData, Math.floor(Date.now() / 1000))
      setUserLeaderboard(leaderboard)
    } else {
      setUserLeaderboard([])
    }
  }, [emojiData, useDemoData, demoLeaderboard])

  // Create the context value
  const contextValue: EmojiDataContextType = {
    emojiData: useDemoData && demoData.length > 0 ? demoData : emojiData,
    setEmojiData,
    loading: loading || (useDemoData && demoLoading),
    setLoading,
    filterByDateRange,
    stats: useDemoData && demoStats ? demoStats : stats,
    userLeaderboard: useDemoData && demoLeaderboard.length > 0 ? demoLeaderboard : userLeaderboard,
    useDemoData,
    setUseDemoData,
    demoChartData: useDemoData ? demoChartData : null,
    setDemoTimeRange,
    hasRealData,
    setHasRealData,
    workspace,
    setWorkspace,
  }

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
