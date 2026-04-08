"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Activity, Hash, Crown, TrendingUp, TrendingDown } from "lucide-react"
import type { ReactionStats } from "@/lib/services/reaction-service"

interface ReactionStatsCardsProps {
  stats: ReactionStats
  customEmojiUrls: Map<string, string>
}

export function ReactionStatsCards({
  stats,
  customEmojiUrls,
}: ReactionStatsCardsProps) {
  if (stats.total_reactions === 0) return null

  const topEmoji = stats.top_reactions[0]
  const topUrl = topEmoji ? customEmojiUrls.get(topEmoji.emoji_name) : undefined

  // Compute week-over-week trend
  const thisWeekCount = stats.trending.reduce((sum, t) => sum + t.recent_count, 0)
  const lastWeekCount = stats.trending.reduce((sum, t) => sum + t.previous_count, 0)
  const weekTrend = lastWeekCount > 0
    ? ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100
    : thisWeekCount > 0 ? 100 : 0
  const trendPositive = weekTrend >= 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Total Reactions */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Total Reactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_reactions.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            from {stats.unique_users.toLocaleString()} users
          </p>
        </CardContent>
      </Card>

      {/* Unique Emojis */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            Unique Emojis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.unique_emojis.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            distinct emoji used
          </p>
        </CardContent>
      </Card>

      {/* Most Popular */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5" />
            Most Popular
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topEmoji ? (
            <div className="flex items-center gap-2">
              {topUrl && (
                <img src={topUrl} alt={topEmoji.emoji_name} className="h-7 w-7 object-contain shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">:{topEmoji.emoji_name}:</p>
                <p className="text-xs text-muted-foreground">{topEmoji.total_count.toLocaleString()} uses</p>
              </div>
            </div>
          ) : (
            <span className="text-2xl font-bold">—</span>
          )}
        </CardContent>
      </Card>

      {/* This Week */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            {trendPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{thisWeekCount.toLocaleString()}</div>
          <p className={`text-xs mt-0.5 ${trendPositive ? "text-green-500" : "text-red-500"}`}>
            {trendPositive ? "+" : ""}{Math.round(weekTrend)}% vs last week
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
