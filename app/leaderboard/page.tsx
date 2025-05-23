"use client"

import React, { useState, useCallback, useEffect, useMemo } from "react"
import Leaderboard from "@/components/leaderboard"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { getUserLeaderboard } from "@/lib/services/emoji-service"
import UserOverlay, { UserWithEmojiCount } from "@/components/user-overlay"
import { DashboardOverlay } from "@/components/dashboard-overlay"
import { RequireData } from "@/components/require-data"

// Use a client-side only component to avoid hydration mismatches
function LeaderboardPage() {
  // Add client-side only rendering
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  const { emojiData, filterByDateRange, loading } = useEmojiData()
  const [dateRange, setDateRange] = useState<import("@/components/leaderboard").DateRange>("all")

  const [error, setError] = useState(null)
  const [selectedUser, setSelectedUser] = useState<UserWithEmojiCount | null>(null)
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date());
  }, []);

  const filteredLeaderboard = useMemo(() => {
    if (!now) return [];
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
    // Aggregate leaderboard from filtered emojis
    return getUserLeaderboard(filteredEmojis, Math.floor(now.getTime() / 1000));
  }, [emojiData, dateRange, filterByDateRange, now]);

  const onViewUser = useCallback((user: UserWithEmojiCount) => {
    // Find the user's rank in the leaderboard
    const userRank = filteredLeaderboard.findIndex((u: UserWithEmojiCount) => u.user_id === user.user_id) + 1;
    setSelectedUser({
      ...user,
      rank: userRank > 0 ? userRank : undefined,
    });
  }, [filteredLeaderboard]);

  // Only render when client-side to avoid hydration mismatches
  if (!isClient || !now) return null;
  
  return (
    <>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

        <div className="px-4 lg:px-6">
          <div className="rounded-xl bg-card border border-border shadow p-4">
            <Leaderboard
              leaderboard={filteredLeaderboard}
              isLoading={loading}
              error={error}
              onViewUser={onViewUser}
              dateRange={dateRange}
              setDateRange={setDateRange}
              variant="expanded"
            />
          </div>
        </div>
      </div>
      {selectedUser && (
        <UserOverlay
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
      {/* Dashboard Overlay - shows when no emoji data is loaded */}
      <DashboardOverlay />
    </>
  )
}

export default function LeaderboardPageWrapper() {
  return (
    <RequireData>
      <LeaderboardPage />
    </RequireData>
  );
}
