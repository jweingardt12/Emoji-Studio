"use client"

import { useMemo, useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import type { ReactionEvent } from "@/lib/services/reaction-service"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TimelineBucket {
  date: string
  count: number
  ts: number
}

interface ReactionTimelineProps {
  data: TimelineBucket[]
  reactionEvents?: ReactionEvent[]
  customEmojiUrls?: Map<string, string>
  channels?: { id: string; name: string }[]
  userNameMap?: Map<string, string>
  onEmojiClick?: (name: string) => void
  dateRange?: string
}

const chartConfig = {
  reactions: { label: "Reactions", color: "var(--chart-1)" },
} satisfies ChartConfig

export function ReactionTimeline({ data, reactionEvents, customEmojiUrls, channels, userNameMap, onEmojiClick, dateRange }: ReactionTimelineProps) {
  const [selectedBucket, setSelectedBucket] = useState<TimelineBucket | null>(null)

  const { total, peak } = useMemo(() => {
    let total = 0
    let peak: TimelineBucket = { date: "", count: 0, ts: 0 }
    for (const d of data) {
      total += d.count
      if (d.count > peak.count) peak = d
    }
    return { total, peak }
  }, [data])

  if (!data || data.length === 0) return null

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
            <CardTitle className="text-base">Reaction Activity</CardTitle>
            <CardDescription>
              {total.toLocaleString()} total reactions over the scanned period
            </CardDescription>
          </div>
          {peak.date && (
            <div className="flex items-center justify-center border-t px-6 py-3 sm:border-l sm:border-t-0 sm:py-0">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Peak</p>
                <p className="text-lg font-bold tabular-nums">{peak.count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{peak.date}</p>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
            <AreaChart
              data={data}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="reactionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-reactions)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-reactions)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <ChartTooltip
                content={<ChartTooltipContent indicator="line" />}
              />
              <Area
                type="natural"
                dataKey="count"
                name="reactions"
                stroke="var(--color-reactions)"
                strokeWidth={2}
                fill="url(#reactionsGradient)"
                dot={false}
                activeDot={(props: any) => (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={6}
                    fill="var(--color-reactions)"
                    stroke="var(--background)"
                    strokeWidth={2}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      const bucket = data[props.index]
                      if (bucket?.count > 0) setSelectedBucket(bucket)
                    }}
                  />
                )}
              />
            </AreaChart>
          </ChartContainer>
          <p className="text-xs text-muted-foreground text-center mt-2">Click on a data point to see details</p>
        </CardContent>
      </Card>

      {reactionEvents && (
        <DayDetailModal
          bucket={selectedBucket}
          onClose={() => setSelectedBucket(null)}
          reactionEvents={reactionEvents}
          customEmojiUrls={customEmojiUrls}
          channels={channels}
          userNameMap={userNameMap}
          onEmojiClick={onEmojiClick}
          dateRange={dateRange}
        />
      )}
    </>
  )
}

/* ── Day Detail Modal ─────────────────────────────────────────── */

function DayDetailModal({
  bucket,
  onClose,
  reactionEvents,
  customEmojiUrls,
  channels,
  userNameMap,
  onEmojiClick,
  dateRange,
}: {
  bucket: TimelineBucket | null
  onClose: () => void
  reactionEvents: ReactionEvent[]
  customEmojiUrls?: Map<string, string>
  channels?: { id: string; name: string }[]
  userNameMap?: Map<string, string>
  onEmojiClick?: (name: string) => void
  dateRange?: string
}) {
  const isMobile = useIsMobile()
  const open = bucket !== null

  const isHourly = dateRange === "24h"
  const bucketSize = isHourly ? 3600 : 86400

  const { topEmojis, channelBreakdown, topReactors, totalReactions, uniqueEmojis } = useMemo(() => {
    if (!bucket) return { topEmojis: [], channelBreakdown: [], topReactors: [], totalReactions: 0, uniqueEmojis: 0 }

    const start = bucket.ts
    const end = start + bucketSize
    const dayEvents = reactionEvents.filter(e => e.timestamp >= start && e.timestamp < end)

    const emojiCounts = new Map<string, number>()
    const channelCounts = new Map<string, number>()
    const userCounts = new Map<string, number>()
    let total = 0

    for (const e of dayEvents) {
      total += e.count
      emojiCounts.set(e.emoji_name, (emojiCounts.get(e.emoji_name) || 0) + e.count)
      channelCounts.set(e.channel_id, (channelCounts.get(e.channel_id) || 0) + e.count)
      for (const uid of e.user_ids) {
        userCounts.set(uid, (userCounts.get(uid) || 0) + 1)
      }
    }

    return {
      topEmojis: [...emojiCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
      channelBreakdown: [...channelCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
      topReactors: [...userCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
      totalReactions: total,
      uniqueEmojis: emojiCounts.size,
    }
  }, [bucket, reactionEvents, bucketSize])

  const channelMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of channels ?? []) m.set(c.id, c.name)
    return m
  }, [channels])

  const content = (
    <div className="text-sm">
      {topEmojis.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Top Emojis */}
          <div>
            <p className="font-medium mb-3">Top emojis</p>
            <ScrollArea className="max-h-[400px] pr-3">
              <div className="space-y-1">
                {topEmojis.map(([name, count]) => {
                  const url = customEmojiUrls?.get(name)
                  const pct = totalReactions > 0 ? (count / totalReactions) * 100 : 0
                  return (
                    <button
                      key={name}
                      className="flex items-center gap-2.5 w-full text-left hover:bg-accent/50 rounded-lg px-2 py-1.5 transition-colors"
                      onClick={() => onEmojiClick?.(name)}
                    >
                      <div className="h-5 w-5 shrink-0 flex items-center justify-center">
                        {url ? (
                          <img src={url} alt={name} className="h-5 w-5 object-contain" />
                        ) : (
                          <span className="text-sm">:{name}:</span>
                        )}
                      </div>
                      <span className="truncate flex-1 min-w-0">:{name}:</span>
                      <span className="text-muted-foreground tabular-nums text-xs shrink-0">
                        {count}
                      </span>
                      <div className="w-16 shrink-0 h-1.5 bg-muted rounded-full">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Right column: Channels + Top Reactors */}
          <div className="space-y-6">
            {/* Channel Breakdown */}
            {channelBreakdown.length > 0 && (
              <div>
                <p className="font-medium mb-3">Channels</p>
                <div className="space-y-2.5">
                  {channelBreakdown.map(([channelId, count]) => {
                    const name = channelMap.get(channelId) || channelId
                    const topCount = channelBreakdown[0][1]
                    const pct = topCount > 0 ? (count / topCount) * 100 : 0
                    return (
                      <div key={channelId} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground truncate text-xs">#{name}</span>
                          <span className="text-muted-foreground tabular-nums text-xs shrink-0 ml-2">
                            {count.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full">
                          <div
                            className="h-full bg-chart-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Top Reactors — only show users we have names for */}
            {(() => {
              const named = topReactors.filter(([uid]) => userNameMap?.has(uid))
              if (named.length === 0) return null
              const topCount = named[0][1]
              return (
                <div>
                  <p className="font-medium mb-3">Top reactors</p>
                  <div className="space-y-2.5">
                    {named.map(([userId, count]) => {
                      const name = userNameMap!.get(userId)!
                      const pct = topCount > 0 ? (count / topCount) * 100 : 0
                      return (
                        <div key={userId} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground truncate text-xs">{name}</span>
                            <span className="text-muted-foreground tabular-nums text-xs shrink-0 ml-2">
                              {count.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full">
                            <div
                              className="h-full bg-chart-3 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">No reaction data for this period</p>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => { if (!v) onClose() }}>
        <DrawerContent className="max-w-2xl mx-auto w-full px-4 py-6">
          <DrawerHeader className="px-0">
            <DrawerTitle>{bucket?.date}</DrawerTitle>
            <DrawerDescription>
              {totalReactions.toLocaleString()} reactions across {uniqueEmojis} emojis
            </DrawerDescription>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-3xl! max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bucket?.date}</DialogTitle>
          <DialogDescription>
            {totalReactions.toLocaleString()} reactions across {uniqueEmojis} emojis
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
