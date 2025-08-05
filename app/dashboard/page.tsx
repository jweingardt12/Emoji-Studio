"use client"

import { useState, useEffect } from "react"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards } from "@/components/section-cards"
import Leaderboard from "@/components/leaderboard"
import EmojiGrid from "@/components/emoji-grid"
import UserOverlay, { UserWithEmojiCount } from "@/components/user-overlay"
import EmojiOverlay from "@/components/emoji-overlay"
import { RequireData } from "@/components/require-data"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { getUserLeaderboard, type Emoji } from "@/lib/services/emoji-service"
import React, { useCallback } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Trophy, Search } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { LoadingOverlay } from "@/components/loading-overlay"
import { ChromeExtensionHandler } from "@/components/chrome-extension-handler"

// Use a client-side only component to avoid hydration mismatches
// Metadata moved to page.metadata.ts

function DashboardPage() {
  // Add client-side only rendering
  const [isClient, setIsClient] = useState(false)
  const [dataRefreshKey, setDataRefreshKey] = useState(0)
  const [pageVisible, setPageVisible] = useState(false)
  const [waitingForData, setWaitingForData] = useState(true)
  // Sync loading is now handled by ChromeExtensionHandler
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    setIsClient(true)
    
    // The ChromeExtensionHandler now handles sync progress in real-time
    // Remove old URL parameter handling as it's been replaced by real sync progress messages
    
    // Trigger fade in animation after a short delay
    const timer = setTimeout(() => {
      setPageVisible(true)
    }, 100)
    return () => clearTimeout(timer)
    
    // Listen for emoji data updates to force re-render
    const handleEmojiDataUpdated = () => {
      console.log('Dashboard: emojiDataUpdated event received, forcing re-render');
      setDataRefreshKey(prev => prev + 1);
      
      // Sync loading is now handled by ChromeExtensionHandler
      
      // Also refresh the page visible state to trigger animations
      setPageVisible(false);
      setTimeout(() => setPageVisible(true), 100);
    };
    
    // Listen for Chrome extension messages to add emojis from Slackmojis
    const handleExtensionMessage = async (event: MessageEvent) => {
      if (event.data.type === 'EMOJI_STUDIO_ADD_EMOJI') {
        console.log('[Dashboard] Received add emoji request from extension:', event.data);
        
        const emojiData = event.data.data;
        if (!emojiData || !emojiData.url || !emojiData.name) {
          console.error('[Dashboard] Invalid emoji data received:', emojiData);
          return;
        }
        
        try {
          // Navigate to create page with the emoji data
          const createUrl = new URL('/create', window.location.origin);
          createUrl.searchParams.set('from', 'extension');
          
          // Store the emoji data temporarily so the create page can pick it up
          window.sessionStorage.setItem('pendingEmojiFromSlackmojis', JSON.stringify({
            imageUrl: emojiData.url,
            originalUrl: emojiData.url,
            name: emojiData.name,
            source: 'slackmojis'
          }));
          
          // Navigate to create page
          window.location.href = createUrl.toString();
        } catch (error) {
          console.error('[Dashboard] Failed to process emoji from extension:', error);
        }
      }
    };
    
    window.addEventListener('emojiDataUpdated', handleEmojiDataUpdated);
    window.addEventListener('message', handleExtensionMessage);
    
    return () => {
      window.removeEventListener('emojiDataUpdated', handleEmojiDataUpdated);
      window.removeEventListener('message', handleExtensionMessage);
    };
  }, [])
  const { 
    emojiData, 
    filterByDateRange, 
    loading, 
    hasRealData, 
    userLeaderboard,
    demoChartData,
    useDemoData
  } = useEmojiData()
  const [dateRange, setDateRange] = useState<import("@/components/leaderboard").DateRange>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showInactiveUsers, setShowInactiveUsers] = useState(true)

  const [error, setError] = useState(null)
  const [selectedUser, setSelectedUser] = useState<UserWithEmojiCount | null>(null)
  const [selectedEmojiForOverlay, setSelectedEmojiForOverlay] = useState<Emoji | null>(null)

  // Determine if we should show demo data
  const showDemoData = React.useMemo(() => {
    return !hasRealData || emojiData.length === 0
  }, [emojiData, hasRealData])

  // Compute filtered leaderboard based on dateRange
  const filteredLeaderboard = React.useMemo(() => {
    // If showing demo data, use the userLeaderboard from the hook
    if (showDemoData) {
      return userLeaderboard || [];
    }

    let filteredEmojis = emojiData;
    const now = new Date();
    if (dateRange === "7days") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredEmojis = filterByDateRange(start, now);
    } else if (dateRange === "30days") {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredEmojis = filterByDateRange(start, now);
    } else if (dateRange === "quarter") {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      filteredEmojis = filterByDateRange(start, now);

    }
    // Aggregate leaderboard from filtered emojis
    return getUserLeaderboard(filteredEmojis, Math.floor(Date.now() / 1000));
  }, [emojiData, dateRange, filterByDateRange, showDemoData, userLeaderboard])
  
  // Create onViewUser function after filteredLeaderboard is defined
  const onViewUser = useCallback((user: UserWithEmojiCount) => {
    // Find the user's rank in the leaderboard
    const userRank = filteredLeaderboard.findIndex((u: UserWithEmojiCount) => u.user_id === user.user_id) + 1;
    
    // Add rank to the user object
    setSelectedUser({
      ...user,
      rank: userRank > 0 ? userRank : undefined
    })
  }, [filteredLeaderboard])

  // Handler for clicking an emoji within UserOverlay
  const handleEmojiClickFromUserOverlay = useCallback((emoji: Emoji) => {
    setSelectedUser(null); // Close UserOverlay
    setSelectedEmojiForOverlay(emoji); // Open EmojiOverlay
  }, []);

  // Height sync logic (must come after filteredLeaderboard/ loading)
  const leaderboardRef = React.useRef<HTMLDivElement>(null)
  const emojiGridRef = React.useRef<HTMLDivElement>(null)
  const [emojiGridHeight, setEmojiGridHeight] = React.useState<number | undefined>(undefined)
  React.useEffect(() => {
    if (leaderboardRef.current) {
      setEmojiGridHeight(leaderboardRef.current.offsetHeight)
    }
  }, [filteredLeaderboard, loading])

  // Check for data after a delay
  useEffect(() => {
    if (isClient && !loading) {
      // Wait 2 seconds for extension data to arrive
      const timeout = setTimeout(() => {
        const hasAnyData = hasRealData || useDemoData;
        if (!hasAnyData) {
          console.log('Dashboard: No data available after wait, redirecting to settings');
          router.replace('/settings');
        } else {
          setWaitingForData(false);
        }
      }, 2000);
      
      // If data arrives before timeout, cancel the redirect
      if (hasRealData || useDemoData) {
        clearTimeout(timeout);
        setWaitingForData(false);
      }
      
      return () => clearTimeout(timeout);
    }
  }, [isClient, loading, hasRealData, useDemoData, router])

  // Only render when client-side to avoid hydration mismatches
  if (!isClient) return null;
  
  return (
    <div className={`flex flex-col gap-3 py-2 sm:gap-4 sm:py-4 md:gap-6 md:py-6 transition-all duration-700 ${
      pageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`} key={dataRefreshKey}>
      <ChromeExtensionHandler />
      <div className="px-2 sm:px-4 lg:px-6"></div>
      {/* SectionCards with skeleton */}
      {loading && !showDemoData ? (
        <div className="px-2 sm:px-4 lg:px-6">
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 lg:px-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card border border-border shadow p-3 sm:p-4 flex flex-col gap-2">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="h-3 sm:h-4 w-20 sm:w-24 mb-1 sm:mb-2"><Skeleton className="h-full w-full" /></span>
                      <span className="h-5 sm:h-6 w-28 sm:w-32"><Skeleton className="h-full w-full" /></span>
                    </div>
                    <Skeleton className="h-5 sm:h-6 w-10 sm:w-12" />
                  </div>
                  <Skeleton className="h-6 sm:h-8 w-full mt-2" />
                </div>
                <div className="flex gap-2 mt-3 sm:mt-4">
                  <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                  <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-2 sm:px-4 lg:px-6">
          <SectionCards />
        </div>
      )}
      {/* ChartAreaInteractive with skeleton */}
      <div className="px-2 sm:px-4 lg:px-6">
        {loading && !showDemoData ? (
          <div className="rounded-xl bg-card border border-border shadow p-3 sm:p-4 flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
              <Skeleton className="h-5 sm:h-6 w-36 sm:w-48" />
              <Skeleton className="h-7 sm:h-8 w-28 sm:w-32" />
            </div>
            <Skeleton className="h-7 sm:h-8 w-32 sm:w-40 mb-2" />
            <div className="h-[200px] sm:h-[250px] w-full"><Skeleton className="h-full w-full" /></div>
          </div>
        ) : (
          <ChartAreaInteractive />
        )}
      </div>
      {/* Side-by-side layout for Leaderboard and EmojiGrid */}
      <div className="px-2 sm:px-4 lg:px-6">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-6 lg:mb-8">
          {/* Compact Leaderboard */}
          <div className="w-full lg:basis-[40%] lg:max-w-[40%] flex-shrink-0 mb-4 lg:mb-0">
            <div
              ref={leaderboardRef}
              className="rounded-xl bg-card border border-border shadow p-3 sm:p-4 h-full flex flex-col"
            >
              <div className="px-3 pt-3 pb-2 flex flex-col gap-1">
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  <Link href="/leaderboard" className="focus:outline-none cursor-pointer hover:opacity-80">
                    <span className="border-b border-dotted border-muted-foreground">Leaderboard</span>
                  </Link>
                </h2>
                <div className="text-muted-foreground text-sm mt-1">
                  Top emoji creators ranked by total count. Click a user to see details.
                </div>
                <div className="flex items-center justify-between mt-2 mb-2">
                  <div className="flex items-center space-x-1">
                    <Label htmlFor="dashboard-inactive-toggle" className="text-xs text-muted-foreground cursor-pointer">
                      Show inactive
                    </Label>
                    <Switch
                      id="dashboard-inactive-toggle"
                      checked={showInactiveUsers}
                      onCheckedChange={setShowInactiveUsers}
                      className="scale-75 data-[state=checked]:bg-primary/80"
                      aria-label="Show inactive users toggle"
                    />
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="w-full pl-9"
                  />
                </div>
              </div>
              {loading && !showDemoData ? (
                <div>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 sm:gap-3 py-1 sm:py-2">
                      <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-3 sm:h-4 w-20 sm:w-24 mb-1" />
                        <Skeleton className="h-2 sm:h-3 w-12 sm:w-16" />
                      </div>
                      <Skeleton className="h-3 sm:h-4 w-8 sm:w-10" />
                    </div>
                  ))}
                </div>
              ) : (
                <Leaderboard
                  leaderboard={filteredLeaderboard}
                  isLoading={loading && !showDemoData}
                  error={error}
                  onViewUser={onViewUser}
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                  variant="compact"
                  showDemoData={showDemoData}
                  searchQuery={searchQuery}
                  showInactiveUsers={showInactiveUsers}
                  setShowInactiveUsers={setShowInactiveUsers}
                />
              )}
            </div>
          </div>
          {/* Emoji Grid */}
          <div className="w-full lg:basis-[60%] lg:max-w-[60%] flex-1 min-w-0">
            <div
              ref={emojiGridRef}
              className="rounded-xl bg-card border border-border shadow p-3 sm:p-4 h-full flex flex-col"
            >
              {loading && !showDemoData ? (
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6 p-2 sm:p-3 md:p-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-16 sm:h-18 sm:w-18 md:h-20 md:w-20 rounded bg-muted" />
                  ))}
                </div>
              ) : (
                <EmojiGrid />
              )}
            </div>
          </div>
        </div>
      </div>
      {/* User Overlay */}
      <UserOverlay 
        user={selectedUser} 
        onClose={() => setSelectedUser(null)} 
        onEmojiClick={handleEmojiClickFromUserOverlay}
      />
      {/* Emoji Overlay */}
      <EmojiOverlay
        emoji={selectedEmojiForOverlay}
        onClose={() => setSelectedEmojiForOverlay(null)}
      />
      
      {/* ChromeExtensionHandler now handles sync loading overlay */}
    </div>
  )
}

export default function DashboardPageWrapper() {
  // Always render DashboardPage directly to allow ChromeExtensionHandler to receive synced data
  // The ChromeExtensionHandler will handle loading synced data from the extension
  return <DashboardPage />;
}