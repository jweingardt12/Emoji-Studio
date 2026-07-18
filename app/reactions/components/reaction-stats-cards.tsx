"use client"

import { cn, trendBadgeColors } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Hash, Crown, TrendingUp, TrendingDown, MessageSquare } from "lucide-react"
import type { ReactionStats } from "@/lib/services/reaction-service"
import { NumberTicker } from "@/components/ui/number-ticker"

interface ReactionStatsCardsProps {
  stats: ReactionStats
  customEmojiUrls: Map<string, string>
  onEmojiClick?: (name: string) => void
  dateRange?: string
}

const PERIOD_LABELS: Record<string, { current: string; previous: string }> = {
  "24h": { current: "Today", previous: "vs yesterday" },
  "7d": { current: "This Week", previous: "vs last week" },
  "30d": { current: "This Month", previous: "vs last month" },
  "90d": { current: "Last 3 Months", previous: "vs previous 3 months" },
}

export function ReactionStatsCards({
  stats,
  customEmojiUrls,
  onEmojiClick,
  dateRange = "7d",
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
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Total Reactions */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Total Reactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums"><NumberTicker value={stats.total_reactions} /></div>
          <CardDescription className="text-xs mt-0.5">
            from {stats.unique_users.toLocaleString()} users
          </CardDescription>
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
          <div className="text-2xl font-bold tabular-nums"><NumberTicker value={stats.unique_emojis} /></div>
          <CardDescription className="text-xs mt-0.5">
            distinct emoji used
          </CardDescription>
        </CardContent>
      </Card>

      {/* Reactions / Message */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Reactions / Message
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">
            {stats.messages_with_reactions > 0
              ? (stats.total_reactions / stats.messages_with_reactions).toFixed(1)
              : "—"}
          </div>
          <CardDescription className="text-xs mt-0.5">
            across {stats.messages_with_reactions.toLocaleString()} messages
          </CardDescription>
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
            <div
              className={`flex items-center gap-2 ${topUrl && onEmojiClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
              onClick={topUrl && onEmojiClick ? () => onEmojiClick(topEmoji.emoji_name) : undefined}
            >
              {topUrl && (
                <img src={topUrl} alt={topEmoji.emoji_name} className="h-7 w-7 object-contain shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">:{topEmoji.emoji_name}:</p>
                <CardDescription className="text-xs">{topEmoji.total_count.toLocaleString()} uses</CardDescription>
              </div>
            </div>
          ) : (
            <span className="text-2xl font-bold tabular-nums">—</span>
          )}
        </CardContent>
      </Card>

      {/* This Week */}
      <Card>
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              {trendPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {PERIOD_LABELS[dateRange]?.current ?? "This Week"}
            </CardTitle>
            <Badge
              variant="secondary"
              className={cn(
                "font-mono text-[11px] px-1.5 py-0.5 h-5",
                trendBadgeColors(trendPositive)
              )}
            >
              {trendPositive ? <TrendingUp className="mr-0.5 h-3 w-3" /> : <TrendingDown className="mr-0.5 h-3 w-3" />}
              {trendPositive ? "+" : ""}{Math.round(weekTrend)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums"><NumberTicker value={thisWeekCount} /></div>
          <CardDescription className="text-xs mt-0.5">
            {PERIOD_LABELS[dateRange]?.previous ?? "vs last week"}
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  )
}
