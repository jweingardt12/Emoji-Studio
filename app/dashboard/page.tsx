"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import dynamic from "next/dynamic"

import { DashboardTabbedContent } from "@/components/dashboard-tabbed-content"
import UserOverlay, { UserWithEmojiCount } from "@/components/user-overlay"
import EmojiOverlay from "@/components/emoji-overlay"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { getUserLeaderboard, type Emoji } from "@/lib/services/emoji-service"
import React, { useCallback } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { ChromeExtensionHandler } from "@/components/chrome-extension-handler"
import { RefreshButton } from "@/components/refresh-button"
import { useTrack } from "@/lib/hooks/use-track"
import {
  DashboardHeroSkeleton,
  DashboardChartSkeleton,
  DashboardTabbedContentSkeleton,
  EmptyStateEmojis,
} from "@/components/dashboard-loading-states"

// Lazy load heavy chart components (recharts bundle)
const ChartAreaInteractive = dynamic(
  () => import("@/components/chart-area-interactive").then(mod => ({ default: mod.ChartAreaInteractive })),
  { loading: () => <DashboardChartSkeleton /> }
)
const SectionCards = dynamic(
  () => import("@/components/section-cards").then(mod => ({ default: mod.SectionCards })),
  { loading: () => <DashboardHeroSkeleton /> }
)

// Use a client-side only component to avoid hydration mismatches
// Metadata moved to page.metadata.ts

function DashboardPage() {
  // Add client-side only rendering
  const [isClient, setIsClient] = useState(false)
  const [pageVisible, setPageVisible] = useState(false)
  // Sync loading is now handled by ChromeExtensionHandler
  const router = useRouter()
  const track = useTrack()

  useEffect(() => {
    setIsClient(true)

    // The ChromeExtensionHandler now handles sync progress in real-time
    // Remove old URL parameter handling as it's been replaced by real sync progress messages

    // Trigger fade in animation after a short delay
    const timer = setTimeout(() => {
      setPageVisible(true)
    }, 100)

    // Listen for emoji data updates to force re-render
    const handleEmojiDataUpdated = () => {
      // Sync loading is now handled by ChromeExtensionHandler

      // Refresh the page visible state to trigger animations
      setPageVisible(false);
      setTimeout(() => setPageVisible(true), 100);
    };

    // Listen for Chrome extension messages to add emojis from Slackmojis
    const handleExtensionMessage = async (event: MessageEvent) => {
      if (event.data.type === 'EMOJI_STUDIO_ADD_EMOJI') {
        const emojiData = event.data.data;
        if (!emojiData || !emojiData.url || !emojiData.name) {
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
          console.error('Failed to handle extension emoji:', error)
        }
      }
    };

    window.addEventListener('emojiDataUpdated', handleEmojiDataUpdated);
    window.addEventListener('message', handleExtensionMessage);

    return () => {
      clearTimeout(timer);
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
    useDemoData
  } = useEmojiData()
  const [dateRange, setDateRange] = useState<import("@/components/leaderboard").DateRange>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showInactiveUsers, setShowInactiveUsers] = useState(true)

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
    const userWithRank = {
      ...user,
      rank: userRank > 0 ? userRank : undefined
    }
    setSelectedUser(userWithRank)
  }, [filteredLeaderboard])

  // Handler for clicking an emoji within UserOverlay
  const handleEmojiClickFromUserOverlay = useCallback((emoji: Emoji) => {
    setSelectedUser(null); // Close UserOverlay
    setSelectedEmojiForOverlay(emoji); // Open EmojiOverlay
  }, []);

  // Check for data after a delay
  useEffect(() => {
    if (isClient && !loading) {
      // Check if we're syncing - if so, wait longer
      const urlParams = new URLSearchParams(window.location.search);
      const isSyncing = urlParams.get('syncStarting') === 'true';
      const waitTime = isSyncing ? 10000 : 2000; // 10 seconds if syncing, 2 seconds otherwise

      const timeout = setTimeout(() => {
        const hasAnyData = hasRealData || useDemoData;
        if (!hasAnyData) {
          router.replace('/settings');
        }
      }, waitTime);

      // If data arrives before timeout, cancel the redirect
      if (hasRealData || useDemoData) {
        clearTimeout(timeout);
      }

      return () => clearTimeout(timeout);
    }
  }, [isClient, loading, hasRealData, useDemoData, router])

  // Track dashboard view once data is ready
  const hasTrackedDashboard = useRef(false)
  useEffect(() => {
    if (isClient && hasRealData && !hasTrackedDashboard.current) {
      hasTrackedDashboard.current = true
      track('dashboard:viewed', {
        emoji_count: emojiData.length,
        has_data: hasRealData,
      })
    }
  }, [isClient, hasRealData, emojiData.length, track])

  // Only render when client-side to avoid hydration mismatches
  if (!isClient) return null;

  // Show loading skeletons while data is loading
  if (loading && !hasRealData && !useDemoData) {
    return (
      <div className="flex flex-col gap-4 py-3 sm:gap-5 sm:py-4 md:gap-6 md:py-6">
        <div className="px-3 sm:px-4 lg:px-6">
          <DashboardHeroSkeleton />
        </div>
        <div className="px-3 sm:px-4 lg:px-6">
          <DashboardChartSkeleton />
        </div>
        <div className="px-3 sm:px-4 lg:px-6">
          <DashboardTabbedContentSkeleton />
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (!loading && !hasRealData && !useDemoData && emojiData.length === 0) {
    return (
      <div className="flex flex-col gap-4 py-3 sm:gap-5 sm:py-4 md:gap-6 md:py-6">
        <div className="px-3 sm:px-4 lg:px-6">
          <EmptyStateEmojis />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full pb-8">
      <ChromeExtensionHandler />

      {/* Mobile Header - Only show on mobile */}
      <div className="md:hidden flex items-center justify-between px-3 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Emoji Studio"
            width={32}
            height={32}
            className="rounded-lg shadow-sm"
            priority
          />
          <h1 className="text-lg font-semibold">Emoji Studio</h1>
        </div>
        <RefreshButton />
      </div>

      {/* Hero Metrics Section - Staggered animation delay: 0ms */}
      <div className={`px-3 sm:px-4 lg:px-6 pt-4 md:pt-8 transition-all duration-700 ${pageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
        {loading && !showDemoData ? (
          <div className="grid grid-cols-1 gap-4">
            {/* Primary metric skeleton */}
            <div className="rounded-xl bg-card border border-border shadow p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-32 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
            {/* Secondary metrics skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-card border border-border shadow p-4">
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <SectionCards />
        )}
      </div>

      {/* ChartAreaInteractive with skeleton - Staggered animation delay: 150ms */}
      <div className={`px-3 sm:px-4 lg:px-6 transition-all duration-700 delay-150 ${pageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
        {loading && !showDemoData ? (
          <div className="rounded-xl border border-muted/40 bg-card/50 shadow-sm p-4 sm:p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-4">
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
      {/* Tabbed Content for Mobile, Side-by-side for Desktop - Staggered animation delay: 300ms */}
      <div className={`px-3 sm:px-4 lg:px-6 transition-all duration-700 delay-300 ${pageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
        <DashboardTabbedContent
          filteredLeaderboard={filteredLeaderboard}
          dateRange={dateRange}
          searchQuery={searchQuery}
          showInactiveUsers={showInactiveUsers}
          onViewUser={onViewUser}
          onEmojiClick={setSelectedEmojiForOverlay}
          setDateRange={setDateRange}
          setSearchQuery={setSearchQuery}
          setShowInactiveUsers={setShowInactiveUsers}
        />
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