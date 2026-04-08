"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ReactionStats } from "@/lib/services/reaction-service"

interface ReactionStatsCardsProps {
  stats: ReactionStats
  customEmojiUrls: Map<string, string>
}

function EmojiDisplay({
  name,
  customEmojiUrls,
}: {
  name: string
  customEmojiUrls: Map<string, string>
}) {
  const url = customEmojiUrls.get(name)
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={`:${name}:`} className="w-7 h-7 object-contain" />
    )
  }
  return null
}

export function ReactionStatsCards({
  stats,
  customEmojiUrls,
}: ReactionStatsCardsProps) {
  if (stats.total_reactions === 0) return null

  const topEmoji = stats.top_reactions[0]

  // Compute "this week" count from trending recent_count sum as proxy
  const thisWeekCount = stats.trending.reduce(
    (sum, t) => sum + t.recent_count,
    0
  )
  const thisWeekTrend =
    stats.trending.length > 0
      ? stats.trending.reduce((sum, t) => sum + t.change_percent, 0) /
        stats.trending.length
      : 0

  const cards = [
    {
      title: "Total Reactions",
      value: stats.total_reactions.toLocaleString(),
      sub: `${stats.unique_users.toLocaleString()} unique users`,
    },
    {
      title: "Unique Emojis",
      value: stats.unique_emojis.toLocaleString(),
      sub: "distinct emoji used",
    },
    {
      title: "Most Popular",
      value: topEmoji ? (
        <div className="flex items-center gap-2">
          <EmojiDisplay name={topEmoji.emoji_name} customEmojiUrls={customEmojiUrls} />
          <span className="truncate">:{topEmoji.emoji_name}:</span>
        </div>
      ) : (
        "—"
      ),
      sub: topEmoji
        ? `${topEmoji.total_count.toLocaleString()} uses`
        : undefined,
    },
    {
      title: "This Week",
      value: thisWeekCount.toLocaleString(),
      sub:
        thisWeekTrend !== 0
          ? `${thisWeekTrend > 0 ? "+" : ""}${Math.round(thisWeekTrend)}% vs prior period`
          : "no trend data",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`font-bold leading-none ${typeof card.value === 'string' ? 'text-2xl' : 'text-base'}`}>
              {card.value}
            </div>
            {card.sub && (
              <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
