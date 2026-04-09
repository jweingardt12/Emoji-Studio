"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Activity, ArrowRight, BarChart3, Users, Hash } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useReactionCache } from "@/lib/hooks/use-reaction-cache"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"

const BAR_COLORS = [
  "bg-[hsl(var(--chart-1))]",
  "bg-[hsl(var(--chart-2))]",
  "bg-[hsl(var(--chart-4))]",
  "bg-[hsl(var(--chart-3))]",
  "bg-[hsl(var(--chart-5))]",
]

function TopReactionBar({ name, count, maxCount, imageUrl, rank }: {
  name: string
  count: number
  maxCount: number
  imageUrl?: string
  rank: number
}) {
  const width = Math.max(8, Math.round((count / maxCount) * 100))

  return (
    <div className="group flex items-center gap-3 rounded-lg px-1 -mx-1 transition-colors hover:bg-muted/50">
      <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`:${name}:`}
            width={24}
            height={24}
            loading="lazy"
            className="w-6 h-6 object-contain rounded-sm group-hover:scale-110 transition-transform duration-200"
          />
        ) : (
          <span className="text-[10px] font-mono text-muted-foreground">:{name.slice(0, 3)}:</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium truncate max-w-[140px]">:{name}:</span>
          <span className="text-xs tabular-nums text-muted-foreground ml-2 font-medium">
            {count.toLocaleString()}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${BAR_COLORS[rank % BAR_COLORS.length]}`}
            style={{ width: `${width}%` }}
            role="meter"
            aria-label={`${name}: ${count} reactions`}
            aria-valuenow={count}
            aria-valuemin={0}
            aria-valuemax={maxCount}
          />
        </div>
      </div>
    </div>
  )
}

function StatItem({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex-1 lg:flex-none">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold tabular-nums tracking-tight">{value}</p>
    </div>
  )
}

export function DashboardUsageSummary() {
  const { reactionStats, hasData, loading } = useReactionCache()
  const { emojiData } = useEmojiData()

  const emojiUrls = useMemo(() => {
    const map = new Map<string, string>()
    for (const emoji of emojiData) {
      if (emoji.url && !emoji.is_alias) map.set(emoji.name, emoji.url)
    }
    return map
  }, [emojiData])

  if (loading) return null

  // No scan data — show CTA
  if (!hasData) {
    return (
      <Card className="border-dashed border-muted-foreground/20 hover:border-muted-foreground/30 transition-colors">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2.5">
              <Activity className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-balance">See how your emojis are used</p>
              <p className="text-xs text-muted-foreground text-pretty">
                Scan Slack channels to discover reaction patterns.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href="/reactions">
              Scan Channels
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const topReactions = reactionStats?.top_reactions.slice(0, 5) ?? []
  const maxCount = topReactions[0]?.total_count ?? 1

  return (
    <Card className="overflow-hidden group/card hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Emoji Usage
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2 opacity-60 group-hover/card:opacity-100 transition-opacity">
            <Link href="/reactions">
              View all
              <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
          {/* Top reactions */}
          <div className="space-y-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Top Reactions
            </p>
            <div className="space-y-2" role="list" aria-label="Top emoji reactions">
              {topReactions.map((reaction, i) => (
                <TopReactionBar
                  key={reaction.emoji_name}
                  name={reaction.emoji_name}
                  count={reaction.total_count}
                  maxCount={maxCount}
                  imageUrl={emojiUrls.get(reaction.emoji_name)}
                  rank={i}
                />
              ))}
            </div>
          </div>

          {/* Summary stats */}
          <div className="flex lg:flex-col gap-4 lg:gap-3 lg:pl-6 lg:border-l border-border lg:min-w-[140px]">
            <StatItem
              icon={BarChart3}
              label="Reactions"
              value={reactionStats?.total_reactions.toLocaleString() ?? "0"}
            />
            <StatItem
              icon={Hash}
              label="Emojis Used"
              value={reactionStats?.unique_emojis.toLocaleString() ?? "0"}
            />
            <StatItem
              icon={Users}
              label="Reactors"
              value={reactionStats?.unique_users.toLocaleString() ?? "0"}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
