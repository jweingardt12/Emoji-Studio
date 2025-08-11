"use client"

import React, { useState, useCallback, useEffect, useMemo } from "react"
import Leaderboard from "@/components/leaderboard"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { useIsMobile } from "@/hooks/use-mobile"
import { getUserLeaderboard } from "@/lib/services/emoji-service"
import UserOverlay, { UserWithEmojiCount } from "@/components/user-overlay"
import { RequireData } from "@/components/require-data"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { openpanel } from "@/lib/safe-openpanel"
import { ChromeExtensionHandler } from "@/components/chrome-extension-handler"
import { Skeleton } from "@/components/ui/skeleton";

// Use a client-side only component to avoid hydration mismatches
function LeaderboardPage() {
  // Add client-side only rendering
  const [isClient, setIsClient] = useState(false)
  const isMobile = useIsMobile()
  const [pageVisible, setPageVisible] = useState(false)
  const [dataRefreshKey, setDataRefreshKey] = useState(0)
  
  useEffect(() => {
    setIsClient(true)
    
    // Trigger fade in animation after a short delay
    const timer = setTimeout(() => {
      setPageVisible(true)
    }, 100)
    
    // Listen for emoji data updates to force re-render
    const handleEmojiDataUpdated = () => {
      setDataRefreshKey(prev => prev + 1);
      
      // Also refresh the page visible state to trigger animations
      setPageVisible(false);
      setTimeout(() => setPageVisible(true), 100);
    };
    
    window.addEventListener('emojiDataUpdated', handleEmojiDataUpdated);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('emojiDataUpdated', handleEmojiDataUpdated);
    };
  }, [])
  const { emojiData, filterByDateRange, loading } = useEmojiData()
  const [dateRange, setDateRange] = useState<import("@/components/leaderboard").DateRange>("all")

  const [error, setError] = useState(null)
  const [selectedUser, setSelectedUser] = useState<UserWithEmojiCount | null>(null)
  const [now, setNow] = useState<Date | null>(null)

  const [showInactiveUsers, setShowInactiveUsersState] = useState<boolean>(true)
  const [inactivityThresholdMonths, setInactivityThresholdMonths] = useState<number>(3)

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
    openpanel.track("Leaderboard: Toggle Show Inactive Users", { active: value });
  };

  if (!isClient || !now) return null;
  
  // Show loading skeleton while data is loading
  if (loading && filteredLeaderboard.length === 0) {
    return (
      <div className="flex flex-col gap-4 py-3 sm:gap-5 sm:py-4 md:gap-6 md:py-6">
        <div className="px-3 sm:px-4 lg:px-6">
          <div className="rounded-xl bg-card border border-border shadow p-3 sm:p-4">
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
    <div className={`flex flex-col ${isMobile ? 'pt-4' : 'gap-4'} transition-all duration-700 ${
      pageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`} key={dataRefreshKey}>
      <ChromeExtensionHandler />
      
      {/* Mobile Header - Only show on mobile */}
      {!isMobile && (
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border">
          <img 
            src="/logo.png" 
            alt="Emoji Studio" 
            className="h-8 w-8 rounded-lg shadow-sm"
          />
          <h1 className="text-lg font-semibold">Leaderboard</h1>
        </div>
      )}

      <div className={isMobile ? '' : 'px-3 sm:px-4 lg:px-6 pt-3 md:pt-6'}>
        {isMobile ? (
          // Mobile: No card wrapper
          <>
            <div className="px-3 pt-4 pb-3">
              <h1 className="text-2xl font-bold tracking-tight">
                Leaderboard
              </h1>
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
          <div className="rounded-xl bg-card border border-border shadow p-3 sm:p-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 sm:mb-4">
              Leaderboard
            </h2>
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
    </div>
  )
}

export default function LeaderboardPageWrapper() {
  return (
    <RequireData>
      <LeaderboardPage />
    </RequireData>
  );
}
