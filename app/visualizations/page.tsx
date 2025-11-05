"use client"

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { RequireData } from "@/components/require-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"
// Import Recharts components normally - Next.js will handle code splitting
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend as RechartsLegend, 
  ResponsiveContainer, PieChart, Pie, Cell, 
  LineChart, Line, AreaChart, Area, 
  ScatterChart, Scatter, ZAxis, 
  Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, LabelList 
} from "recharts"
// Replace heavy date-fns imports with native Date methods and lightweight helpers
const format = (date: Date | number, formatStr: string) => {
  const d = typeof date === 'number' ? new Date(date * 1000) : date
  if (formatStr === 'MMM d') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  if (formatStr === 'MMM yyyy') {
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  if (formatStr === 'yyyy') {
    return d.getFullYear().toString()
  }
  if (formatStr === 'MMM dd, yyyy') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  if (formatStr === 'yyyy-MM-dd') {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return d.toISOString()
}

const subDays = (date: Date, days: number) => {
  const d = new Date(date)
  d.setDate(d.getDate() - days)
  return d
}

const differenceInDays = (date1: Date, date2: Date) => {
  return Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24))
}

const startOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

const endOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

const eachDayOfInterval = ({ start, end }: { start: Date; end: Date }) => {
  const days = []
  const current = new Date(start)
  while (current <= end) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return days
}

const isWithinInterval = (date: Date, { start, end }: { start: Date; end: Date }) => {
  return date >= start && date <= end
}

const parseISO = (dateStr: string) => new Date(dateStr)
import { ChartPieIcon, BarChart3Icon, LineChartIcon, Activity, TrendingUp, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Clock, Users, FileText, Layers } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart"
import EmojiOverlay from "@/components/emoji-overlay"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Metadata moved to page.metadata.ts

// Utility function to calculate days to show based on time range
const calculateDaysToShow = (timeRange: TimeRange, oldestTimestamp?: number): number => {
  const now = new Date();

  switch (timeRange) {
    case "7days": return 7;
    case "30days": return 30;
    case "90days": return 90;
    case "6months": return 180;
    case "1year": return 365;
    case "all":
      if (oldestTimestamp) {
        const oldestDate = new Date(oldestTimestamp * 1000);
        return Math.ceil((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      return 365; // fallback
    default:
      return 90;
  }
}

// Utility function to calculate weeks to show based on time range
const calculateWeeksToShow = (timeRange: TimeRange, oldestTimestamp?: number): number => {
  const now = new Date();

  switch (timeRange) {
    case "7days": return 1;
    case "30days": return 4;
    case "90days": return 12;
    case "6months": return 26;
    case "1year": return 52;
    case "all":
      if (oldestTimestamp) {
        const oldestDate = new Date(oldestTimestamp * 1000);
        return Math.min(52, Math.ceil((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 7)));
      }
      return 52; // fallback
    default:
      return 12;
  }
}


// Component to display emoji names with tooltip for long names
const EmojiName = ({ name }: { name: string }) => {
  const MAX_DISPLAY_LENGTH = 8; // Maximum characters to display
  const isLong = name.length > MAX_DISPLAY_LENGTH;
  
  // Format the display name with a character limit
  const displayName = isLong 
    ? `${name.substring(0, MAX_DISPLAY_LENGTH)}...` 
    : name;
    
  return (
    <div className="relative group">
      <p className="font-medium w-full">:{displayName}:</p>
      {isLong && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-background/95 border text-foreground text-xs p-2 rounded shadow-md z-10 max-w-[250px] break-all transition-opacity">
          <span className="font-medium">:{name}:</span>
        </div>
      )}
    </div>
  );
};

// Time range options
type TimeRange = "all" | "7days" | "30days" | "90days" | "6months" | "1year"

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
  { value: "90days", label: "Last 90 Days" },
  { value: "6months", label: "Last 6 Months" },
  { value: "1year", label: "Last Year" },
]

function VisualizationsPage() {
  // Add client-side only rendering to avoid hydration mismatches
  const [isClient, setIsClient] = useState(false)
  const [activeEmojiType, setActiveEmojiType] = useState<"image" | "gif">("image")
  const [selectedNameLength, setSelectedNameLength] = useState<number | null>(null)
  const [emojisWithLength, setEmojisWithLength] = useState<any[]>([])
  const [showEmojiDialog, setShowEmojiDialog] = useState(false)
  const [selectedEmoji, setSelectedEmoji] = useState<any>(null)
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [emojisWithWord, setEmojisWithWord] = useState<any[]>([])
  const [showWordEmojiDialog, setShowWordEmojiDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [emojisOnDate, setEmojisOnDate] = useState<any[]>([])
  const [showDateEmojiDialog, setShowDateEmojiDialog] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>("all")
  const [wordTableSortBy, setWordTableSortBy] = useState<'word' | 'count' | 'percentage' | 'length'>('count')
  const [wordTableSortDirection, setWordTableSortDirection] = useState<'asc' | 'desc'>('desc')
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  const { emojiData, loading } = useEmojiData()
  
  // Filter emojis based on selected time range
  const filteredEmojiData = useMemo(() => {
    if (!emojiData || timeRange === "all") return emojiData

    const now = Date.now() / 1000 // Current time in seconds
    let cutoffTime: number

    switch (timeRange) {
      case "7days":
        cutoffTime = now - (7 * 24 * 60 * 60)
        break
      case "30days":
        cutoffTime = now - (30 * 24 * 60 * 60)
        break
      case "90days":
        cutoffTime = now - (90 * 24 * 60 * 60)
        break
      case "6months":
        cutoffTime = now - (180 * 24 * 60 * 60)
        break
      case "1year":
        cutoffTime = now - (365 * 24 * 60 * 60)
        break
      default:
        return emojiData
    }

    return emojiData.filter(emoji => emoji.created && emoji.created >= cutoffTime)
  }, [emojiData, timeRange])

  // Cache sorted emoji data to avoid repeated sorts
  const sortedEmojiData = useMemo(() => {
    if (!filteredEmojiData) return []
    return [...filteredEmojiData]
      .filter(e => e.created && !e.is_alias)
      .sort((a, b) => (a.created || 0) - (b.created || 0))
  }, [filteredEmojiData])

  // Get oldest timestamp for date range calculations
  const oldestTimestamp = useMemo(() => {
    return sortedEmojiData.length > 0 ? sortedEmojiData[0].created : undefined
  }, [sortedEmojiData])
  
  // Function to handle click on name length bar
  const handleNameLengthClick = useCallback((data: { length: number }) => {
    if (!filteredEmojiData) return

    const length = data.length
    const matchingEmojis = filteredEmojiData.filter(emoji =>
      !emoji.is_alias && emoji.name && emoji.name.length === length
    ).sort((a, b) => (b.created || 0) - (a.created || 0)) // Sort by newest first

    setSelectedNameLength(length)
    setEmojisWithLength(matchingEmojis)
    setShowEmojiDialog(true)
  }, [filteredEmojiData])

  // Function to handle click on an individual emoji
  const handleEmojiClick = useCallback((emoji: any) => {
    // Close any open dialogs first
    setShowEmojiDialog(false)
    setShowWordEmojiDialog(false)
    // Set a small timeout to ensure dialogs are closed before opening the overlay
    setTimeout(() => {
      setSelectedEmoji(emoji)
    }, 50)
  }, [])

  // Function to close the emoji overlay
  const handleCloseEmojiOverlay = useCallback(() => {
    setSelectedEmoji(null)
  }, [])

  // Function to handle click on word bar
  const handleWordClick = useCallback((data: { word: string }) => {
    if (!filteredEmojiData) return

    const word = data.word
    const matchingEmojis = filteredEmojiData.filter(emoji =>
      !emoji.is_alias && emoji.name && emoji.name.toLowerCase().includes(word.toLowerCase())
    ).sort((a, b) => (b.created || 0) - (a.created || 0)) // Sort by newest first

    setSelectedWord(word)
    setEmojisWithWord(matchingEmojis)
    setShowWordEmojiDialog(true)
  }, [filteredEmojiData])

  // Function to handle click on date bar
  const handleDateClick = useCallback((data: { date: string }) => {
    if (!filteredEmojiData) return

    const dateStr = data.date
    const date = new Date(dateStr)

    // Set time to start of day
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const startTimestamp = startOfDay.getTime() / 1000

    // Set time to end of day
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    const endTimestamp = endOfDay.getTime() / 1000

    // Find emojis created on this date
    const matchingEmojis = filteredEmojiData.filter(emoji =>
      !emoji.is_alias && emoji.created &&
      emoji.created >= startTimestamp && emoji.created <= endTimestamp
    ).sort((a, b) => (b.created || 0) - (a.created || 0)) // Sort by newest first

    setSelectedDate(dateStr)
    setEmojisOnDate(matchingEmojis)
    setShowDateEmojiDialog(true)
  }, [filteredEmojiData])

  // Function to handle type change
  const handleTypeChange = useCallback((value: "image" | "gif") => {
    setActiveEmojiType(value)
  }, [])
  
  // Function to generate word frequencies dynamically based on search
  const getWordFrequenciesForSearch = useCallback((searchTerm: string) => {
    if (!filteredEmojiData || !searchTerm.trim()) return []

    const wordCounts: Record<string, number> = {}
    const stopWords = ['the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are']
    const searchLower = searchTerm.toLowerCase()

    filteredEmojiData.forEach(emoji => {
      if (!emoji.is_alias && emoji.name) {
        // Split emoji name by non-alphanumeric characters and underscores
        const words = emoji.name.toLowerCase().split(/[^a-z0-9]+/)
          .filter(word => word.length > 2) // Only words with 3+ characters
          .filter(word => !stopWords.includes(word)) // Filter out stop words
          .filter(word => word.includes(searchLower)) // Only words that contain the search term

        words.forEach(word => {
          wordCounts[word] = (wordCounts[word] || 0) + 1
        })
      }
    })

    // Return all matching words sorted by frequency
    return Object.entries(wordCounts)
      .map(([word, count]) => ({ word, count, length: word.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100) // Limit to top 100 results for performance
  }, [filteredEmojiData])
  
  // Calculate the current time in seconds (same format as emoji.created)
  const currentTime = Math.floor(Date.now() / 1000)
  
  // Prepare data for charts
  const chartData = useMemo(() => {
    if (!filteredEmojiData || filteredEmojiData.length === 0) return {
      topCreators: [],
      emojisByMonth: [],
      topCategories: [],
      creationTimeline: [],
      recentActivity: [],
      userEngagement: [],
      emojiDistribution: [],
      aliasRatio: { original: 0, alias: 0 },
      weekdayDistribution: [],
      emojiTypes: [],
      commonWords: [],
      emojisByHour: [],
      peakTimePeriod: "Unknown",
      cumulativeGrowth: [],
      creatorTimeline: [],
      topCreatorNames: [],
      creationVelocity: [],
      typePercentages: [],
      activeCreatorsTimeline: [],
      seasonalData: [],
      seasonalYears: [],
      nameLengthTrend: [],
      newVsReturningCreators: [],
      creatorProductivity: [],
    }

    // Top emoji creators
    const creators: Record<string, number> = {}
    filteredEmojiData.forEach(emoji => {
      if (emoji.user_display_name && !emoji.is_alias) {
        creators[emoji.user_display_name] = (creators[emoji.user_display_name] || 0) + 1
      }
    })
    
    const topCreators = Object.entries(creators)
      .map(([name, count]) => ({ name: name.split(' ')[0], count }))
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, 10)

    // Emojis by time period (month or day based on timeframe)
    const useDaily = timeRange === "7days" || timeRange === "30days"
    
    // Use a Map for efficient grouping
    const timeDataMap = new Map<string, { count: number; timestamp: number }>()
    
    filteredEmojiData.forEach(emoji => {
      if (emoji.created && !emoji.is_alias) {
        const date = new Date(emoji.created * 1000)
        const timeKey = useDaily 
          ? format(date, 'MMM d')  // Daily format for short timeframes
          : format(date, 'MMM yyyy') // Monthly format for longer timeframes
        
        const existing = timeDataMap.get(timeKey)
        if (existing) {
          existing.count++
        } else {
          timeDataMap.set(timeKey, {
            count: 1,
            timestamp: emoji.created
          })
        }
      }
    })
    
    // Convert map to array for sorting
    const timeDataWithDates = Array.from(timeDataMap.entries()).map(([key, value]) => ({
      key,
      count: value.count,
      timestamp: value.timestamp
    }))
    
    // Fill in missing days/months with zero values for continuous chart
    let emojisByMonth: Array<{ month: string; count: number }> = []
    
    if (useDaily && filteredEmojiData.length > 0) {
      // For daily view, create an entry for each day in the range
      const now = new Date()
      const daysToShow = timeRange === "7days" ? 7 : 30
      
      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dateKey = format(date, 'MMM d')
        
        const existing = timeDataWithDates.find(item => item.key === dateKey)
        emojisByMonth.push({
          month: dateKey,
          count: existing ? existing.count : 0
        })
      }
    } else {
      // For monthly view, use the data as is (sorted by timestamp)
      emojisByMonth = timeDataWithDates
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(item => ({ month: item.key, count: item.count }))
    }

    // Emoji categories (based on first character for demo purposes)
    const categories: Record<string, number> = {}
    filteredEmojiData.forEach(emoji => {
      if (!emoji.is_alias) {
        const firstChar = emoji.name.charAt(0).toLowerCase()
        categories[firstChar] = (categories[firstChar] || 0) + 1
      }
    })
    
    const topCategories = Object.entries(categories)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, 8)

    // Creation timeline (all-time data)
    // Create a map to track emoji counts by date
    const dateCountMap: Record<string, number> = {}
    
    // Process all emojis to count by date
    filteredEmojiData.forEach(emoji => {
      if (emoji.created && !emoji.is_alias) {
        const date = new Date(emoji.created * 1000)
        const dateStr = format(date, 'MMM dd, yyyy')
        dateCountMap[dateStr] = (dateCountMap[dateStr] || 0) + 1
      }
    })
    
    // Convert map to array for chart display
    const allTimeDays = Object.entries(dateCountMap).map(([date, count]) => ({
      date,
      count,
      // Store timestamp for potential future use
      timestamp: new Date(date).getTime() / 1000
    }))
    
    // Sort by count (descending) to find top days
    allTimeDays.sort((a, b) => b.count - a.count)
    
    // Recent activity (emojis created in the last 90 days)
    const ninetyDaysAgo = currentTime - (90 * 24 * 60 * 60)
    const recentEmojis = emojiData
      .filter(emoji => emoji.created && emoji.created > ninetyDaysAgo && !emoji.is_alias)
      .sort((a, b) => (b.created || 0) - (a.created || 0))
    
    const recentActivity = recentEmojis.map(emoji => ({
      name: emoji.name,
      value: currentTime - (emoji.created || 0), // Time since creation in seconds
      creator: emoji.user_display_name?.split(' ')[0] || 'Unknown'
    })).slice(0, 50) // Top 50 recent emojis

    // User engagement scatter plot
    interface UserActivityData {
      name: string;
      emojis: number;
      firstCreated: number;
      lastCreated: number;
    }
    
    const userActivity: Record<string, UserActivityData> = {}
    filteredEmojiData.forEach(emoji => {
      if (emoji.user_display_name && emoji.created && !emoji.is_alias) {
        if (!userActivity[emoji.user_display_name]) {
          userActivity[emoji.user_display_name] = {
            name: emoji.user_display_name.split(' ')[0],
            emojis: 0,
            firstCreated: emoji.created,
            lastCreated: emoji.created
          }
        }
        
        userActivity[emoji.user_display_name].emojis++
        userActivity[emoji.user_display_name].firstCreated = Math.min(
          userActivity[emoji.user_display_name].firstCreated,
          emoji.created || Infinity
        )
        userActivity[emoji.user_display_name].lastCreated = Math.max(
          userActivity[emoji.user_display_name].lastCreated,
          emoji.created || 0
        )
      }
    })
    
    const userEngagement = Object.values(userActivity)
      .map((user: UserActivityData) => ({
        name: user.name,
        emojis: user.emojis,
        timespan: user.lastCreated - user.firstCreated, // Time between first and last emoji
        activity: user.emojis / ((user.lastCreated - user.firstCreated) / (60 * 60 * 24) + 1) // Emojis per day
      }))
      .filter(user => user.emojis > 1) // Only users with more than 1 emoji

    // Emoji name length distribution
    const nameLengths: Record<number, number> = {}
    filteredEmojiData.forEach(emoji => {
      if (!emoji.is_alias && emoji.name) {
        const length = emoji.name.length
        nameLengths[length] = (nameLengths[length] || 0) + 1
      }
    })
    
    const emojiDistribution = Object.entries(nameLengths)
      .map(([length, count]) => ({ length: Number(length), count }))
      .sort((a, b) => a.length - b.length)

    // Original vs Alias ratio
    const originalCount = filteredEmojiData.filter(emoji => !emoji.is_alias).length
    const aliasCount = filteredEmojiData.filter(emoji => emoji.is_alias).length
    
    const aliasRatio = {
      original: originalCount,
      alias: aliasCount
    }

    // Weekday distribution
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const weekdayCounts = Array(7).fill(0)
    
    filteredEmojiData.forEach(emoji => {
      if (emoji.created && !emoji.is_alias) {
        const date = new Date(emoji.created * 1000)
        const weekday = date.getDay() // 0 = Sunday, 6 = Saturday
        weekdayCounts[weekday]++
      }
    })
    
    const weekdayDistribution = weekdays.map((day, index) => ({
      day,
      count: weekdayCounts[index]
    }))

    // Emoji types (image vs GIF)
    const emojiTypes = [];
    const now = new Date();
    const daysToShow = calculateDaysToShow(timeRange, oldestTimestamp);

    // Generate data for the calculated period
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = format(date, 'yyyy-MM-dd');

      // Count image and GIF emojis for this date
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayStartTimestamp = dayStart.getTime() / 1000;
      const dayEndTimestamp = dayEnd.getTime() / 1000;

      // Filter emojis created on this day
      const dayEmojis = filteredEmojiData.filter(emoji =>
        emoji.created &&
        emoji.created >= dayStartTimestamp &&
        emoji.created <= dayEndTimestamp &&
        !emoji.is_alias
      );

      // Count image and GIF emojis
      const imageEmojis = dayEmojis.filter(emoji =>
        emoji.url && !emoji.url.toLowerCase().includes('.gif')
      ).length;

      const gifEmojis = dayEmojis.filter(emoji =>
        emoji.url && emoji.url.toLowerCase().includes('.gif')
      ).length;

      emojiTypes.push({
        date: dateString,
        image: imageEmojis,
        gif: gifEmojis
      });
    }
    
    // Analyze common words in emoji names
    const wordCounts: Record<string, number> = {};
    const stopWords = ['the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are'];
    
    filteredEmojiData.forEach(emoji => {
      if (!emoji.is_alias && emoji.name) {
        // Split emoji name by non-alphanumeric characters and underscores
        const words = emoji.name.toLowerCase().split(/[^a-z0-9]+/)
          .filter(word => word.length > 2) // Only words with 3+ characters
          .filter(word => !stopWords.includes(word)); // Filter out stop words
        
        words.forEach(word => {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
      }
    });
    
    // Get top words
    const commonWords = Object.entries(wordCounts)
      .map(([word, count]) => ({ word, count, length: word.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30); // Top 30 words for table
      
    // Calculate emoji creation by time of day in 3-hour buckets
    const timeLabels = [
      "12-3 AM",
      "3-6 AM",
      "6-9 AM",
      "9-12 PM",
      "12-3 PM",
      "3-6 PM",
      "6-9 PM",
      "9-12 AM"
    ];
    
    // Initialize counts for each time bucket
    const timeBucketCounts = Array(8).fill(0);
    
    filteredEmojiData.forEach(emoji => {
      if (!emoji.is_alias && emoji.created) {
        const date = new Date(emoji.created * 1000);
        const hour = date.getHours();
        // Map hour to bucket index (0-7)
        const bucketIndex = Math.floor(hour / 3);
        timeBucketCounts[bucketIndex]++;
      }
    });
    
    // Create the final data structure for the chart
    const emojisByHour = timeLabels.map((label, index) => ({
      timeOfDay: label,
      count: timeBucketCounts[index]
    }));
    
    // Find the peak time period outside of the render function to avoid hydration issues
    const peakTimePeriod = [...emojisByHour].sort((a, b) => b.count - a.count)[0]?.timeOfDay || "Unknown";
    
    // Calculate cumulative growth data (images vs GIFs stacked)
    const cumulativeGrowth: Array<{ date: string; images: number; gifs: number; total: number }> = [];

    if (sortedEmojiData.length > 0) {
      const now = new Date();
      const daysToShow = calculateDaysToShow(timeRange, oldestTimestamp);

      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const endTimestamp = endOfDay.getTime() / 1000;

        // Count emojis created up to this date
        const emojisUpToDate = sortedEmojiData.filter(e => e.created! <= endTimestamp);
        const images = emojisUpToDate.filter(e => e.url && !e.url.toLowerCase().includes('.gif')).length;
        const gifs = emojisUpToDate.filter(e => e.url && e.url.toLowerCase().includes('.gif')).length;

        cumulativeGrowth.push({
          date: format(date, 'yyyy-MM-dd'),
          images,
          gifs,
          total: images + gifs
        });
      }
    }

    // Calculate top creators over time (for stacked area chart)
    const topCreatorNames = topCreators.slice(0, 5).map(c => c.name);
    const creatorTimeline: Array<any> = [];

    if (sortedEmojiData.length > 0) {
      const now = new Date();
      const daysToShow = calculateDaysToShow(timeRange, oldestTimestamp);

      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const endTimestamp = endOfDay.getTime() / 1000;

        const dataPoint: any = {
          date: format(date, 'yyyy-MM-dd')
        };

        // Count cumulative emojis for each top creator
        topCreatorNames.forEach(creatorName => {
          const count = sortedEmojiData.filter(e =>
            e.created! <= endTimestamp &&
            e.user_display_name?.split(' ')[0] === creatorName
          ).length;
          dataPoint[creatorName] = count;
        });

        creatorTimeline.push(dataPoint);
      }
    }

    // Calculate GIF vs Image percentage over time (stacked 100%)
    const typePercentages: Array<{ date: string; imagePercent: number; gifPercent: number }> = [];
    if (sortedEmojiData.length > 0) {
      const now = new Date();
      const daysToShow = calculateDaysToShow(timeRange, oldestTimestamp);

      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const endTimestamp = endOfDay.getTime() / 1000;

        const emojisUpToDate = sortedEmojiData.filter(e => e.created! <= endTimestamp);
        const images = emojisUpToDate.filter(e => e.url && !e.url.toLowerCase().includes('.gif')).length;
        const gifs = emojisUpToDate.filter(e => e.url && e.url.toLowerCase().includes('.gif')).length;
        const total = images + gifs;

        typePercentages.push({
          date: format(date, 'yyyy-MM-dd'),
          imagePercent: total > 0 ? Math.round((images / total) * 100) : 0,
          gifPercent: total > 0 ? Math.round((gifs / total) * 100) : 0,
        });
      }
    }

    // Calculate active creators over time
    const activeCreatorsTimeline: Array<{ date: string; count: number }> = [];
    if (sortedEmojiData.length > 0) {
      const now = new Date();
      const daysToShow = calculateDaysToShow(timeRange, oldestTimestamp);

      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const endTimestamp = endOfDay.getTime() / 1000;

        // Count unique creators up to this date
        const creators = new Set<string>();
        sortedEmojiData.forEach(e => {
          if (e.created! <= endTimestamp && e.user_display_name) {
            creators.add(e.user_display_name);
          }
        });

        activeCreatorsTimeline.push({
          date: format(date, 'yyyy-MM-dd'),
          count: creators.size,
        });
      }
    }

    // Calculate seasonal patterns (emoji creation by month across years)
    const seasonalPatterns: Record<string, Record<string, number>> = {};
    if (sortedEmojiData.length > 0) {
      sortedEmojiData.forEach(emoji => {
        if (emoji.created) {
          const date = new Date(emoji.created * 1000);
          const year = date.getFullYear().toString();
          const month = date.toLocaleDateString('en-US', { month: 'short' });

          if (!seasonalPatterns[year]) {
            seasonalPatterns[year] = {};
          }
          seasonalPatterns[year][month] = (seasonalPatterns[year][month] || 0) + 1;
        }
      });
    }

    // Convert seasonal patterns to array format for chart
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = Object.keys(seasonalPatterns).sort();
    const seasonalData = months.map(month => {
      const dataPoint: any = { month };
      years.forEach(year => {
        dataPoint[year] = seasonalPatterns[year]?.[month] || 0;
      });
      return dataPoint;
    });

    // Calculate average name length over time
    const nameLengthTrend: Array<{ date: string; avgLength: number }> = [];
    if (sortedEmojiData.length > 0) {
      const now = new Date();
      const weeksToShow = calculateWeeksToShow(timeRange, oldestTimestamp);

      for (let i = weeksToShow - 1; i >= 0; i--) {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);

        weekStart.setHours(0, 0, 0, 0);
        weekEnd.setHours(23, 59, 59, 999);

        const startTimestamp = weekStart.getTime() / 1000;
        const endTimestamp = weekEnd.getTime() / 1000;

        const weekEmojis = sortedEmojiData.filter(e =>
          e.created! >= startTimestamp && e.created! <= endTimestamp
        );

        const avgLength = weekEmojis.length > 0
          ? weekEmojis.reduce((sum, e) => sum + e.name.length, 0) / weekEmojis.length
          : 0;

        nameLengthTrend.push({
          date: format(weekEnd, 'MMM d'),
          avgLength: Math.round(avgLength * 10) / 10,
        });
      }
    }

    // Calculate creation velocity (emojis per week with moving average)
    const creationVelocity: Array<{ week: string; count: number; timestamp: number; movingAvg?: number }> = [];
    if (sortedEmojiData.length > 0) {
      const now = new Date();
      const weeksToShow = calculateWeeksToShow(timeRange, oldestTimestamp);

      for (let i = weeksToShow - 1; i >= 0; i--) {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);

        weekStart.setHours(0, 0, 0, 0);
        weekEnd.setHours(23, 59, 59, 999);

        const startTimestamp = weekStart.getTime() / 1000;
        const endTimestamp = weekEnd.getTime() / 1000;

        const weekCount = sortedEmojiData.filter(e =>
          e.created! >= startTimestamp && e.created! <= endTimestamp
        ).length;

        creationVelocity.push({
          week: format(weekEnd, 'MMM d'),
          count: weekCount,
          timestamp: endTimestamp
        });
      }

      // Add 4-week moving average
      creationVelocity.forEach((item, index) => {
        const start = Math.max(0, index - 3);
        const slice = creationVelocity.slice(start, index + 1);
        const avg = slice.reduce((sum, v) => sum + v.count, 0) / slice.length;
        item.movingAvg = Math.round(avg * 10) / 10;
      });
    }

    // Calculate new vs returning creators over time
    const newVsReturningCreators: Array<{ date: string; newCreators: number; returningCreators: number }> = [];
    if (sortedEmojiData.length > 0) {
      const now = new Date();
      let periodsToShow = 12; // months by default
      let periodType: 'month' | 'week' = 'month';

      if (timeRange === "7days") {
        periodsToShow = 7;
        periodType = 'week';
      } else if (timeRange === "30days") {
        periodsToShow = 4;
        periodType = 'week';
      } else if (timeRange === "90days") {
        periodsToShow = 12;
        periodType = 'week';
      } else if (timeRange === "6months") {
        periodsToShow = 6;
        periodType = 'month';
      } else if (timeRange === "1year") {
        periodsToShow = 12;
        periodType = 'month';
      } else if (timeRange === "all") {
        // For all time, calculate months from oldest to now
        const oldestDate = new Date(sortedEmojiData[0].created! * 1000);
        const monthsDiff = (now.getFullYear() - oldestDate.getFullYear()) * 12 + (now.getMonth() - oldestDate.getMonth());
        periodsToShow = Math.max(1, monthsDiff + 1);
        periodType = 'month';
      }

      // Track when each creator first appeared
      const creatorFirstAppearance = new Map<string, number>();
      sortedEmojiData.forEach(emoji => {
        if (emoji.user_display_name && emoji.created) {
          const existing = creatorFirstAppearance.get(emoji.user_display_name);
          if (!existing || emoji.created < existing) {
            creatorFirstAppearance.set(emoji.user_display_name, emoji.created);
          }
        }
      });

      for (let i = periodsToShow - 1; i >= 0; i--) {
        const date = new Date(now);
        if (periodType === 'month') {
          date.setMonth(date.getMonth() - i);
          date.setDate(1);
        } else {
          date.setDate(date.getDate() - i * 7);
        }

        const startOfPeriod = new Date(date);
        startOfPeriod.setHours(0, 0, 0, 0);
        const endOfPeriod = new Date(startOfPeriod);
        if (periodType === 'month') {
          endOfPeriod.setMonth(endOfPeriod.getMonth() + 1);
        } else {
          endOfPeriod.setDate(endOfPeriod.getDate() + 7);
        }

        const startTimestamp = startOfPeriod.getTime() / 1000;
        const endTimestamp = endOfPeriod.getTime() / 1000;

        // Count creators who made emojis in this period
        const creatorsInPeriod = new Set<string>();
        sortedEmojiData.forEach(e => {
          if (e.created && e.created >= startTimestamp && e.created < endTimestamp && e.user_display_name) {
            creatorsInPeriod.add(e.user_display_name);
          }
        });

        // Determine which are new vs returning
        let newCount = 0;
        let returningCount = 0;
        creatorsInPeriod.forEach(creator => {
          const firstAppearance = creatorFirstAppearance.get(creator);
          if (firstAppearance && firstAppearance >= startTimestamp && firstAppearance < endTimestamp) {
            newCount++;
          } else {
            returningCount++;
          }
        });

        newVsReturningCreators.push({
          date: periodType === 'month'
            ? date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            : format(date, 'yyyy-MM-dd'),
          newCreators: newCount,
          returningCreators: returningCount,
        });
      }
    }

    // Calculate creator productivity distribution
    const creatorProductivity: Array<{ range: string; count: number; avgCount: number }> = [];
    const productivityRanges = [
      { min: 1, max: 1, label: '1' },
      { min: 2, max: 5, label: '2-5' },
      { min: 6, max: 10, label: '6-10' },
      { min: 11, max: 25, label: '11-25' },
      { min: 26, max: 50, label: '26-50' },
      { min: 51, max: 999999, label: '50+' },
    ];

    productivityRanges.forEach(range => {
      const creatorsInRange = Object.entries(creators).filter(
        ([_, count]) => count >= range.min && count <= range.max
      );
      const avgCount = creatorsInRange.length > 0
        ? Math.round(creatorsInRange.reduce((sum, [_, count]) => sum + count, 0) / creatorsInRange.length)
        : 0;

      creatorProductivity.push({
        range: range.label,
        count: creatorsInRange.length,
        avgCount,
      });
    });

    return {
      topCreators,
      emojisByMonth,
      topCategories,
      creationTimeline: allTimeDays,
      recentActivity,
      userEngagement,
      emojiDistribution,
      aliasRatio,
      weekdayDistribution,
      emojiTypes,
      commonWords,
      emojisByHour,
      peakTimePeriod,
      cumulativeGrowth,
      creatorTimeline,
      topCreatorNames,
      creationVelocity,
      typePercentages,
      activeCreatorsTimeline,
      seasonalData,
      seasonalYears: years,
      nameLengthTrend,
      newVsReturningCreators,
      creatorProductivity,
    }
  }, [filteredEmojiData, sortedEmojiData, oldestTimestamp, currentTime, timeRange])

  // Colors for charts - using vibrant colors that match the screenshot
  const COLORS = ['#FF4560', '#00E396', '#FEB019', '#008FFB', '#775DD0', '#2E93FA', '#F9A3A4', '#26C6DA', '#64C2A6', '#AECB4F', '#EE6868', '#A86CE4']

  // Only render when client-side to avoid hydration mismatches
  if (!isClient) return null

  return (
    <div className="flex flex-col gap-2 py-2 sm:gap-4 sm:py-4 md:gap-6 md:py-6">
      {/* Dialog to show emojis with selected name length */}
      <Dialog open={showEmojiDialog} onOpenChange={setShowEmojiDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Emojis with {selectedNameLength} Characters</DialogTitle>
            <DialogDescription>
              Found {emojisWithLength.length} emojis with name length of {selectedNameLength} characters
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
              {emojisWithLength.map((emoji) => (
                <div 
                  key={emoji.name} 
                  className="flex flex-col items-center p-2 border rounded-md hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleEmojiClick(emoji)}
                >
                  <div className="relative w-16 h-16 mb-2">
                    {emoji.url && (
                      <img 
                        src={emoji.url} 
                        alt={emoji.name} 
                        className="object-contain w-full h-full"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="text-center">
                    <EmojiName name={emoji.name} />
                    <p className="text-xs text-muted-foreground truncate w-full">
                      by {emoji.user_display_name?.split(' ')[0] || emoji.user_name?.split(' ')[0] || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {emoji.created ? format(new Date(emoji.created * 1000), 'MMM d, yyyy') : 'Unknown date'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Dialog to show emojis containing selected word */}
      <Dialog open={showWordEmojiDialog} onOpenChange={setShowWordEmojiDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Emojis containing "{selectedWord}"</DialogTitle>
            <DialogDescription>
              Found {emojisWithWord.length} emojis with names containing "{selectedWord}"
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
              {emojisWithWord.map((emoji) => (
                <div 
                  key={emoji.name} 
                  className="flex flex-col items-center p-2 border rounded-md hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleEmojiClick(emoji)}
                >
                  <div className="relative w-16 h-16 mb-2">
                    {emoji.url && (
                      <img 
                        src={emoji.url} 
                        alt={emoji.name} 
                        className="object-contain w-full h-full"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="text-center">
                    <EmojiName name={emoji.name} />
                    <p className="text-xs text-muted-foreground truncate w-full">
                      by {emoji.user_display_name?.split(' ')[0] || emoji.user_name?.split(' ')[0] || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {emoji.created ? format(new Date(emoji.created * 1000), 'MMM d, yyyy') : 'Unknown date'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog for showing emojis created on a specific date */}
      <Dialog open={showDateEmojiDialog} onOpenChange={setShowDateEmojiDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Emojis created on {selectedDate}</DialogTitle>
            <DialogDescription>
              Found {emojisOnDate.length} emojis created on this date
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
              {emojisOnDate.map((emoji) => (
                <div 
                  key={emoji.name} 
                  className="flex flex-col items-center p-2 border rounded-md hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleEmojiClick(emoji)}
                >
                  <div className="relative w-16 h-16 mb-2">
                    {emoji.url && (
                      <img 
                        src={emoji.url} 
                        alt={emoji.name} 
                        className="object-contain w-full h-full"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="text-center">
                    <EmojiName name={emoji.name} />
                    <p className="text-xs text-muted-foreground truncate w-full">
                      by {emoji.user_display_name?.split(' ')[0] || emoji.user_name?.split(' ')[0] || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {emoji.created ? format(new Date(emoji.created * 1000), 'h:mm a') : 'Unknown time'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Emoji Overlay */}
      <EmojiOverlay 
        emoji={selectedEmoji} 
        onClose={handleCloseEmojiOverlay} 
        onEmojiClick={handleEmojiClick} 
      />
      
      <div className="px-2 sm:px-4 lg:px-6">
        <div className="rounded-xl bg-card border border-border shadow p-2 sm:p-4">
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  <span>Emoji Visualizations</span>
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base">Deep insights into your workspace emoji usage and trends.</p>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tabbed navigation for charts */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 h-auto p-1">
              <TabsTrigger value="overview" className="flex items-center justify-center gap-2 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <ChartPieIcon className="h-5 w-5" />
                <span className="hidden sm:inline font-medium">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center justify-center gap-2 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <Activity className="h-5 w-5" />
                <span className="hidden sm:inline font-medium">Activity Patterns</span>
              </TabsTrigger>
              <TabsTrigger value="creators" className="flex items-center justify-center gap-2 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <Users className="h-5 w-5" />
                <span className="hidden sm:inline font-medium">Creators</span>
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center justify-center gap-2 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <FileText className="h-5 w-5" />
                <span className="hidden sm:inline font-medium">Content</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Top Emoji Creation Days - Half width */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Emoji Creation Days</CardTitle>
                <CardDescription>Days with the highest emoji creation activity</CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <ChartContainer
                  className="h-[200px] sm:h-[300px] w-full max-w-full"
                  config={{
                    count: {
                      label: "",  // Removed label as it's inferred
                      color: "#4169E1"
                    },
                    label: {
                      color: "hsl(var(--background))"
                    }
                  }}
                >
                  <BarChart
                    accessibilityLayer
                    data={chartData.creationTimeline.sort((a: any, b: any) => b.count - a.count).slice(0, 10)}
                    layout="vertical"
                    margin={{
                      right: 16,
                    }}
                  >
                    <CartesianGrid horizontal={false} />
                    <YAxis
                      dataKey="date"
                      type="category"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      hide
                    />
                    <XAxis dataKey="count" type="number" hide />
                    <ChartTooltip
                      cursor={false}
                      content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                        if (active && payload && payload.length) {
                          return (
                            <ChartTooltipContent>
                              <div className="font-semibold">{payload[0].payload.date}</div>
                              <div className="text-xs text-muted-foreground">
                                {payload[0].value} emojis
                              </div>
                            </ChartTooltipContent>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar
                      dataKey="count"
                      layout="vertical"
                      fill="#4169E1"
                      radius={4}
                      onClick={handleDateClick}
                      style={{ cursor: 'pointer' }}
                    >
                      <LabelList
                        dataKey="date"
                        position="insideLeft"
                        offset={8}
                        className="fill-[--color-label] text-xs sm:text-sm"
                        fontSize={{xs: 10, sm: 12}}
                        formatter={(value: any) => {
                          // On small screens, truncate the date to make it fit better
                          const isMobile = window.innerWidth < 640;
                          if (isMobile && typeof value === 'string') {
                            // Extract just month and day for mobile
                            const parts = value.split(' ');
                            if (parts.length >= 2) {
                              return `${parts[0]} ${parts[1].replace(',', '')}`;
                            }
                          }
                          return value;
                        }}
                      />
                      <LabelList
                        dataKey="count"
                        position="right"
                        offset={8}
                        className="fill-foreground"
                        fontSize={12}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                  Peak day: {chartData.creationTimeline.sort((a: any, b: any) => b.count - a.count)[0]?.date}
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardFooter>
            </Card>

            {/* Monthly/Daily Trend - Half width */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{timeRange === "7days" || timeRange === "30days" ? "Daily" : "Monthly"} Emoji Creation</CardTitle>
                <CardDescription>{timeRange === "all" ? "All-time" : timeRangeOptions.find(o => o.value === timeRange)?.label || ""} trend of emoji creation</CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <ChartContainer
                  className="aspect-[4/3] w-full max-w-full"
                  config={{
                    count: {
                      label: "",  // Removed label as it's inferred
                      theme: {
                        light: "#8884d8",
                        dark: "#8884d8"
                      }
                    }
                  }}
                >
                  <LineChart
                    data={chartData.emojisByMonth}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip
                      content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background/90 border rounded-md shadow-md px-3 py-2 text-sm">
                              <div className="font-semibold">{payload[0].payload.month}</div>
                              <div className="text-muted-foreground">
                                {payload[0].value} emojis
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                      cursor={false}
                      offset={10}
                    />
                    <ChartLegend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      strokeWidth={2}
                      activeDot={{ r: 4, strokeWidth: 0, fill: "#008FFB" }}
                      dot={{ r: 2, strokeWidth: 0, fill: "#008FFB" }}
                      stroke="#008FFB"
                      isAnimationActive={false}
                      label={({ x, y, value, index }: { x?: number; y?: number; value?: number; index?: number }) => {
                        // Only show label when hovering
                        // We'll use a custom implementation that shows on hover
                        return null;
                      }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Image vs GIF Emojis - Interactive Chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
                <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
                  <CardTitle>Image vs GIF Emojis</CardTitle>
                  <CardDescription>
                    Breakdown of emoji types {timeRange === "all" ? "over all time" : `over the ${timeRangeOptions.find(o => o.value === timeRange)?.label.toLowerCase() || ""}`}
                  </CardDescription>
                </div>
                <div className="flex">
                  {(["image", "gif"] as const).map((key) => {
                    const total = chartData.emojiTypes.reduce((acc, curr) => acc + curr[key], 0);
                    const isActive = activeEmojiType === key;
                    return (
                      <button
                        key={key}
                        data-active={isActive}
                        className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                        onClick={() => handleTypeChange(key)}
                      >
                        <span className="text-xs text-muted-foreground">
                          {key === "image" ? "Static Images" : "Animated GIFs"}
                        </span>
                        <span className="text-lg font-bold leading-none sm:text-3xl">
                          {total.toLocaleString()}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </CardHeader>
              <CardContent className="px-2 sm:p-6">
                <ChartContainer
                  config={{
                    views: {
                      label: "Emoji Count",
                    },
                    image: {
                      label: "Static Images",
                      color: "#00E396",
                    },
                    gif: {
                      label: "Animated GIFs",
                      color: "#FF4560",
                    },
                  }}
                  className="aspect-auto h-[250px] w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={chartData.emojiTypes}
                    margin={{
                      left: 12,
                      right: 12,
                    }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(value: number) => {
                        const date = new Date(value)
                        return date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }}
                    />
                    <ChartTooltip
                      content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                        if (active && payload && payload.length) {
                          const date = new Date(payload[0].payload.date);
                          return (
                            <ChartTooltipContent>
                              <div className="font-semibold">
                                {date.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {payload[0].value} {activeEmojiType === "image" ? "static images" : "animated GIFs"}
                              </div>
                            </ChartTooltipContent>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey={activeEmojiType} fill={activeEmojiType === "image" ? "#00E396" : "#FF4560"} radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Community Growth */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Community Growth</CardTitle>
                <CardDescription>Unique creators contributing over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: {
                      label: "Active Creators",
                      color: "#06b6d4",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <AreaChart
                    data={chartData.activeCreatorsTimeline}
                    margin={{ left: 12, right: 12, top: 12 }}
                  >
                    <defs>
                      <linearGradient id="fillCreators" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(value: string | number) => {
                        const date = new Date(value);
                        return date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        });
                      }}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="step"
                      dataKey="count"
                      stroke="#06b6d4"
                      fill="url(#fillCreators)"
                      fillOpacity={1}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                  {chartData.activeCreatorsTimeline.length > 0 && (
                    <>
                      Total contributors: {chartData.activeCreatorsTimeline[chartData.activeCreatorsTimeline.length - 1]?.count || 0}
                      <Activity className="h-4 w-4" />
                    </>
                  )}
                </div>
              </CardFooter>
            </Card>
              </div>
            </TabsContent>

            {/* Activity Patterns Tab */}
            <TabsContent value="activity" className="space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <Activity className="h-6 w-6" />
                  Activity Patterns
                </h2>
                <p className="text-muted-foreground mb-4">When are emojis created?</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">

            {/* Emojis by Day of Week */}
            <Card className="md:col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle>Emojis by Day of Week</CardTitle>
                <CardDescription>When emojis are typically created</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: {
                      label: "Emojis Created",
                      color: "#008FFB"
                    },
                    label: {
                      color: "hsl(var(--background))"
                    }
                  }}
                  className="w-full h-auto aspect-[3/2]"
                >
                  <BarChart
                    accessibilityLayer
                    data={chartData.weekdayDistribution}
                    layout="vertical"
                    margin={{
                      top: 0,
                      right: 16,
                      bottom: 0,
                      left: 0
                    }}
                  >
                    <CartesianGrid horizontal={false} />
                    <YAxis
                      dataKey="day"
                      type="category"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      hide
                    />
                    <XAxis dataKey="count" type="number" hide />
                    <ChartTooltip
                      cursor={false}
                      content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                        if (active && payload && payload.length) {
                          return (
                            <ChartTooltipContent>
                              <div className="font-semibold">{payload[0].payload.day}</div>
                              <div className="text-xs text-muted-foreground">
                                {payload[0].value} emojis
                              </div>
                            </ChartTooltipContent>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar
                      dataKey="count"
                      layout="vertical"
                      fill="#008FFB"
                      radius={4}
                    >
                      <LabelList
                        dataKey="day"
                        position="insideLeft"
                        offset={8}
                        className="fill-[--color-label]"
                        fontSize={12}
                      />
                      <LabelList
                        dataKey="count"
                        position="right"
                        offset={8}
                        className="fill-foreground"
                        fontSize={12}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                  Most active day: {chartData.weekdayDistribution.sort((a, b) => b.count - a.count)[0]?.day}
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardFooter>
            </Card>

            {/* Emoji Creation by Hour - Fill remaining row space */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-4">
                <CardTitle>Emoji Creation by Hour</CardTitle>
                <CardDescription>
                  When emojis are created
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-0">
                {isClient && (
                  <ChartContainer
                    config={{
                      count: {
                        label: "Emojis Created",
                        color: "#8b5cf6"
                      }
                    }}
                    className="mx-auto aspect-square max-h-[350px]"
                  >
                    <RadarChart 
                      data={chartData.emojisByHour}
                      outerRadius={120}
                    >
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                      <PolarAngleAxis 
                        dataKey="timeOfDay" 
                        tick={{ fill: '#a1a1aa' }} 
                        axisLine={{ stroke: '#3f3f46' }}
                      />
                      <PolarGrid 
                        stroke="#3f3f46" 
                        strokeDasharray="3 3" 
                      />
                      <Radar
                        name="Emojis Created"
                        dataKey="count"
                        fill="#8b5cf6"
                        stroke="#8b5cf6"
                        fillOpacity={0.6}
                      />
                    </RadarChart>
                  </ChartContainer>
                )}
                {!isClient && (
                  <div className="flex items-center justify-center h-[350px]">
                    <p className="text-muted-foreground">Loading chart...</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 font-medium leading-none">
                  Peak: {chartData.peakTimePeriod}
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardFooter>
            </Card>

            {/* NEW: Cumulative Emoji Growth - Stacked Area Chart */}
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Cumulative Emoji Growth</CardTitle>
                <CardDescription>Total emoji library size over time (stacked by type)</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    images: {
                      label: "Static Images",
                      color: "#00E396",
                    },
                    gifs: {
                      label: "Animated GIFs",
                      color: "#FF4560",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <AreaChart
                    data={chartData.cumulativeGrowth}
                    margin={{ left: 12, right: 12, top: 12 }}
                  >
                    <defs>
                      <linearGradient id="fillImages" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00E396" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#00E396" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="fillGifs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF4560" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#FF4560" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(value: string | number) => {
                        const date = new Date(value);
                        return date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        });
                      }}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                    <ChartLegend content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="images"
                      stackId="1"
                      stroke="#00E396"
                      fill="url(#fillImages)"
                      fillOpacity={1}
                    />
                    <Area
                      type="monotone"
                      dataKey="gifs"
                      stackId="1"
                      stroke="#FF4560"
                      fill="url(#fillGifs)"
                      fillOpacity={1}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                  {chartData.cumulativeGrowth.length > 0 && (
                    <>
                      Current total: {chartData.cumulativeGrowth[chartData.cumulativeGrowth.length - 1]?.total || 0} emojis
                      <TrendingUp className="h-4 w-4" />
                    </>
                  )}
                </div>
              </CardFooter>
            </Card>

            {/* NEW: Seasonal Patterns - Multi-line Area Chart */}
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Seasonal Patterns</CardTitle>
                <CardDescription>Emoji creation by month across years</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    ...chartData.seasonalYears.reduce((acc: Record<string, any>, year, index) => {
                      acc[year] = {
                        label: year,
                        color: COLORS[index % COLORS.length],
                      };
                      return acc;
                    }, {}),
                  }}
                  className="h-[300px] w-full"
                >
                  <AreaChart
                    data={chartData.seasonalData}
                    margin={{ left: 12, right: 12, top: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend />
                    {chartData.seasonalYears.map((year, index) => (
                      <Area
                        key={year}
                        type="monotone"
                        dataKey={year}
                        stroke={COLORS[index % COLORS.length]}
                        fill={COLORS[index % COLORS.length]}
                        fillOpacity={0.3}
                      />
                    ))}
                  </AreaChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                  Comparing {chartData.seasonalYears.length} {chartData.seasonalYears.length === 1 ? 'year' : 'years'}
                  <Calendar className="h-4 w-4" />
                </div>
              </CardFooter>
            </Card>

            {/* Creation Velocity - Gradient Area Chart */}
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Emoji Creation Velocity</CardTitle>
                <CardDescription>Weekly emoji creation rate with 4-week moving average</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: {
                      label: "Emojis per Week",
                      color: "#8b5cf6",
                    },
                    movingAvg: {
                      label: "4-Week Average",
                      color: "#06b6d4",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <AreaChart
                    data={chartData.creationVelocity}
                    margin={{ left: 12, right: 12, top: 12 }}
                  >
                    <defs>
                      <linearGradient id="fillVelocity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                    <ChartLegend content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#8b5cf6"
                      fill="url(#fillVelocity)"
                      fillOpacity={1}
                    />
                    <Line
                      type="monotone"
                      dataKey="movingAvg"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                  {chartData.creationVelocity.length > 0 && (
                    <>
                      Recent velocity: {chartData.creationVelocity[chartData.creationVelocity.length - 1]?.count || 0} emojis/week
                      <Activity className="h-4 w-4" />
                    </>
                  )}
                </div>
              </CardFooter>
            </Card>
              </div>
            </TabsContent>

            {/* Creators & Community Tab */}
            <TabsContent value="creators" className="space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Creators & Community
                </h2>
                <p className="text-muted-foreground mb-4">Who creates emojis?</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">

            {/* NEW: Top Creators Over Time - Stacked Area Chart */}
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Top Creators Contributions Over Time</CardTitle>
                <CardDescription>Cumulative emoji creation by top 5 contributors</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    ...chartData.topCreatorNames.reduce((acc: Record<string, any>, name, index) => {
                      acc[name] = {
                        label: name,
                        color: COLORS[index % COLORS.length],
                      };
                      return acc;
                    }, {}),
                  }}
                  className="h-[300px] w-full"
                >
                  <AreaChart
                    data={chartData.creatorTimeline}
                    margin={{ left: 12, right: 12, top: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(value: string | number) => {
                        const date = new Date(value);
                        return date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        });
                      }}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend />
                    {chartData.topCreatorNames.map((name, index) => (
                      <Area
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stackId="1"
                        stroke={COLORS[index % COLORS.length]}
                        fill={COLORS[index % COLORS.length]}
                        fillOpacity={0.6}
                      />
                    ))}
                  </AreaChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                  Tracking {chartData.topCreatorNames.length} top creators
                  <Activity className="h-4 w-4" />
                </div>
              </CardFooter>
            </Card>

            {/* New vs Returning Creators */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>New vs Returning Creators</CardTitle>
                <CardDescription>Creator retention and community growth</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    newCreators: {
                      label: "New Creators",
                      color: "#00E396",
                    },
                    returningCreators: {
                      label: "Returning Creators",
                      color: "#008FFB",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <BarChart
                    data={chartData.newVsReturningCreators || []}
                    margin={{ left: 12, right: 12, top: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend />
                    <Bar
                      dataKey="newCreators"
                      stackId="creators"
                      fill="#00E396"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="returningCreators"
                      stackId="creators"
                      fill="#008FFB"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                  {chartData.newVsReturningCreators && chartData.newVsReturningCreators.length > 0 && (
                    <>
                      Latest: {chartData.newVsReturningCreators[chartData.newVsReturningCreators.length - 1]?.newCreators || 0} new, {chartData.newVsReturningCreators[chartData.newVsReturningCreators.length - 1]?.returningCreators || 0} returning
                      <Users className="h-4 w-4" />
                    </>
                  )}
                </div>
              </CardFooter>
            </Card>

            {/* Creator Productivity Distribution */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Creator Productivity Distribution</CardTitle>
                <CardDescription>Number of creators by emoji count</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: {
                      label: "Creators",
                      color: "#775DD0",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <BarChart
                    data={chartData.creatorProductivity || []}
                    margin={{ left: 12, right: 12, top: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="range"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      label={{ value: 'Emojis Created', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      label={{ value: 'Number of Creators', angle: -90, position: 'insideLeft' }}
                    />
                    <ChartTooltip
                      content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                        if (active && payload && payload.length) {
                          return (
                            <ChartTooltipContent>
                              <div className="font-semibold">{payload[0].payload.range} emojis</div>
                              <div className="text-xs text-muted-foreground">
                                {payload[0].value} creators
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Avg: {payload[0].payload.avgCount} emojis
                              </div>
                            </ChartTooltipContent>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#775DD0"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                  Total creators: {chartData.creatorProductivity?.reduce((sum, item) => sum + item.count, 0) || 0}
                  <Activity className="h-4 w-4" />
                </div>
              </CardFooter>
            </Card>
              </div>
            </TabsContent>

            {/* Content & Naming Tab */}
            <TabsContent value="content" className="space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Content & Naming
                </h2>
                <p className="text-muted-foreground mb-4">What do emojis look like?</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">

            {/* Emoji Name Length Distribution */}
            <Card className="md:col-span-2 lg:col-span-2">
              <CardHeader>
                <CardTitle>Name Length Distribution</CardTitle>
                <CardDescription>Tap to see emojis</CardDescription>
              </CardHeader>
              <CardContent className="p-2">
                <ChartContainer
                  className="w-full h-[400px]"
                  config={{
                    count: {
                      label: "",  // Removed label as it's inferred
                      theme: {
                        light: "#82ca9d",
                        dark: "#82ca9d"
                      }
                    }
                  }}
                >
                  <BarChart
                    data={chartData.emojiDistribution}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                    <XAxis
                      dataKey="length"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip
                      content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                        if (active && payload && payload.length) {
                          return (
                            <ChartTooltipContent>
                              <div className="font-semibold">{payload[0].payload.length} characters</div>
                              <div className="text-xs text-muted-foreground">
                                {payload[0].value} emojis
                              </div>
                            </ChartTooltipContent>
                          )
                        }
                        return null
                      }}
                    />
                    <ChartLegend />
                    <Bar
                      dataKey="count"
                      fill="#00E396"
                      radius={[4, 4, 0, 0]}
                      onClick={handleNameLengthClick}
                      cursor="pointer"
                      background={{ fill: 'transparent' }}  // Add transparent background to increase clickable area
                      minPointSize={5}  // Ensure small values have minimum height for visibility
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Average Emoji Name Length Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Average Emoji Name Length Trend</CardTitle>
                <CardDescription>How emoji naming creativity has evolved</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    avgLength: {
                      label: "Avg Characters",
                      color: "#f59e0b",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <AreaChart
                    data={chartData.nameLengthTrend}
                    margin={{ left: 12, right: 12, top: 12 }}
                  >
                    <defs>
                      <linearGradient id="fillNameLength" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip
                      content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                        if (active && payload && payload.length) {
                          const date = payload[0].payload.date;
                          const avgLength = payload[0].payload.avgLength;
                          return (
                            <ChartTooltipContent>
                              <div className="font-semibold">Week of {date}</div>
                              <div className="text-xs text-muted-foreground">
                                Avg: {avgLength} characters
                              </div>
                            </ChartTooltipContent>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgLength"
                      stroke="#f59e0b"
                      fill="url(#fillNameLength)"
                      fillOpacity={1}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                  {chartData.nameLengthTrend.length > 0 && (
                    <>
                      Current avg: {chartData.nameLengthTrend[chartData.nameLengthTrend.length - 1]?.avgLength || 0} characters
                      <Activity className="h-4 w-4" />
                    </>
                  )}
                </div>
              </CardFooter>
            </Card>

            {/* Emoji Type Market Share */}
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Emoji Type Market Share</CardTitle>
                <CardDescription>GIF vs Image distribution over time (percentage)</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    imagePercent: {
                      label: "Static Images",
                      color: "#00E396",
                    },
                    gifPercent: {
                      label: "Animated GIFs",
                      color: "#FF4560",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <AreaChart
                    data={chartData.typePercentages}
                    margin={{ left: 12, right: 12, top: 12 }}
                    stackOffset="expand"
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(value: string | number) => {
                        const date = new Date(value);
                        return date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        });
                      }}
                    />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value: number) => `${Math.round(value * 100)}%`} />
                    <ChartTooltip
                      content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                        if (active && payload && payload.length) {
                          const date = new Date(payload[0].payload.date);
                          const imagePercent = payload[0].payload.imagePercent;
                          const gifPercent = payload[0].payload.gifPercent;
                          return (
                            <ChartTooltipContent>
                              <div className="font-semibold">
                                {date.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </div>
                              <div className="text-xs space-y-1 mt-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#00E396" }} />
                                  <span className="text-muted-foreground">{imagePercent}% images</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#FF4560" }} />
                                  <span className="text-muted-foreground">{gifPercent}% GIFs</span>
                                </div>
                              </div>
                            </ChartTooltipContent>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="imagePercent"
                      stackId="1"
                      stroke="#00E396"
                      fill="#00E396"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="gifPercent"
                      stackId="1"
                      stroke="#FF4560"
                      fill="#FF4560"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                  {chartData.typePercentages.length > 0 && (
                    <>
                      Current: {chartData.typePercentages[chartData.typePercentages.length - 1]?.imagePercent || 0}% images, {chartData.typePercentages[chartData.typePercentages.length - 1]?.gifPercent || 0}% GIFs
                      <TrendingUp className="h-4 w-4" />
                    </>
                  )}
                </div>
              </CardFooter>
            </Card>

            {/* Common Words in Emoji Names - Chart */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle>Common Words in Emoji Names</CardTitle>
                <CardDescription>Most frequently used words in emoji names</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: {
                      label: "Occurrences",
                    },
                    ...chartData.commonWords.reduce((acc: Record<string, any>, item, index) => {
                      acc[item.word] = {
                        label: item.word,
                        color: `hsl(var(--chart-${(index % 8) + 1}))`
                      };
                      return acc;
                    }, {} as Record<string, any>)
                  }}
                  className="h-[300px] max-w-full overflow-hidden"
                >
                  <BarChart
                    accessibilityLayer
                    data={chartData.commonWords.map((item, index) => ({
                      ...item,
                      fill: COLORS[index % COLORS.length]
                    }))}
                    layout="vertical"
                    margin={{
                      left: 10,
                      right: 30,
                      top: 10,
                      bottom: 10
                    }}
                    barSize={20}
                    barGap={4}
                  >
                    <YAxis
                      dataKey="word"
                      type="category"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      width={80}
                      tickFormatter={(value: string) => value.length > 8 ? `${value.substring(0, 7)}...` : value}
                    />
                    <XAxis dataKey="count" type="number" hide />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Bar
                      dataKey="count"
                      layout="vertical"
                      radius={5}
                      onClick={handleWordClick}
                      cursor="pointer"
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                  Top word: {chartData.commonWords[0]?.word || "none"}
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardFooter>
            </Card>

            {/* Common Words Table */}
            <Card className="col-span-1 sm:col-span-2 lg:col-span-2">
              <CardHeader>
                <CardTitle>Word Frequency Analysis</CardTitle>
                <CardDescription>Search and explore emoji word usage across all downloaded data</CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <div className="flex flex-col gap-3 sm:gap-4">
                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search for words across all emoji names..."
                      className="w-full px-3 py-2 border rounded-md border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={selectedWord || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedWord(value || null);
                        if (value) {
                          const matchingEmojis = filteredEmojiData.filter(emoji =>
                            !emoji.is_alias && emoji.name && emoji.name.toLowerCase().includes(value.toLowerCase())
                          ).sort((a, b) => (b.created || 0) - (a.created || 0));
                          setEmojisWithWord(matchingEmojis);
                        } else {
                          setEmojisWithWord([]);
                        }
                      }}
                    />
                    {selectedWord && (
                      <button
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setSelectedWord(null);
                          setEmojisWithWord([]);
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Statistics Bar */}
                  {(() => {
                    const wordData = selectedWord
                      ? getWordFrequenciesForSearch(selectedWord)
                      : chartData.commonWords;
                    const totalWords = wordData.reduce((sum, item) => sum + (item.count as number), 0);
                    const avgLength = wordData.length > 0
                      ? (wordData.reduce((sum, item) => sum + (item.length || 0), 0) / wordData.length).toFixed(1)
                      : '0';

                    return (
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 bg-muted/50 rounded-md">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Unique Words</div>
                          <div className="text-lg font-bold">{wordData.length}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Total Occurrences</div>
                          <div className="text-lg font-bold">{totalWords}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Avg. Length</div>
                          <div className="text-lg font-bold">{avgLength}</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Table */}
                  <div className="border rounded-md overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr] font-medium bg-muted px-3 py-2 text-xs gap-2">
                      <button
                        className="flex items-center gap-1 hover:text-primary transition-colors text-left"
                        onClick={() => {
                          if (wordTableSortBy === 'word') {
                            setWordTableSortDirection(wordTableSortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setWordTableSortBy('word');
                            setWordTableSortDirection('asc');
                          }
                        }}
                      >
                        Word
                        {wordTableSortBy === 'word' && (
                          wordTableSortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                        {wordTableSortBy !== 'word' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </button>
                      <button
                        className="flex items-center justify-end gap-1 hover:text-primary transition-colors"
                        onClick={() => {
                          if (wordTableSortBy === 'count') {
                            setWordTableSortDirection(wordTableSortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setWordTableSortBy('count');
                            setWordTableSortDirection('desc');
                          }
                        }}
                      >
                        Count
                        {wordTableSortBy === 'count' && (
                          wordTableSortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                        {wordTableSortBy !== 'count' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </button>
                      <button
                        className="flex items-center justify-center gap-1 hover:text-primary transition-colors"
                        onClick={() => {
                          if (wordTableSortBy === 'length') {
                            setWordTableSortDirection(wordTableSortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setWordTableSortBy('length');
                            setWordTableSortDirection('desc');
                          }
                        }}
                      >
                        Len
                        {wordTableSortBy === 'length' && (
                          wordTableSortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                        {wordTableSortBy !== 'length' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </button>
                      <button
                        className="flex items-center justify-end gap-1 hover:text-primary transition-colors"
                        onClick={() => {
                          if (wordTableSortBy === 'percentage') {
                            setWordTableSortDirection(wordTableSortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setWordTableSortBy('percentage');
                            setWordTableSortDirection('desc');
                          }
                        }}
                      >
                        %
                        {wordTableSortBy === 'percentage' && (
                          wordTableSortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                        {wordTableSortBy !== 'percentage' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </button>
                      <div className="text-left">Frequency</div>
                    </div>

                    {selectedWord && (
                      <div className="px-3 py-1 text-xs text-muted-foreground bg-accent/50 border-b">
                        Found {getWordFrequenciesForSearch(selectedWord).length} words matching "{selectedWord}"
                      </div>
                    )}

                    <ScrollArea className="h-[300px]">
                      {(() => {
                        const totalEmojiCount = filteredEmojiData.length;
                        let wordData = (selectedWord
                          ? getWordFrequenciesForSearch(selectedWord)
                          : chartData.commonWords
                        ).map(item => ({
                          ...item,
                          percentage: totalEmojiCount > 0 ? ((item.count as number) / totalEmojiCount) * 100 : 0
                        }));

                        // Sort based on current sort settings
                        wordData.sort((a, b) => {
                          let compareValue = 0;
                          switch (wordTableSortBy) {
                            case 'word':
                              compareValue = a.word.localeCompare(b.word);
                              break;
                            case 'count':
                              compareValue = (a.count as number) - (b.count as number);
                              break;
                            case 'percentage':
                              compareValue = a.percentage - b.percentage;
                              break;
                            case 'length':
                              compareValue = (a.length || 0) - (b.length || 0);
                              break;
                          }
                          return wordTableSortDirection === 'asc' ? compareValue : -compareValue;
                        });

                        const maxCount = Math.max(...wordData.map(item => item.count as number), 1);

                        return wordData.map((item) => (
                          <div
                            key={item.word}
                            className={`grid grid-cols-[2fr_1fr_1fr_1fr_2fr] px-3 py-2 text-sm border-t border-border gap-2 items-center transition-colors ${
                              selectedWord === item.word ? 'bg-accent' : 'hover:bg-accent/50'
                            }`}
                            onClick={() => handleWordClick(item)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="font-medium truncate">{item.word}</div>
                            <div className="text-right tabular-nums">{item.count}</div>
                            <div className="text-center text-xs text-muted-foreground">{item.length}</div>
                            <div className="text-right text-xs tabular-nums">{item.percentage.toFixed(1)}%</div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{
                                    width: `${((item.count as number) / maxCount) * 100}%`
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </ScrollArea>
                  </div>
                </div>
              </CardContent>
            </Card>
              </div>
            </TabsContent>
          </Tabs>

        </div>
      </div>
    </div>
  )
}

export default function VisualizationsPageWrapper() {
  return (
    <RequireData>
      <VisualizationsPage />
    </RequireData>
  );
}