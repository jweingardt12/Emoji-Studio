"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown } from "lucide-react"
import type { AggregatedReaction } from "@/lib/services/reaction-service"
import type { Emoji } from "@/lib/services/emoji-service"

interface TopCreatorsProps {
  topReactions: AggregatedReaction[]
  emojiData: Emoji[]
  customEmojiUrls: Map<string, string>
}

interface CreatorStat {
  user_display_name: string
  user_id: string
  total_reactions: number
  emoji_count: number
  top_emojis: { name: string; url: string; reactions: number }[]
}

export function TopCreators({ topReactions, emojiData, customEmojiUrls }: TopCreatorsProps) {
  const creators = useMemo(() => {
    // Build a lookup: emoji name -> creator info
    const emojiCreatorMap = new Map<string, { user_id: string; user_display_name: string }>()
    for (const emoji of emojiData) {
      if (!emoji.is_alias && emoji.user_display_name) {
        emojiCreatorMap.set(emoji.name, {
          user_id: emoji.user_id,
          user_display_name: emoji.user_display_name,
        })
      }
    }

    // Aggregate: for each creator, sum reactions across their emojis
    const creatorMap = new Map<string, {
      user_display_name: string
      total_reactions: number
      emojis: { name: string; url: string; reactions: number }[]
    }>()

    for (const reaction of topReactions) {
      const creator = emojiCreatorMap.get(reaction.emoji_name)
      if (!creator) continue // skip standard emoji or unknown creators

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

    // Sort by total reactions, take top 10
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
      .slice(0, 10)
  }, [topReactions, emojiData, customEmojiUrls])

  if (creators.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Crown className="h-4 w-4" />
          Top Emoji Creators by Reaction Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {creators.map((creator, i) => (
            <div
              key={creator.user_id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              {/* Rank */}
              <span className="text-lg font-bold text-muted-foreground w-6 text-right shrink-0">
                {i + 1}
              </span>

              {/* Creator info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">
                    {creator.user_display_name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {creator.total_reactions.toLocaleString()} reactions on {creator.emoji_count} emoji{creator.emoji_count !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Top emojis by this creator */}
                <div className="flex items-center gap-1.5 mt-1">
                  {creator.top_emojis.map((emoji) => (
                    <div
                      key={emoji.name}
                      className="flex items-center gap-1 bg-muted/50 rounded px-1.5 py-0.5"
                      title={`:${emoji.name}: (${emoji.reactions} reactions)`}
                    >
                      {emoji.url ? (
                        <img
                          src={emoji.url}
                          alt={emoji.name}
                          className="h-4 w-4 object-contain"
                        />
                      ) : null}
                      <span className="text-[10px] text-muted-foreground">
                        {emoji.reactions}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reaction bar */}
              <div className="w-24 shrink-0 hidden sm:block">
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.max(4, (creator.total_reactions / creators[0].total_reactions) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
