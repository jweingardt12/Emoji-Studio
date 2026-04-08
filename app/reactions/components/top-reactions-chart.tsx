"use client"

import { useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { AggregatedReaction } from "@/lib/services/reaction-service"
import type { Emoji } from "@/lib/services/emoji-service"
import type { EmojiFilter } from "@/app/reactions/hooks/use-reactions-state"

interface TopReactionsChartProps {
  topReactions: AggregatedReaction[]
  emojiFilter: EmojiFilter
  setEmojiFilter: (filter: EmojiFilter) => void
  customEmojiUrls: Map<string, string>
  emojiData: Emoji[]
}

const BAR_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export function TopReactionsChart({
  topReactions,
  emojiFilter,
  setEmojiFilter,
  customEmojiUrls,
  emojiData,
}: TopReactionsChartProps) {
  const filtered =
    emojiFilter === "custom"
      ? topReactions.filter((r) => customEmojiUrls.has(r.emoji_name))
      : topReactions

  const data = filtered.slice(0, 20)
  const maxCount = data[0]?.total_count || 1

  const creatorMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const emoji of emojiData) {
      if (!emoji.is_alias && emoji.user_display_name) {
        map.set(emoji.name, emoji.user_display_name)
      }
    }
    return map
  }, [emojiData])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base">Top Reactions</CardTitle>
        <ToggleGroup
          type="single"
          value={emojiFilter}
          onValueChange={(v) => v && setEmojiFilter(v as EmojiFilter)}
          className="border rounded-md"
        >
          <ToggleGroupItem value="all" className="text-xs px-2.5 h-7">
            All
          </ToggleGroupItem>
          <ToggleGroupItem value="custom" className="text-xs px-2.5 h-7">
            Custom Only
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {emojiFilter === "custom"
              ? "No custom emoji found in scan results."
              : "No data yet — run a scan first."}
          </p>
        ) : (
          <div className="space-y-0.5">
            {data.map((reaction, i) => {
              const url = customEmojiUrls.get(reaction.emoji_name)
              const isCustom = !!url
              const creator = creatorMap.get(reaction.emoji_name)
              const barPct = Math.max(3, (reaction.total_count / maxCount) * 100)

              return (
                <div
                  key={reaction.emoji_name}
                  className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-muted/40 transition-colors"
                >
                  {/* Rank */}
                  <span className="text-xs font-semibold text-muted-foreground w-5 text-right tabular-nums shrink-0">
                    {i + 1}
                  </span>

                  {isCustom && (
                    <div className="h-7 w-7 shrink-0 flex items-center justify-center">
                      <img
                        src={url}
                        alt={reaction.emoji_name}
                        className="h-6 w-6 object-contain"
                      />
                    </div>
                  )}

                  <div className={`${isCustom ? "w-32 sm:w-40" : "w-40 sm:w-48"} shrink-0 min-w-0`}>
                    <p className="text-sm font-medium truncate leading-tight">
                      :{reaction.emoji_name}:
                    </p>
                    {creator && (
                      <p className="text-[10px] text-muted-foreground truncate leading-tight">
                        by {creator.split(" ")[0]}
                      </p>
                    )}
                  </div>

                  {/* Bar */}
                  <div className="flex-1 min-w-0 hidden sm:block">
                    <div className="w-full bg-muted/60 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full"
                        style={{
                          width: `${barPct}%`,
                          backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                        }}
                      />
                    </div>
                  </div>

                  {/* Count */}
                  <span className="text-xs font-semibold tabular-nums shrink-0 ml-auto sm:ml-0 sm:w-12 text-right">
                    {reaction.total_count.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
