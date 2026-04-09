"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { AggregatedReaction } from "@/lib/services/reaction-service"
import type { Emoji } from "@/lib/services/emoji-service"

interface TopCreatorsProps {
  topReactions: AggregatedReaction[]
  emojiData: Emoji[]
  customEmojiUrls: Map<string, string>
}

const chartConfig = {
  reactions: { label: "Reactions", color: "var(--chart-2)" },
} satisfies ChartConfig

export function TopCreators({ topReactions, emojiData, customEmojiUrls }: TopCreatorsProps) {
  const creators = useMemo(() => {
    const emojiCreatorMap = new Map<string, { user_id: string; user_display_name: string }>()
    for (const emoji of emojiData) {
      if (!emoji.is_alias && emoji.user_display_name) {
        emojiCreatorMap.set(emoji.name, {
          user_id: emoji.user_id,
          user_display_name: emoji.user_display_name,
        })
      }
    }

    const creatorMap = new Map<string, {
      user_display_name: string
      total_reactions: number
      emojis: { name: string; url: string; reactions: number }[]
    }>()

    for (const reaction of topReactions) {
      const creator = emojiCreatorMap.get(reaction.emoji_name)
      if (!creator) continue

      const existing = creatorMap.get(creator.user_id)
      const emojiEntry = {
        name: reaction.emoji_name,
        url: customEmojiUrls.get(reaction.emoji_name) || "",
        reactions: reaction.total_count,
      }

      if (existing) {
        existing.total_reactions += reaction.total_count
        existing.emojis.push(emojiEntry)
      } else {
        creatorMap.set(creator.user_id, {
          user_display_name: creator.user_display_name,
          total_reactions: reaction.total_count,
          emojis: [emojiEntry],
        })
      }
    }

    return Array.from(creatorMap.entries())
      .map(([user_id, data]) => ({
        user_id,
        user_display_name: data.user_display_name,
        total_reactions: data.total_reactions,
        emoji_count: data.emojis.length,
        top_emojis: data.emojis
          .sort((a, b) => b.reactions - a.reactions)
          .slice(0, 5),
      }))
      .sort((a, b) => b.total_reactions - a.total_reactions)
      .slice(0, 8)
  }, [topReactions, emojiData, customEmojiUrls])

  if (creators.length === 0) return null

  // Transform for recharts: horizontal bar chart with creator names on Y axis
  const chartData = creators.map((c) => ({
    name: c.user_display_name.split(" ")[0],
    reactions: c.total_reactions,
    fullName: c.user_display_name,
    emojiCount: c.emoji_count,
  }))

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Crown className="h-4 w-4" />
          Top Creators
        </CardTitle>
        <CardDescription className="text-xs">
          People whose custom emojis received the most reactions
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={72}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_: any, payload: any) => {
                    const item = payload?.[0]?.payload
                    return item ? `${item.fullName} (${item.emojiCount} emoji${item.emojiCount === 1 ? "" : "s"})` : ""
                  }}
                />
              }
            />
            <Bar
              dataKey="reactions"
              name="reactions"
              fill="var(--color-reactions)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
