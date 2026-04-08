"use client"

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
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
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

  // Build creator lookup
  const creatorMap = new Map<string, string>()
  for (const emoji of emojiData) {
    if (!emoji.is_alias && emoji.user_display_name) {
      creatorMap.set(emoji.name, emoji.user_display_name)
    }
  }

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
          <div className="space-y-1.5">
            {data.map((reaction, i) => {
              const url = customEmojiUrls.get(reaction.emoji_name)
              const creator = creatorMap.get(reaction.emoji_name)
              const barPct = Math.max(2, (reaction.total_count / maxCount) * 100)

              return (
                <div
                  key={reaction.emoji_name}
                  className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  {/* Rank */}
                  <span className="text-sm font-bold text-muted-foreground w-5 text-right shrink-0">
                    {i + 1}
                  </span>

                  {/* Emoji image */}
                  <div className="h-8 w-8 shrink-0 flex items-center justify-center">
                    {url ? (
                      <img
                        src={url}
                        alt={reaction.emoji_name}
                        className="h-7 w-7 object-contain rounded"
                      />
                    ) : (
                      <span className="text-lg" title={`:${reaction.emoji_name}:`}>
                        :{reaction.emoji_name}:
                      </span>
                    )}
                  </div>

                  {/* Name + creator */}
                  <div className="min-w-0 w-36 shrink-0">
                    <p className="text-sm font-medium truncate" title={`:${reaction.emoji_name}:`}>
                      :{reaction.emoji_name}:
                    </p>
                    {creator && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        by {creator.split(" ")[0]}
                      </p>
                    )}
                  </div>

                  {/* Bar */}
                  <div className="flex-1 min-w-0">
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${BAR_COLORS[i % BAR_COLORS.length]}`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Count */}
                  <span className="text-sm font-semibold tabular-nums w-14 text-right shrink-0">
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
