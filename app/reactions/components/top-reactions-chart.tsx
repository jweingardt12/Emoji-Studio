"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { AggregatedReaction } from "@/lib/services/reaction-service"
import type { EmojiFilter } from "@/app/reactions/hooks/use-reactions-state"

interface TopReactionsChartProps {
  topReactions: AggregatedReaction[]
  emojiFilter: EmojiFilter
  setEmojiFilter: (filter: EmojiFilter) => void
  customEmojiUrls: Map<string, string>
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

function isCustomEmoji(name: string, customEmojiUrls: Map<string, string>) {
  return customEmojiUrls.has(name)
}

interface TooltipPayloadItem {
  value: number
  payload: { emoji_name: string; total_count: number }
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-sm">
      <p className="font-medium">:{d.emoji_name}:</p>
      <p className="text-muted-foreground">
        {d.total_count.toLocaleString()} reactions
      </p>
    </div>
  )
}

export function TopReactionsChart({
  topReactions,
  emojiFilter,
  setEmojiFilter,
  customEmojiUrls,
}: TopReactionsChartProps) {
  const filtered =
    emojiFilter === "custom"
      ? topReactions.filter((r) =>
          isCustomEmoji(r.emoji_name, customEmojiUrls)
        )
      : topReactions

  const data = filtered.slice(0, 15).map((r) => ({
    emoji_name: r.emoji_name,
    total_count: r.total_count,
    label: `:${r.emoji_name}:`,
  }))

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
          <ResponsiveContainer width="100%" height={data.length * 32 + 20}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={110}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted)/0.3)" }} />
              <Bar dataKey="total_count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
