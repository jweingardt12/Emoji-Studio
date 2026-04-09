"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Crown } from "lucide-react"
import type { AggregatedReaction } from "@/lib/services/reaction-service"
import type { Emoji } from "@/lib/services/emoji-service"

const BAR_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

interface TopCreatorsProps {
  topReactions: AggregatedReaction[]
  emojiData: Emoji[]
  customEmojiUrls: Map<string, string>
  onEmojiClick?: (name: string) => void
}

export function TopCreators({ topReactions, emojiData, customEmojiUrls, onEmojiClick }: TopCreatorsProps) {
  const [expandedCreator, setExpandedCreator] = useState<string | null>(null)

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
          .slice(0, 10),
      }))
      .sort((a, b) => b.total_reactions - a.total_reactions)
      .slice(0, 8)
  }, [topReactions, emojiData, customEmojiUrls])

  if (creators.length === 0) return null

  const maxCount = creators[0].total_reactions

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
        <TooltipProvider delayDuration={200}>
          <div className="space-y-0.5">
            {creators.map((creator, i) => {
              const barPct = Math.max(3, (creator.total_reactions / maxCount) * 100)
              const isExpanded = expandedCreator === creator.user_id

              return (
                <div key={creator.user_id}>
                  <div
                    className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => setExpandedCreator(isExpanded ? null : creator.user_id)}
                  >
                    {/* Name */}
                    <span className="text-sm font-medium truncate w-20 sm:w-28 shrink-0">
                      {creator.user_display_name.split(" ")[0]}
                    </span>

                    {/* Bar */}
                    <div className="flex-1 min-w-0">
                      <Progress
                        value={barPct}
                        className="h-2.5 bg-muted/60"
                        style={{ ["--progress-color" as string]: BAR_COLORS[i % BAR_COLORS.length] }}
                      />
                    </div>

                    {/* Count */}
                    <span className="text-xs font-semibold tabular-nums shrink-0 w-10 text-right">
                      {creator.total_reactions.toLocaleString()}
                    </span>

                    {/* Top emojis preview — clicking these expands the row */}
                    <div className="hidden md:flex items-center gap-0.5 shrink-0">
                      {creator.top_emojis.slice(0, 3).map((emoji) => {
                        if (!emoji.url) return null
                        return (
                          <Tooltip key={emoji.name}>
                            <TooltipTrigger asChild>
                              <img
                                src={emoji.url}
                                alt={emoji.name}
                                className="h-4 w-4 object-contain"
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              :{emoji.name}: ({emoji.reactions})
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </div>
                  </div>

                  {/* Expanded emoji detail */}
                  {isExpanded && creator.top_emojis.length > 0 && (
                    <div className="ml-4 mr-2 mb-2 mt-1 flex flex-wrap gap-2 py-2 px-3 rounded-md bg-muted/30">
                      {creator.top_emojis.map((emoji) => (
                        <Tooltip key={emoji.name}>
                          <TooltipTrigger asChild>
                            <div
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/60 border border-border/50 ${onEmojiClick ? "cursor-pointer hover:bg-muted/60" : ""}`}
                              onClick={() => onEmojiClick?.(emoji.name)}
                            >
                              {emoji.url ? (
                                <img src={emoji.url} alt={emoji.name} className="h-5 w-5 object-contain" />
                              ) : (
                                <span className="text-sm">:{emoji.name}:</span>
                              )}
                              <span className="text-xs text-muted-foreground">{emoji.reactions}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            :{emoji.name}: — {emoji.reactions} reaction{emoji.reactions !== 1 ? "s" : ""}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
