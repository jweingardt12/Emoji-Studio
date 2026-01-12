"use client"

import React, { useState, useEffect, useCallback, Suspense, lazy } from "react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Activity, Calendar, ChartPieIcon, FileText, Users, Loader2 } from "lucide-react"
import EmojiOverlay from "@/components/emoji-overlay"
import { useVisualizationData, TimeRange } from "./use-visualization-data"

// Dynamic imports for heavy visualization components
const OverviewTab = lazy(() => import("./tabs/overview-tab").then(module => ({ default: module.OverviewTab })))
const ActivityTab = lazy(() => import("./tabs/activity-tab").then(module => ({ default: module.ActivityTab })))
const CreatorsTab = lazy(() => import("./tabs/creators-tab").then(module => ({ default: module.CreatorsTab })))
const ContentTab = lazy(() => import("./tabs/content-tab").then(module => ({ default: module.ContentTab })))

// Loading component for tab transitions
const TabLoading = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    <span className="ml-2 text-muted-foreground">Loading visualization...</span>
  </div>
)

// Helper to format date for display
const format = (date: Date | number, formatStr: string) => {
  const d = typeof date === 'number' ? new Date(date * 1000) : date
  if (formatStr === 'MMM d, yyyy') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  if (formatStr === 'h:mm a') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return d.toISOString()
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

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
  { value: "90days", label: "Last 90 Days" },
  { value: "6months", label: "Last 6 Months" },
  { value: "1year", label: "Last Year" },
]

export default function VisualizationsPage() {
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

  const { emojiData } = useEmojiData()

  // Use the optimized hook for data processing
  const { filteredEmojiData, chartData } = useVisualizationData(emojiData, timeRange)

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
    setShowDateEmojiDialog(false)
    // Set a small timeout to ensure dialogs are closed before opening the overlay
    setTimeout(() => {
      setSelectedEmoji(emoji)
    }, 50)
  }, [])

  // Function to close the emoji overlay
  const handleCloseEmojiOverlay = useCallback(() => {
    setSelectedEmoji(null)
  }, [])

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
              <Suspense fallback={<TabLoading />}>
                <OverviewTab
                  chartData={chartData}
                  timeRange={timeRange}
                  activeEmojiType={activeEmojiType}
                  handleTypeChange={handleTypeChange}
                  handleDateClick={handleDateClick}
                  isClient={isClient}
                  timeRangeOptions={timeRangeOptions}
                />
              </Suspense>
            </TabsContent>

            {/* Activity Patterns Tab */}
            <TabsContent value="activity" className="space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2 duration-300">
              <Suspense fallback={<TabLoading />}>
                <ActivityTab chartData={chartData} isClient={isClient} />
              </Suspense>
            </TabsContent>

            {/* Creators & Community Tab */}
            <TabsContent value="creators" className="space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2 duration-300">
              <Suspense fallback={<TabLoading />}>
                <CreatorsTab chartData={chartData} />
              </Suspense>
            </TabsContent>

            {/* Content & Naming Tab */}
            <TabsContent value="content" className="space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2 duration-300">
              <Suspense fallback={<TabLoading />}>
                <ContentTab chartData={chartData} handleNameLengthClick={handleNameLengthClick} />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}