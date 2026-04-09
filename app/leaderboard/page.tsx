"use client"

import React, { useState, useCallback, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { useIsClient } from "@/hooks/use-is-client"
import Leaderboard from "@/components/leaderboard"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { useIsMobile } from "@/hooks/use-mobile"
import { getUserLeaderboard } from "@/lib/services/emoji-service"
import UserOverlay, { UserWithEmojiCount } from "@/components/user-overlay"
import { RequireData } from "@/components/require-data"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useTrack } from "@/lib/hooks/use-track"
import { ChromeExtensionHandler } from "@/components/chrome-extension-handler"
import { RefreshButton } from "@/components/refresh-button"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import { LeaderboardShareModal } from "@/components/leaderboard-share-modal"
import { getWorkspaceDisplayName } from "@/lib/utils/workspace"
import { staggerContainer, fadeUp } from "@/lib/motion"

// Use a client-side only component to avoid hydration mismatches
function LeaderboardPage() {
  const track = useTrack();
  const isClient = useIsClient()
  const isMobile = useIsMobile()
  const [dataRefreshKey, setDataRefreshKey] = useState(0)

  useEffect(() => {
    const handleEmojiDataUpdated = () => {
      setDataRefreshKey(prev => prev + 1);
    };

    window.addEventListener('emojiDataUpdated', handleEmojiDataUpdated);
    return () => window.removeEventListener('emojiDataUpdated', handleEmojiDataUpdated);
  }, [])
  const { emojiData, filterByDateRange, loading, workspace, workspaceDisplayName } = useEmojiData()
  const [dateRange, setDateRange] = useState<import("@/components/leaderboard").DateRange>("all")

  const [error, setError] = useState(null)
  const [selectedUser, setSelectedUser] = useState<UserWithEmojiCount | null>(null)
  const [now, setNow] = useState<Date | null>(null)

  const [showInactiveUsers, setShowInactiveUsersState] = useState<boolean>(true)
  const [inactivityThresholdMonths, setInactivityThresholdMonths] = useState<number>(3)
  const [showShareModal, setShowShareModal] = useState(false)

  useEffect(() => {
    setNow(new Date());
    if (typeof window !== 'undefined') {
      const storedThreshold = localStorage.getItem("inactivityThresholdMonths")
      if (storedThreshold) {
        setInactivityThresholdMonths(parseInt(storedThreshold, 10))
      }
    }
  }, []);

  const filteredLeaderboard = useMemo(() => {
    if (!now || !emojiData) return [];
    let filteredEmojis = emojiData;
    if (dateRange === "7days") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredEmojis = filterByDateRange(start, now);
    } else if (dateRange === "30days") {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredEmojis = filterByDateRange(start, now);
    } else if (dateRange === "quarter") {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      filteredEmojis = filterByDateRange(start, now);
    } else if (dateRange === "thisyear") {
      const start = new Date(now.getFullYear(), 0, 1); // January 1st of current year
      filteredEmojis = filterByDateRange(start, now);
    } else if (dateRange === "year") {
      const start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      filteredEmojis = filterByDateRange(start, now);
    }

    let leaderboardData = getUserLeaderboard(filteredEmojis, Math.floor(now.getTime() / 1000));

    if (!showInactiveUsers) {
      const cutoffDate = new Date(now);
      cutoffDate.setMonth(cutoffDate.getMonth() - inactivityThresholdMonths);
      const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

      leaderboardData = leaderboardData.filter(user => {
        return user.most_recent_emoji_timestamp >= cutoffTimestamp;
      });
    }
    return leaderboardData;
  }, [emojiData, dateRange, filterByDateRange, now, showInactiveUsers, inactivityThresholdMonths]);

  const onViewUser = useCallback((user: UserWithEmojiCount) => {
    const userRank = filteredLeaderboard.findIndex((u: UserWithEmojiCount) => u.user_id === user.user_id) + 1;
    setSelectedUser({
      ...user,
      rank: userRank > 0 ? userRank : undefined,
    });
  }, [filteredLeaderboard]);

  const setShowInactiveUsers = (value: boolean) => {
    setShowInactiveUsersState(value);
    track("Leaderboard: Toggle Show Inactive Users", { active: value });
  };

  // Get workspace display name from context
  const workspaceName = getWorkspaceDisplayName(workspaceDisplayName, workspace)

  if (!isClient || !now) return null;
  
  // Show loading skeleton while data is loading
  if (loading && filteredLeaderboard.length === 0) {
    return (
      <div className="flex flex-col gap-4 py-3 sm:gap-5 sm:py-4 md:gap-6 md:py-6">
        <div className="px-3 sm:px-4 lg:px-6">
          <div className="rounded-xl bg-card border border-border shadow-sm p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-7 w-32" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <motion.div
      className={`flex flex-col ${isMobile ? 'pt-4' : 'gap-4'}`}
      key={dataRefreshKey}
      variants={staggerContainer()}
      initial="hidden"
      animate="show"
    >
      <ChromeExtensionHandler />
      
      {/* Mobile Header - Only show on mobile */}
      {!isMobile && (
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border">
          <img
            src="/logo.png"
            alt="Emoji Studio"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg shadow-xs"
          />
          <h1 className="text-lg font-semibold">Leaderboard</h1>
        </div>
      )}

      <div className={isMobile ? '' : 'px-3 sm:px-4 lg:px-6 pt-3 md:pt-6'}>
        {isMobile ? (
          // Mobile: No card wrapper
          <>
            <div className="px-3 pt-4 pb-3 flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">
                Leaderboard
              </h1>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowShareModal(true)}
                  className="h-10 px-6 gap-2 relative bg-background hover:bg-muted text-foreground border border-border shadow-xs"
                  disabled={filteredLeaderboard.length === 0}
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  <span className="font-semibold">Share</span>
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-primary text-primary-foreground rounded-full leading-none">
                    NEW
                  </span>
                </Button>
                <RefreshButton />
              </div>
            </div>
            <Leaderboard
              leaderboard={filteredLeaderboard}
              isLoading={loading}
              error={error}
              onViewUser={onViewUser}
              dateRange={dateRange}
              setDateRange={setDateRange}
              variant="expanded"
              showInactiveUsers={showInactiveUsers}
              setShowInactiveUsers={setShowInactiveUsers}
            />
          </>
        ) : (
          // Desktop: With card wrapper
          <div className="rounded-xl bg-card border border-border shadow-sm p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Leaderboard
              </h2>
              <Button
                onClick={() => setShowShareModal(true)}
                className="h-10 px-12 gap-2 relative bg-background hover:bg-muted text-foreground border border-border shadow-xs"
                disabled={filteredLeaderboard.length === 0}
              >
                <Share2 className="h-4 w-4" />
                <span className="font-semibold">Share</span>
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full leading-none">
                  NEW
                </span>
              </Button>
            </div>
            <Leaderboard
              leaderboard={filteredLeaderboard}
              isLoading={loading}
              error={error}
              onViewUser={onViewUser}
              dateRange={dateRange}
              setDateRange={setDateRange}
              variant="expanded"
              showInactiveUsers={showInactiveUsers}
              setShowInactiveUsers={setShowInactiveUsers}
            />
          </div>
        )}
      </div>
      
      {selectedUser && (
        <UserOverlay
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      <LeaderboardShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        users={filteredLeaderboard}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        workspaceName={workspaceName}
      />
    </motion.div>
  )
}

export default function LeaderboardPageWrapper() {
  return (
    <RequireData>
      <LeaderboardPage />
    </RequireData>
  );
}
