"use client"

import React, { useState, useEffect, useMemo, Suspense } from "react"
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
import { ChartPieIcon, BarChart3Icon, LineChartIcon, Activity, TrendingUp, Calendar } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart"
import EmojiOverlay from "@/components/emoji-overlay"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Metadata moved to page.metadata.ts


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
  
  // Function to handle click on name length bar
  const handleNameLengthClick = (data: { length: number }) => {
    if (!filteredEmojiData) return
    
    const length = data.length
    const matchingEmojis = filteredEmojiData.filter(emoji => 
      !emoji.is_alias && emoji.name && emoji.name.length === length
    ).sort((a, b) => (b.created || 0) - (a.created || 0)) // Sort by newest first
    
    setSelectedNameLength(length)
    setEmojisWithLength(matchingEmojis)
    setShowEmojiDialog(true)
  }
  
  // Function to handle click on an individual emoji
  const handleEmojiClick = (emoji: typeof emojiData[0]) => {
    // Close any open dialogs first
    setShowEmojiDialog(false)
    setShowWordEmojiDialog(false)
    // Set a small timeout to ensure dialogs are closed before opening the overlay
    setTimeout(() => {
      setSelectedEmoji(emoji)
    }, 50)
  }
  
  // Function to close the emoji overlay
  const handleCloseEmojiOverlay = () => {
    setSelectedEmoji(null)
  }
  
  // Function to handle click on word bar
  const handleWordClick = (data: { word: string }) => {
    if (!filteredEmojiData) return
    
    const word = data.word
    const matchingEmojis = filteredEmojiData.filter(emoji => 
      !emoji.is_alias && emoji.name && emoji.name.toLowerCase().includes(word.toLowerCase())
    ).sort((a, b) => (b.created || 0) - (a.created || 0)) // Sort by newest first
    
    setSelectedWord(word)
    setEmojisWithWord(matchingEmojis)
    setShowWordEmojiDialog(true)
  }
  
  // Function to handle click on date bar
  const handleDateClick = (data: { date: string }) => {
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
  }
  
  // Function to handle type change
  const handleTypeChange = (value: "image" | "gif") => {
    setActiveEmojiType(value)
  }
  
  // Function to generate word frequencies dynamically based on search
  const getWordFrequenciesForSearch = (searchTerm: string) => {
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
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50) // Limit to top 50 results for performance
  }
  
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
      creationVelocity: []
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
    
    // Determine the number of days to show based on time range
    let daysToShow = 90; // default
    if (timeRange === "7days") daysToShow = 7;
    else if (timeRange === "30days") daysToShow = 30;
    else if (timeRange === "90days") daysToShow = 90;
    else if (timeRange === "6months") daysToShow = 180;
    else if (timeRange === "1year") daysToShow = 365;
    else if (timeRange === "all" && filteredEmojiData.length > 0) {
      // For "all time", show data from the oldest emoji to now
      const oldestEmoji = filteredEmojiData
        .filter(e => e.created)
        .sort((a, b) => (a.created || 0) - (b.created || 0))[0];
      if (oldestEmoji && oldestEmoji.created) {
        const oldestDate = new Date(oldestEmoji.created * 1000);
        daysToShow = Math.min(365, differenceInDays(now, oldestDate)); // Cap at 1 year for performance
      }
    }
    
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
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 words
      
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
    const sortedEmojis = [...filteredEmojiData]
      .filter(e => e.created && !e.is_alias)
      .sort((a, b) => (a.created || 0) - (b.created || 0));

    if (sortedEmojis.length > 0) {
      const now = new Date();
      let daysToShow = 90; // default

      if (timeRange === "7days") daysToShow = 7;
      else if (timeRange === "30days") daysToShow = 30;
      else if (timeRange === "90days") daysToShow = 90;
      else if (timeRange === "6months") daysToShow = 180;
      else if (timeRange === "1year") daysToShow = 365;
      else if (timeRange === "all") {
        const oldestDate = new Date(sortedEmojis[0].created! * 1000);
        daysToShow = Math.min(365, Math.ceil((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)));
      }

      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const endTimestamp = endOfDay.getTime() / 1000;

        // Count emojis created up to this date
        const emojisUpToDate = sortedEmojis.filter(e => e.created! <= endTimestamp);
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

    if (sortedEmojis.length > 0) {
      const now = new Date();
      let daysToShow = 90;

      if (timeRange === "7days") daysToShow = 7;
      else if (timeRange === "30days") daysToShow = 30;
      else if (timeRange === "90days") daysToShow = 90;
      else if (timeRange === "6months") daysToShow = 180;
      else if (timeRange === "1year") daysToShow = 365;
      else if (timeRange === "all") {
        const oldestDate = new Date(sortedEmojis[0].created! * 1000);
        daysToShow = Math.min(365, Math.ceil((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)));
      }

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
          const count = sortedEmojis.filter(e =>
            e.created! <= endTimestamp &&
            e.user_display_name?.split(' ')[0] === creatorName
          ).length;
          dataPoint[creatorName] = count;
        });

        // Count "others"
        const othersCount = sortedEmojis.filter(e =>
          e.created! <= endTimestamp &&
          !topCreatorNames.includes(e.user_display_name?.split(' ')[0] || '')
        ).length;
        dataPoint.others = othersCount;

        creatorTimeline.push(dataPoint);
      }
    }

    // Calculate creation velocity (emojis per week with moving average)
    const creationVelocity: Array<{ week: string; count: number; timestamp: number; movingAvg?: number }> = [];
    if (sortedEmojis.length > 0) {
      const now = new Date();
      let weeksToShow = 12; // default to 12 weeks

      if (timeRange === "7days") weeksToShow = 1;
      else if (timeRange === "30days") weeksToShow = 4;
      else if (timeRange === "90days") weeksToShow = 12;
      else if (timeRange === "6months") weeksToShow = 26;
      else if (timeRange === "1year") weeksToShow = 52;
      else if (timeRange === "all") {
        const oldestDate = new Date(sortedEmojis[0].created! * 1000);
        weeksToShow = Math.min(52, Math.ceil((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 7)));
      }

      for (let i = weeksToShow - 1; i >= 0; i--) {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);

        weekStart.setHours(0, 0, 0, 0);
        weekEnd.setHours(23, 59, 59, 999);

        const startTimestamp = weekStart.getTime() / 1000;
        const endTimestamp = weekEnd.getTime() / 1000;

        const weekCount = sortedEmojis.filter(e =>
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
      creationVelocity
    }
  }, [filteredEmojiData, currentTime, timeRange])

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

          {/* Responsive grid of charts */}
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

            {/* Emojis by Day of Week - Half width */}
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

            {/* Emoji Name Length Distribution - Half width */}
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
                  className="h-[220px] max-w-full overflow-hidden"
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
                      top: 5,
                      bottom: 5
                    }}
                    barSize={6}
                    barGap={2}
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
                    <ChartTooltip
                      content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                        if (active && payload && payload.length) {
                          const date = new Date(payload[0].payload.date);
                          const images = payload[0].payload.images;
                          const gifs = payload[0].payload.gifs;
                          const total = payload[0].payload.total;
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
                                  <span className="text-muted-foreground">{images} images</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#FF4560" }} />
                                  <span className="text-muted-foreground">{gifs} GIFs</span>
                                </div>
                                <div className="font-semibold border-t pt-1 mt-1">Total: {total}</div>
                              </div>
                            </ChartTooltipContent>
                          );
                        }
                        return null;
                      }}
                    />
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
                    others: {
                      label: "Others",
                      color: "#94a3b8",
                    },
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
                    <Area
                      type="monotone"
                      dataKey="others"
                      stackId="1"
                      stroke="#94a3b8"
                      fill="#94a3b8"
                      fillOpacity={0.3}
                    />
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

            {/* NEW: Creation Velocity - Gradient Area Chart */}
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
                    <ChartTooltip
                      content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                        if (active && payload && payload.length) {
                          const week = payload[0].payload.week;
                          const count = payload[0].payload.count;
                          const avg = payload[0].payload.movingAvg;
                          return (
                            <ChartTooltipContent>
                              <div className="font-semibold">Week of {week}</div>
                              <div className="text-xs space-y-1 mt-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-sm bg-purple-500" />
                                  <span className="text-muted-foreground">{count} emojis</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-sm bg-cyan-500" />
                                  <span className="text-muted-foreground">{avg} avg</span>
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

            {/* Common Words Table */}
            <Card className="col-span-1 sm:col-span-2 lg:col-span-2">
              <CardHeader>
                <CardTitle>Word Frequency Table</CardTitle>
                <CardDescription>Search and explore emoji word usage across all downloaded data</CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <div className="flex flex-col gap-3 sm:gap-4">
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
                  <div className="border rounded-md overflow-hidden">
                    <div className="grid grid-cols-3 font-medium bg-muted px-3 py-2 text-xs">
                      <div>Word</div>
                      <div className="text-right">Count</div>
                      <div className="text-right">% of Total</div>
                    </div>
                    {selectedWord && (
                      <div className="px-3 py-1 text-xs text-muted-foreground bg-accent/50 border-b">
                        Found {getWordFrequenciesForSearch(selectedWord).length} words matching "{selectedWord}"
                      </div>
                    )}
                    <ScrollArea className="h-[180px]">
                      {(selectedWord
                        ? getWordFrequenciesForSearch(selectedWord)
                        : chartData.commonWords
                      ).map((item, index) => {
                        // Calculate percentage of total emojis
                        const totalEmojiCount = filteredEmojiData.length;
                        const percentage = totalEmojiCount > 0 ? (((item.count as number) / totalEmojiCount) * 100).toFixed(1) : '0.0';
                        
                        return (
                          <div 
                            key={item.word} 
                            className={`grid grid-cols-3 px-3 py-2 text-sm border-t border-border ${selectedWord === item.word ? 'bg-accent' : 'hover:bg-accent/50'}`}
                            onClick={() => handleWordClick(item)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div>{item.word}</div>
                            <div className="text-right">{item.count}</div>
                            <div className="text-right">{percentage}%</div>
                          </div>
                        );
                      })}
                    </ScrollArea>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
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