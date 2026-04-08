"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { UserReactionStat } from "@/lib/services/reaction-service"

interface YourReactionsProps {
  userStats: UserReactionStat[]
  currentUserId: string | null
  customEmojiUrls: Map<string, string>
  onEmojiClick?: (name: string) => void
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
      <img
        src={url}
        alt={`:${name}:`}
        className="w-8 h-8 object-contain"
        title={`:${name}:`}
      />
    )
  }
  return null
}

export function YourReactions({
  userStats,
  currentUserId,
  customEmojiUrls,
  onEmojiClick,
}: YourReactionsProps) {
  if (!currentUserId) return null

  const myStats = userStats.find((u) => u.user_id === currentUserId)
  if (!myStats) return null

  const topFive = myStats.top_emojis.slice(0, 5)

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Your Top Emojis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            You reacted{" "}
            <span className="font-semibold text-foreground">
              {myStats.reaction_count.toLocaleString()}
            </span>{" "}
            times across scanned channels.
          </span>
        </div>
        {topFive.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-medium">
              Your top emojis
            </p>
            <div className="grid grid-cols-5 gap-3">
              {topFive.map((name, i) => (
                <div
                  key={name}
                  className={`flex flex-col items-center gap-1.5 group ${onEmojiClick ? "cursor-pointer" : ""}`}
                  onClick={onEmojiClick ? () => onEmojiClick(name) : undefined}
                >
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-accent transition-colors">
                    <EmojiDisplay
                      name={name}
                      customEmojiUrls={customEmojiUrls}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground text-center truncate w-full leading-tight">
                    #{i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
