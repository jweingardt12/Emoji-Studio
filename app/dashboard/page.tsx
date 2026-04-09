"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { useIsClient } from "@/hooks/use-is-client"
import Image from "next/image"
import dynamic from "next/dynamic"
import { staggerContainer, fadeUp } from "@/lib/motion"
const ChartAreaInteractive = dynamic(
  () => import("@/components/chart-area-interactive").then(mod => mod.ChartAreaInteractive),
  { ssr: false, loading: () => <div className="h-[250px] rounded-xl border border-muted/40 bg-card/50 animate-pulse" /> }
)
import { SectionCards } from "@/components/section-cards"

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
import { DashboardUsageSummary } from "@/components/dashboard-usage-summary"
import Leaderboard from "@/components/leaderboard"
import EmojiGrid from "@/components/emoji-grid"
import { Card } from "@/components/ui/card"
import { Trophy, Clock, ArrowRight } from "lucide-react"
import Link from "next/link"

// Use a client-side only component to avoid hydration mismatches
// Metadata moved to page.metadata.ts

function DashboardPage() {
  const isClient = useIsClient()
  const router = useRouter()
  const track = useTrack()

  useEffect(() => {
    // Listen for Chrome extension messages to add emojis from Slackmojis
    const handleExtensionMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin && !event.origin.startsWith('chrome-extension://')) return;

      if (event.data.type === 'EMOJI_STUDIO_ADD_EMOJI') {
        const emojiData = event.data.data;
        if (!emojiData || !emojiData.url || !emojiData.name) {
          return;
        }

        try {
          const createUrl = new URL('/create', window.location.origin);
          createUrl.searchParams.set('from', 'extension');
          window.sessionStorage.setItem('pendingEmojiFromSlackmojis', JSON.stringify({
            imageUrl: emojiData.url,
            originalUrl: emojiData.url,
            name: emojiData.name,
            source: 'slackmojis'
          }));
          window.location.href = createUrl.toString();
        } catch (error) {
        }
      }
    };

    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
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
      <div className="flex flex-col gap-4 md:gap-5 py-3 sm:py-4">
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
    <motion.div
      className="flex flex-col gap-4 md:gap-5 w-full pb-8"
      variants={staggerContainer()}
      initial="hidden"
      animate="show"
    >
      <ChromeExtensionHandler />

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-3 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Emoji Studio"
            width={32}
            height={32}
            className="rounded-lg shadow-xs"
            priority
          />
          <h1 className="text-lg font-semibold">Emoji Studio</h1>
        </div>
        <RefreshButton />
      </div>

      {/* Row 1: Compact Metrics Strip */}
      <motion.div variants={fadeUp} className="px-3 sm:px-4 lg:px-6 pt-2 md:pt-4">
        {loading && !showDemoData ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card border border-border shadow-sm p-3">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <SectionCards />
        )}
      </motion.div>

      {/* Main content: 2-column bento on desktop, stacked on mobile */}
      <motion.div variants={fadeUp} className="px-3 sm:px-4 lg:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 lg:items-start">
          {/* Left column: Chart + Usage Summary */}
          <div className="flex flex-col gap-4">
            {loading && !showDemoData ? (
              <div className="rounded-xl border border-muted/40 bg-card/50 shadow-xs p-4 sm:p-6 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-4">
                  <Skeleton className="h-5 sm:h-6 w-36 sm:w-48" />
                  <Skeleton className="h-7 sm:h-8 w-28 sm:w-32" />
                </div>
                <div className="h-[200px] sm:h-[250px] w-full"><Skeleton className="h-full w-full" /></div>
              </div>
            ) : (
              <ChartAreaInteractive />
            )}
            <DashboardUsageSummary />
          </div>

          {/* Right column: Leaderboard + Recent Emojis (desktop only) */}
          <div className="hidden lg:flex flex-col gap-4">
            <Card className="overflow-hidden py-0 gap-0 rounded-xl">
              <div className="px-4 py-3 border-b border-border/50 bg-muted/30 flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
                  Leaderboard
                </h2>
                <Link href="/leaderboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 -mr-2 rounded-md">
                  View all
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
              <div className="p-0">
                <Leaderboard
                  leaderboard={filteredLeaderboard}
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                  searchQuery={searchQuery}
                  showInactiveUsers={showInactiveUsers}
                  setShowInactiveUsers={setShowInactiveUsers}
                  onViewUser={onViewUser}
                  variant="compact"
                />
              </div>
            </Card>
          </div>
        </div>
      </motion.div>

      {/* Recent Emojis — full width (desktop) */}
      <motion.div variants={fadeUp} className="px-3 sm:px-4 lg:px-6 hidden lg:block">
        <Card className="overflow-hidden py-0 gap-0 rounded-xl">
          <div className="px-4 py-3 border-b border-border/50 bg-muted/30 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
              Recent Emojis
            </h2>
            <Link href="/explorer?sort=newest" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 -mr-2 rounded-md">
              View all
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
          <div className="p-4">
            <EmojiGrid limit={10} />
          </div>
        </Card>
      </motion.div>

      {/* Mobile: Tabbed Content (leaderboard + recent emojis) */}
      <motion.div variants={fadeUp} className="px-3 sm:px-4 lg:hidden">
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
      </motion.div>

      {/* Overlays */}
      <UserOverlay
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onEmojiClick={handleEmojiClickFromUserOverlay}
      />
      <EmojiOverlay
        emoji={selectedEmojiForOverlay}
        onClose={() => setSelectedEmojiForOverlay(null)}
      />
    </motion.div>
  )
}

export default function DashboardPageWrapper() {
  // Always render DashboardPage directly to allow ChromeExtensionHandler to receive synced data
  // The ChromeExtensionHandler will handle loading synced data from the extension
  return <DashboardPage />;
}