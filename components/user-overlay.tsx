"use client"
import { X, TrendingUp, PieChart, Calendar, Info, ChartNoAxesCombined, ImageUp, ArrowLeft  } from "lucide-react"
import { useState, useEffect, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import { format } from "date-fns"
import { CartesianGrid, Line, LineChart, XAxis, ResponsiveContainer, LabelList } from "recharts"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import type { Emoji } from "@/lib/services/emoji-service"
import { useAnalytics } from "@/lib/analytics"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-mobile"

export type UserWithEmojiCount = {
  user_id: string
  user_display_name: string
  emoji_count: number
  l4wepw?: number
  most_recent_emoji_timestamp?: number
  rank?: number // User's position on the leaderboard
}

interface UserOverlayProps {
  user: UserWithEmojiCount | null
  onClose: () => void
  onEmojiClick?: (emoji: Emoji) => void
}

export default function UserOverlay({ user, onClose, onEmojiClick }: UserOverlayProps) {
  const { emojiData, loading: globalLoading } = useEmojiData()
  const analytics = useAnalytics()
  const isMobile = useIsMobile()
  // Start with opacity-0 and scale-95 for proper entrance animation
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Get user's emojis from the global emoji data, filtering out aliases
  const userEmojis = useMemo(() => {
    if (!user) return []
    return emojiData
      .filter((emoji) => emoji.user_id === user.user_id && emoji.is_alias === 0) // Filter out aliases
      .sort((a, b) => b.created - a.created) // Sort by newest first
  }, [emojiData, user])

  // Chart view mode: 'monthly' or 'weekly'
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("monthly")

  // Generate day of week distribution data for radar chart
  const getDayOfWeekDistributionData = () => {
    if (!userEmojis.length) return []
    
    // Initialize counts for all days of the week with abbreviated names for better display
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const dayCounts = dayNames.map(day => ({ day, emojiCount: 0 }))
    
    // Count emojis by day of week
    userEmojis.forEach(emoji => {
      const date = new Date(emoji.created * 1000)
      const dayOfWeek = date.getDay() // 0-6, where 0 is Sunday
      dayCounts[dayOfWeek].emojiCount++
    })
    
    return dayCounts
  }

  // Generate chart data for all-time emoji activity by month or week
  // Compute chart data and moving average for weekly view
  const chartData = useMemo(() => {
    if (!user || userEmojis.length === 0) return []
    const oldestEmoji = [...userEmojis].sort((a, b) => a.created - b.created)[0]
    const oldestDate = new Date(oldestEmoji.created * 1000)
    const now = new Date()

    if (viewMode === "monthly") {
      // Monthly chart logic (as before)
      const monthDiff = (now.getFullYear() - oldestDate.getFullYear()) * 12 + (now.getMonth() - oldestDate.getMonth())
      const monthlyData = []
      const maxMonths = Math.min(monthDiff + 1, 24)
      const startMonth = maxMonths === 24 ? monthDiff - 23 : 0
      for (let i = startMonth; i <= monthDiff; i++) {
        const monthDate = new Date(oldestDate.getFullYear(), oldestDate.getMonth() + i, 1)
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
        const startTimestamp = Math.floor(monthStart.getTime() / 1000)
        const endTimestamp = Math.floor(monthEnd.getTime() / 1000)
        const count = userEmojis.filter(
          (emoji) => emoji.created >= startTimestamp && emoji.created <= endTimestamp,
        ).length
        monthlyData.push({
          label: format(monthDate, "MMM yy"),
          count,
          date: monthDate,
        })
      }
      return monthlyData
    } else {
      // Weekly chart logic: generate all weeks from oldest to latest, including zero-count weeks
      const weekData = []
      // Find the start of the week for the oldest emoji
      const weekStart = new Date(oldestDate)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Set to Sunday
      // Find the start of the week for the latest emoji
      const latestEmoji = [...userEmojis].sort((a, b) => b.created - a.created)[0]
      const weekEnd = new Date(latestEmoji.created * 1000)
      weekEnd.setDate(weekEnd.getDate() - weekEnd.getDay()) // Set to Sunday
      // Calculate number of weeks between
      const totalWeeks = Math.floor((weekEnd.getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
      for (let i = 0; i < totalWeeks; i++) {
        const currentWeek = new Date(weekStart.getTime() + i * 7 * 24 * 60 * 60 * 1000)
        const weekBegin = new Date(currentWeek)
        const weekFinish = new Date(currentWeek)
        weekFinish.setDate(weekFinish.getDate() + 6)
        const startTimestamp = Math.floor(weekBegin.getTime() / 1000)
        const endTimestamp = Math.floor(weekFinish.getTime() / 1000)
        const count = userEmojis.filter(
          (emoji) => emoji.created >= startTimestamp && emoji.created <= endTimestamp,
        ).length
        weekData.push({
          label: format(weekBegin, "MMM d"),
          count,
          date: weekBegin,
          movingAvg: 0,
        })
      }
      // Calculate 4-week moving average
      const movingAvgWindow = 4
      for (let i = 0; i < weekData.length; i++) {
        let sum = 0
        let n = 0
        for (let j = Math.max(0, i - movingAvgWindow + 1); j <= i; j++) {
          sum += weekData[j].count
          n++
        }
        weekData[i].movingAvg = sum / n
      }
      return weekData
    }
  }, [user, userEmojis, viewMode])

  // Mount effect for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Animation effect
  useEffect(() => {
    if (user) {
      if (isMobile) {
        // For mobile, use drawer state
        setIsDrawerOpen(true)
      } else {
        // For desktop, use the existing overlay logic
        const originalBodyOverflow = document.body.style.overflow
        const originalHtmlOverflow = document.documentElement.style.overflow
        const scrollY = window.scrollY
        
        // Lock body at current scroll position
        document.body.style.overflow = 'hidden'
        document.documentElement.style.overflow = 'hidden'
        document.body.style.position = 'fixed'
        document.body.style.top = `-${scrollY}px`
        document.body.style.width = '100%'
        
        setIsVisible(true)
        setIsLoading(false)
        
        // Cleanup: restore scroll properties
        return () => {
          const body = document.body
          const scrollY = Math.abs(parseInt(body.style.top || '0'))
          
          body.style.overflow = originalBodyOverflow
          document.documentElement.style.overflow = originalHtmlOverflow
          body.style.position = ''
          body.style.top = ''
          body.style.width = ''
          
          // Restore scroll position
          window.scrollTo(0, scrollY)
        }
      }

      // Track user profile view
      if (user.user_id && user.user_display_name) {
        analytics.trackUserProfileView(user.user_display_name)
      }
    } else {
      setIsVisible(false)
      setIsDrawerOpen(false)
    }
  }, [user, analytics, isMobile])
  
  // Handle drawer close - only trigger onClose if drawer was previously open
  const wasDrawerOpen = useRef(false)
  useEffect(() => {
    if (isMobile && user) {
      if (isDrawerOpen) {
        wasDrawerOpen.current = true
      } else if (wasDrawerOpen.current) {
        // Drawer was open and is now closed, trigger onClose
        onClose()
        wasDrawerOpen.current = false
      }
    }
  }, [isDrawerOpen, isMobile, user, onClose])

  // Handle overlay close with animation
  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 300) // Match transition duration
  }

  if (!user) return null
  
  // Shared content component
  const OverlayContent = () => (
    <>
      <div className="p-4 pb-20">
        <div className="grid grid-cols-1 gap-4">
          <div className={`border border-border rounded-lg ${isMobile ? "p-4" : "p-3"}`}>
            <div className={`font-bold ${isMobile ? "text-lg mb-3" : "text-base mb-2"} flex items-center`}>
              <ChartNoAxesCombined className={`${isMobile ? "h-5 w-5 mr-2" : "h-4 w-4 mr-1"} text-muted-foreground`} />
              Stats
            </div>
            <div className={`grid grid-cols-3 ${isMobile ? "gap-4" : "gap-3"}`}>
              <div className={`bg-primary/10 ${isMobile ? "p-3" : "p-2"} rounded-md text-center`}>
                <div className={`${isMobile ? "text-xs" : "text-xs"} text-muted-foreground font-semibold tracking-widest`}>TOTAL EMOJIS</div>
                <div className={`${isMobile ? "text-2xl" : "text-2xl"} font-bold`}>{user.emoji_count}</div>
              </div>
              <div className={`bg-primary/10 ${isMobile ? "p-3" : "p-2"} rounded-md text-center`}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className={`${isMobile ? "text-xs" : "text-xs"} text-muted-foreground font-semibold tracking-widest flex items-center justify-center`}>
                          EPW
                          <Info className={`ml-1 ${isMobile ? "h-3.5 w-3.5" : "h-3 w-3"} text-muted-foreground opacity-70`} />
                        </div>
                        <div className={`${isMobile ? "text-2xl" : "text-2xl"} font-bold`}>{user.l4wepw?.toFixed(2) ?? "-"}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-sm">
                        <span className="font-semibold">Emojis Per Week</span> - Average number of emojis created per week over the last 4 weeks.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className={`bg-primary/10 ${isMobile ? "p-3" : "p-2"} rounded-md text-center`}>
                <div className={`${isMobile ? "text-xs" : "text-xs"} text-muted-foreground font-semibold tracking-widest`}>RANK</div>
                <div className={`${isMobile ? "text-2xl" : "text-2xl"} font-bold`}>
                  {user.rank ? 
                    <>#{user.rank}</> : 
                    "-"}
                </div>
              </div>
            </div>
          </div>

          <div className={`border border-border rounded-lg ${isMobile ? "p-4" : "p-3"}`}>
            <div className={`font-bold ${isMobile ? "text-lg mb-3" : "text-base mb-2"} flex items-center`}>
              <ImageUp className={`${isMobile ? "h-4 w-4 mr-1" : "h-4 w-4 mr-1"} text-muted-foreground`} />
              Recent Emojis
            </div>
            {globalLoading || isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
              </div>
            ) : (
              <div className={`grid ${isMobile ? "grid-cols-3 gap-3" : "grid-cols-4 gap-1"}`}>
                {userEmojis.slice(0, isMobile ? 6 : 8).map((emoji: Emoji) => (
                  <div
                    key={emoji.name}
                    className={`flex flex-col items-center bg-muted/40 rounded ${isMobile ? "p-3" : "p-2"} ${onEmojiClick ? "cursor-pointer hover:bg-muted transition-colors active:scale-95" : ""}`}
                    onClick={() => {
                      if (onEmojiClick) {
                        analytics.trackEmojiView(emoji.name, user?.user_display_name || "")
                        onEmojiClick(emoji)
                      }
                    }}
                  >
                    {emoji.url ? (
                      <img
                        src={emoji.url || "/placeholder.svg"}
                        alt={`:${emoji.name}:`}
                        className={`${isMobile ? "h-10 w-10 mb-2" : "h-6 w-6 mb-1"} object-contain`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = `/placeholder.svg?height=128&width=128&query=${emoji.name}%20emoji`
                        }}
                      />
                    ) : (
                      <div className={`${isMobile ? "h-10 w-10 mb-2" : "h-6 w-6 mb-1"} flex items-center justify-center bg-muted rounded text-xs`}>
                        {emoji.name.slice(0, 2)}
                      </div>
                    )}
                    <span className={`${isMobile ? "text-sm" : "text-xs"} font-medium truncate ${isMobile ? "max-w-[80px]" : "max-w-[52px]"}`}>{emoji.name}</span>
                    <p className={`${isMobile ? "text-xs" : "text-[10px]"} text-muted-foreground`}>
                      {format(new Date(emoji.created * 1000), isMobile ? "MMM d" : "MMM d, yyyy")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chart Cards in a grid layout */}
        <div className={`grid grid-cols-1 ${isMobile ? "gap-4 mt-4" : "md:grid-cols-2 gap-4 mt-6"}`}>
          {/* Line Chart Card */}
          <Card className="border shadow-none w-full">
            <CardHeader className="py-3 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-base">
                  <TrendingUp className="h-4 w-4 mr-1 text-muted-foreground" />
                  {viewMode === "monthly" ? "Monthly" : "Weekly"} Emoji Activity
                </CardTitle>
                <div className="flex gap-2">
                  <button
                    className={`${isMobile ? "px-3 py-1.5" : "px-2 py-1"} rounded ${isMobile ? "text-sm" : "text-xs"} font-medium border ${viewMode === "monthly" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}
                    onClick={() => {
                      setViewMode("monthly")
                      analytics.trackEmojiFilter("chart_view", "monthly")
                    }}
                  >
                    Monthly
                  </button>
                  <button
                    className={`${isMobile ? "px-3 py-1.5" : "px-2 py-1"} rounded ${isMobile ? "text-sm" : "text-xs"} font-medium border ${viewMode === "weekly" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}
                    onClick={() => {
                      setViewMode("weekly")
                      analytics.trackEmojiFilter("chart_view", "weekly")
                    }}
                  >
                    Weekly
                  </button>
                </div>
              </div>
              <CardDescription className="text-xs mt-1">
                {chartData.length > 0
                  ? `${format(new Date(chartData[0].date), viewMode === "monthly" ? "MMMM yyyy" : "MMM d, yyyy")} - ${format(new Date(chartData[chartData.length - 1].date), viewMode === "monthly" ? "MMMM yyyy" : "MMM d, yyyy")}`
                  : "All Time Activity"}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 py-0">
              {chartData.length > 0 ? (
                <div className={`${isMobile ? "h-[200px]" : "h-[220px]"} w-full px-4 pt-2 pb-4`}>
                  <ChartContainer
                    config={{
                      count: {
                        label: viewMode === "weekly" ? "Weekly Count" : "Emojis Created",
                        color: "hsl(var(--chart-1))",
                      },
                      ...(viewMode === "weekly"
                        ? {
                            movingAvg: {
                              label: "4-week Moving Avg",
                              color: "hsl(var(--chart-2))",
                            },
                          }
                        : {}),
                    }}
                    className="h-full w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{
                          top: 5,
                          right: 20,
                          left: 20,
                          bottom: 5
                        }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                          height={30}
                          interval={viewMode === "weekly" ? "preserveStartEnd" : "preserveStart"}
                          minTickGap={viewMode === "weekly" ? 40 : 30}
                          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                          tickFormatter={(label: string, index: number): string => {
                            if (index === 0 || index === chartData.length - 1) {
                              return String(label ?? "")
                            }
                            if (viewMode === "weekly" && chartData.length > 12) {
                              return index % 4 === 0 ? String(label ?? "") : ""
                            }
                            if (viewMode === "monthly") {
                              return index % 2 === 0 ? String(label ?? "") : ""
                            }
                            return String(label ?? "")
                          }}
                        />
                        <ChartTooltip 
                          cursor={false} 
                          content={(props: any) => {
                            const { active, payload } = props as { active?: boolean; payload?: any[] };
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const date = data.date;
                              
                              const formattedDate = date ? 
                                format(new Date(date), viewMode === "monthly" ? "MMM yyyy" : "MMM d, yyyy") : '';
                              
                              return (
                                <div className="bg-card border border-border rounded-md shadow-md p-2">
                                  <div className="text-xs text-muted-foreground">{formattedDate}</div>
                                  {payload.map((entry: any, index: number) => (
                                    <div key={`item-${index}`} className="font-semibold text-sm">
                                      {entry.dataKey === "count" ? 
                                        `${entry.value} emojis` : 
                                        `${typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value} avg`}
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line
                          dataKey="count"
                          type="natural"
                          stroke="var(--color-count)"
                          strokeWidth={2}
                          dot={viewMode === "monthly" ? { fill: "hsl(var(--primary))" } : false}
                          activeDot={viewMode === "monthly" ? { r: 6 } : { r: 4, fill: "hsl(var(--primary))" }}
                          name="Emoji Count"
                          animationDuration={700}
                        >
                          {viewMode === "monthly" && (
                            <LabelList
                              position="top"
                              offset={12}
                              className="fill-foreground"
                              fontSize={12}
                            />
                          )}
                        </Line>
                        {viewMode === "weekly" && (
                          <Line
                            dataKey="movingAvg"
                            type="natural"
                            stroke="var(--color-movingAvg)"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={false}
                            name="4-week Moving Avg"
                            animationDuration={700}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No chart data available
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Radar Chart Card */}
          <Card className="border shadow-none w-full">
            <CardHeader className="py-3 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-base">
                  <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                  Weekly Pattern
                </CardTitle>
              </div>
              <CardDescription className="text-xs mt-1">
                Emoji creation by day of week
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 py-0">
              {userEmojis.length > 0 ? (
                <div className={`${isMobile ? "h-[200px]" : "h-[220px]"} w-full px-2 pt-2 pb-4 flex items-center justify-center`}>
                  <ChartContainer
                    config={{
                      emojiCount: {
                        label: "Emoji Count",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="aspect-square h-full max-w-[220px]"
                  >
                    <RadarChart 
                      data={getDayOfWeekDistributionData()} 
                      outerRadius={65} 
                      startAngle={90} 
                      endAngle={-270}
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                      <PolarAngleAxis 
                        dataKey="day" 
                        tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                        cy={5}
                      />
                      <PolarGrid 
                        stroke="hsl(var(--border))" 
                        strokeOpacity={0.6} 
                        gridType="polygon"
                      />
                      <Radar
                        dataKey="emojiCount"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.4}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        isAnimationActive={true}
                        dot={{
                          r: 4,
                          fill: 'hsl(var(--primary))',
                          stroke: 'white',
                          strokeWidth: 1,
                        }}
                        activeDot={{
                          r: 6,
                          stroke: 'hsl(var(--primary))',
                          strokeWidth: 2,
                          fill: 'white'
                        }}
                        animationDuration={700}
                      />
                    </RadarChart>
                  </ChartContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No chart data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
  
  // For mobile, use Drawer component
  if (isMobile) {
    return (
      <Drawer open={isDrawerOpen} onOpenChange={(open) => {
        setIsDrawerOpen(open)
        if (!open) {
          onClose()
        }
      }}>
        <DrawerContent className="h-[95vh]">
          {/* Mobile Header */}
          <div className="sticky top-0 z-10 bg-card border-b border-border">
            <div className="flex flex-row items-center justify-between gap-3 p-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  // Animate the drawer closing
                  const drawer = document.querySelector('[data-vaul-drawer]')
                  if (drawer) {
                    drawer.classList.add('animate-out')
                  }
                  setTimeout(() => {
                    setIsDrawerOpen(false)
                  }, 150)
                }} 
                className="h-10 w-10"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back</span>
              </Button>
              <div className="flex-1 text-center">
                <span className="text-base font-semibold">{user.user_display_name.split(" ")[0]}'s Emojis</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10"
                onClick={() => {
                  analytics.trackEmojiFilter("user_id", user.user_id);
                  window.location.href = `/explorer?search=${encodeURIComponent(user.user_id)}`;
                }}
              >
                <ImageUp className="h-5 w-5" />
                <span className="sr-only">Show all emojis</span>
              </Button>
            </div>
          </div>
          
          <div className="overflow-y-auto">
            <OverlayContent />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }


  // Desktop overlay (existing code)
  const overlayContent = (
    <div
      className={`fixed inset-0 z-[9999] transition-all duration-300 ease-out bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 ${isVisible ? "opacity-100" : "opacity-0"}`}
      onClick={handleClose}
    >
      <div
        className={`bg-card border border-border shadow-lg w-full overflow-y-auto transition-all duration-300 ease-out rounded-xl max-w-5xl max-h-[85vh] ${
          isVisible ? "scale-100" : "scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Site Header inside overlay - Desktop only */}
        <div className="relative border-b border-border">
          <div className="flex flex-row items-center justify-between gap-3 p-3 pb-2">
            <>
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Emoji Dashboard Logo" className="h-8 w-8 rounded-lg shadow-md" />
                  <span className="text-lg font-semibold">Emoji Studio</span>
                  <span className="text-2xl font-light text-muted-foreground mx-2">|</span>
                  <span className="text-base font-semibold">{user.user_display_name.split(" ")[0]}'s Emojis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-2 text-xs"
                    onClick={() => {
                      analytics.trackEmojiFilter("user_id", user.user_id);
                      window.location.href = `/explorer?search=${encodeURIComponent(user.user_id)}`;
                    }}
                  >
                    <ImageUp className="h-3.5 w-3.5 mr-1" />
                    Show all emojis
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>
              </>
          </div>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="border border-border rounded-lg p-3">
              <div className="font-bold text-base mb-2 flex items-center">
                <ChartNoAxesCombined className="h-4 w-4 mr-1 text-muted-foreground" />
                Stats
              </div>
              <div className={`grid grid-cols-3 ${isMobile ? "gap-4" : "gap-3"}`}>
                <div className={`bg-primary/10 ${isMobile ? "p-3" : "p-2"} rounded-md text-center`}>
                  <div className={`${isMobile ? "text-xs" : "text-xs"} text-muted-foreground font-semibold tracking-widest`}>TOTAL EMOJIS</div>
                  <div className={`${isMobile ? "text-2xl" : "text-2xl"} font-bold`}>{user.emoji_count}</div>
                </div>
                <div className={`bg-primary/10 ${isMobile ? "p-3" : "p-2"} rounded-md text-center`}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <div className={`${isMobile ? "text-xs" : "text-xs"} text-muted-foreground font-semibold tracking-widest flex items-center justify-center`}>
                            EPW
                            <Info className={`ml-1 ${isMobile ? "h-3.5 w-3.5" : "h-3 w-3"} text-muted-foreground opacity-70`} />
                          </div>
                          <div className={`${isMobile ? "text-2xl" : "text-2xl"} font-bold`}>{user.l4wepw?.toFixed(2) ?? "-"}</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-sm">
                          <span className="font-semibold">Emojis Per Week</span> - Average number of emojis created per week over the last 4 weeks.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className={`bg-primary/10 ${isMobile ? "p-3" : "p-2"} rounded-md text-center`}>
                  <div className={`${isMobile ? "text-xs" : "text-xs"} text-muted-foreground font-semibold tracking-widest`}>RANK</div>
                  <div className={`${isMobile ? "text-3xl" : "text-2xl"} font-bold`}>
                    {user.rank ? 
                      <>#{user.rank}</> : 
                      "-"}
                  </div>
                </div>
              </div>
            </div>

            <div className={`border border-border rounded-lg ${isMobile ? "p-4" : "p-3"}`}>
              <div className={`font-bold ${isMobile ? "text-base mb-2" : "text-base mb-2"} flex items-center`}>
                <ImageUp className={`${isMobile ? "h-4 w-4 mr-1" : "h-4 w-4 mr-1"} text-muted-foreground`} />
                Recent Emojis
              </div>
              {globalLoading || isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
                </div>
              ) : (
                <div className={`grid ${isMobile ? "grid-cols-3 gap-3" : "grid-cols-4 gap-1"}`}>
                  {userEmojis.slice(0, isMobile ? 6 : 8).map((emoji: Emoji) => (
                    <div
                      key={emoji.name}
                      className={`flex flex-col items-center bg-muted/40 rounded ${isMobile ? "p-3" : "p-2"} ${onEmojiClick ? "cursor-pointer hover:bg-muted transition-colors active:scale-95" : ""}`}
                      onClick={() => {
                        if (onEmojiClick) {
                          // Track emoji click from user profile
                          analytics.trackEmojiView(emoji.name, user?.user_display_name || "")
                          onEmojiClick(emoji)
                        }
                      }}
                    >
                      {emoji.url ? (
                        <img
                          src={emoji.url || "/placeholder.svg"}
                          alt={`:${emoji.name}:`}
                          className={`${isMobile ? "h-10 w-10 mb-2" : "h-6 w-6 mb-1"} object-contain`}
                          onError={(e) => {
                            // Fallback to placeholder on error
                            const target = e.target as HTMLImageElement
                            target.src = `/placeholder.svg?height=128&width=128&query=${emoji.name}%20emoji`
                          }}
                        />
                      ) : (
                        <div className={`${isMobile ? "h-10 w-10 mb-2" : "h-6 w-6 mb-1"} flex items-center justify-center bg-muted rounded text-xs`}>
                          {emoji.name.slice(0, 2)}
                        </div>
                      )}
                      <span className={`${isMobile ? "text-sm" : "text-xs"} font-medium truncate ${isMobile ? "max-w-[80px]" : "max-w-[52px]"}`}>{emoji.name}</span>
                      <p className={`${isMobile ? "text-xs" : "text-[10px]"} text-muted-foreground`}>
                        {format(new Date(emoji.created * 1000), isMobile ? "MMM d" : "MMM d, yyyy")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chart Cards in a grid layout */}
          <div className={`grid grid-cols-1 ${isMobile ? "gap-4 mt-4" : "md:grid-cols-2 gap-4 mt-6"}`}>
            {/* Line Chart Card */}
            <Card className="border shadow-none w-full">
              <CardHeader className="py-3 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-base">
                    <TrendingUp className="h-4 w-4 mr-1 text-muted-foreground" />
                    {viewMode === "monthly" ? "Monthly" : "Weekly"} Emoji Activity
                  </CardTitle>
                  <div className="flex gap-2">
                    <button
                      className={`${isMobile ? "px-2 py-1" : "px-2 py-1"} rounded ${isMobile ? "text-xs" : "text-xs"} font-medium border ${viewMode === "monthly" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}
                      onClick={() => {
                        setViewMode("monthly")
                        // Track filter change
                        analytics.trackEmojiFilter("chart_view", "monthly")
                      }}
                    >
                      Monthly
                    </button>
                    <button
                      className={`${isMobile ? "px-2 py-1" : "px-2 py-1"} rounded ${isMobile ? "text-xs" : "text-xs"} font-medium border ${viewMode === "weekly" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}
                      onClick={() => {
                        setViewMode("weekly")
                        // Track filter change
                        analytics.trackEmojiFilter("chart_view", "weekly")
                      }}
                    >
                      Weekly
                    </button>
                  </div>
                </div>
                <CardDescription className="text-xs mt-1">
                  {chartData.length > 0
                    ? `${format(new Date(chartData[0].date), viewMode === "monthly" ? "MMMM yyyy" : "MMM d, yyyy")} - ${format(new Date(chartData[chartData.length - 1].date), viewMode === "monthly" ? "MMMM yyyy" : "MMM d, yyyy")}`
                    : "All Time Activity"}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 py-0">
                {chartData.length > 0 ? (
                  <div className={`${isMobile ? "h-[200px]" : "h-[220px]"} w-full px-4 pt-2 pb-4`}>
                    <ChartContainer
                      config={{
                        count: {
                          label: viewMode === "weekly" ? "Weekly Count" : "Emojis Created",
                          color: "hsl(var(--chart-1))",
                        },
                        ...(viewMode === "weekly"
                          ? {
                              movingAvg: {
                                label: "4-week Moving Avg",
                                color: "hsl(var(--chart-2))",
                              },
                            }
                          : {}),
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{
                            top: 5,
                            right: 20,
                            left: 20,
                            bottom: 5
                          }}
                        >
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            height={30}
                            interval={viewMode === "weekly" ? "preserveStartEnd" : "preserveStart"}
                            minTickGap={viewMode === "weekly" ? 40 : 30}
                            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                            tickFormatter={(label: string, index: number): string => {
                              // Ensure we always show the first and last label for better context
                              if (index === 0 || index === chartData.length - 1) {
                                return String(label ?? "")
                              }
                              if (viewMode === "weekly" && chartData.length > 12) {
                                // For weekly view with many data points, show fewer labels
                                return index % 4 === 0 ? String(label ?? "") : ""
                              }
                              if (viewMode === "monthly") {
                                // For monthly view, show every other month
                                return index % 2 === 0 ? String(label ?? "") : ""
                              }
                              return String(label ?? "")
                            }}
                          />
                          <ChartTooltip 
                            cursor={false} 
                            content={(props: any) => {
                              const { active, payload } = props as { active?: boolean; payload?: any[] };
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const date = data.date;
                                
                                // Format date differently based on view mode
                                const formattedDate = date ? 
                                  format(new Date(date), viewMode === "monthly" ? "MMM yyyy" : "MMM d, yyyy") : '';
                                
                                return (
                                  <div className="bg-card border border-border rounded-md shadow-md p-2">
                                    <div className="text-xs text-muted-foreground">{formattedDate}</div>
                                    {payload.map((entry: any, index: number) => (
                                      <div key={`item-${index}`} className="font-semibold text-sm">
                                        {entry.dataKey === "count" ? 
                                          `${entry.value} emojis` : 
                                          `${typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value} avg`}
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line
                            dataKey="count"
                            type="natural"
                            stroke="var(--color-count)"
                            strokeWidth={2}
                            dot={viewMode === "monthly" ? { fill: "hsl(var(--primary))" } : false}
                            activeDot={viewMode === "monthly" ? { r: 6 } : { r: 4, fill: "hsl(var(--primary))" }}
                            name="Emoji Count"
                            animationDuration={700}
                          >
                            {viewMode === "monthly" && (
                              <LabelList
                                position="top"
                                offset={12}
                                className="fill-foreground"
                                fontSize={12}
                              />
                            )}
                          </Line>
                          {/* Moving average line for weekly view */}
                          {viewMode === "weekly" && (
                            <Line
                              dataKey="movingAvg"
                              type="natural"
                              stroke="var(--color-movingAvg)"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                              activeDot={false}
                              name="4-week Moving Avg"
                              animationDuration={700}
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No chart data available
                  </div>
                )}

              </CardContent>
            </Card>
            
            {/* Radar Chart Card */}
            <Card className="border shadow-none w-full">
              <CardHeader className="py-3 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-base">
                    <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                    Weekly Pattern
                  </CardTitle>
                </div>
                <CardDescription className="text-xs mt-1">
                  Emoji creation by day of week
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 py-0">
                {userEmojis.length > 0 ? (
                  <div className={`${isMobile ? "h-[200px]" : "h-[220px]"} w-full px-2 pt-2 pb-4 flex items-center justify-center`}>
                    <ChartContainer
                      config={{
                        emojiCount: {
                          label: "Emoji Count",
                          color: "hsl(var(--primary))",
                        },
                      }}
                      className="aspect-square h-full max-w-[220px]"
                    >
                      <RadarChart 
                        data={getDayOfWeekDistributionData()} 
                        outerRadius={65} 
                        startAngle={90} 
                        endAngle={-270}
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                      >
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <PolarAngleAxis 
                          dataKey="day" 
                          tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          tickLine={false}
                          cy={5}
                        />
                        <PolarGrid 
                          stroke="hsl(var(--border))" 
                          strokeOpacity={0.6} 
                          gridType="polygon"
                        />
                        <Radar
                          dataKey="emojiCount"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.4}
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          isAnimationActive={true}
                          dot={{
                            r: 4,
                            fill: 'hsl(var(--primary))',
                            stroke: 'white',
                            strokeWidth: 1,
                          }}
                          activeDot={{
                            r: 6,
                            stroke: 'hsl(var(--primary))',
                            strokeWidth: 2,
                            fill: 'white'
                          }}
                          animationDuration={700}
                        />
                      </RadarChart>
                    </ChartContainer>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No chart data available
                  </div>
                )}

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )

  // Use portal to render outside of normal DOM hierarchy
  // Only render portal after component is mounted to avoid SSR issues
  if (!mounted) return null
  return createPortal(overlayContent, document.body)
} 