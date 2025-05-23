"use client"

import React, { useMemo } from "react"
import Link from "next/link"
import { Rss } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { Skeleton } from "@/components/ui/skeleton"
import EmojiOverlay from "@/components/emoji-overlay"
import UserOverlay from "@/components/user-overlay"
import type { Emoji, UserWithEmojiCount } from "@/lib/services/emoji-service"
import { getUserLeaderboard } from "@/lib/services/emoji-service"
import { useAnalytics } from "@/lib/analytics"
import { format } from "date-fns"

export default function EmojiGrid() {
  const { emojiData, loading, useDemoData } = useEmojiData()
  const analytics = useAnalytics()
  
  // Get the leaderboard to determine user ranks
  const leaderboard = useMemo(() => {
    if (!emojiData) return []
    return getUserLeaderboard(emojiData, Math.floor(Date.now() / 1000))
  }, [emojiData])
  // No longer need expanded state since we're linking directly to explorer
  const [selectedEmoji, setSelectedEmoji] = React.useState<Emoji | null>(null)
  const [selectedUser, setSelectedUser] = React.useState<UserWithEmojiCount | null>(null)
  const [imageErrors, setImageErrors] = React.useState<Record<string, boolean>>({})

  // Log emoji data for debugging
  React.useEffect(() => {
    if (emojiData && emojiData.length > 0) {
      console.log(`EmojiGrid: Displaying ${emojiData.length} emojis`)
      console.log("First few emojis:", emojiData.slice(0, 3))
    }
  }, [emojiData])

  // Sort emojis by created descending (newest first) and filter out aliases
  const sorted = React.useMemo(() => {
    if (!emojiData) return []
    return [...emojiData]
      .filter((emoji) => !emoji.is_alias) // Filter out aliases
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
  }, [emojiData])

  // Always show just 20 emojis, and show the See More button if there are more
  const displayCount = 20
  const showSeeMore = sorted.length > 20

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-20 rounded bg-muted" />
        ))}
      </div>
    )
  }

  // Function to get a placeholder image for an emoji
  const getPlaceholderImage = (emojiName: string) => {
    return `/placeholder.svg?height=128&width=128&query=${emojiName}%20emoji`
  }

  // Handle image error
  const handleImageError = (emojiName: string) => {
    console.log(`Image error for emoji: ${emojiName}`)
    setImageErrors((prev) => ({ ...prev, [emojiName]: true }))
  }

  return (
    <>
      <div className="px-6 pt-6 pb-2 flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Rss className="h-5 w-5" />
          <Link href="/explorer" className="focus:outline-none cursor-pointer hover:opacity-80">
            <span className="border-b border-dotted border-muted-foreground">Newest Emojis</span>
          </Link>
        </h2>
        <div className="text-muted-foreground text-sm mt-1">
          A list of the most recently created emojis. Click an emoji for details.
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-4">
        {sorted.slice(0, displayCount).map((emoji) => (
          <div
            key={`${emoji.name}-${emoji.url}`}
            className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-4 shadow hover:border-primary/30 transition-colors cursor-pointer w-full min-h-[112px]"
            title={emoji.name}
            onClick={() => {
              setSelectedEmoji(emoji)
              // Track emoji view event
              analytics.trackEmojiView(emoji.name, emoji.user_display_name || "")
            }}
          >
            {emoji.is_alias ? (
              <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs">alias</div>
            ) : imageErrors[emoji.name] ? (
              <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs overflow-hidden">
                {emoji.name.slice(0, 2)}
              </div>
            ) : (
              <img
                src={emoji.url || getPlaceholderImage(emoji.name)}
                alt={`:${emoji.name}:`}
                className="h-12 w-12 object-contain rounded"
                onError={() => handleImageError(emoji.name)}
              />
            )}
            <span
              className="mt-2 text-xs text-muted-foreground text-center w-full max-w-[128px] truncate overflow-hidden whitespace-nowrap block"
              title={":" + emoji.name + ":"}
            >
              :{emoji.name && emoji.name.length > 10 ? emoji.name.slice(0, 10) + "…" : emoji.name}:
            </span>
            <span
              className="mt-1 text-xs text-slate-400 text-center w-full max-w-[128px] truncate overflow-hidden whitespace-nowrap block"
              title={emoji.user_display_name}
            >
              {emoji.user_display_name ? emoji.user_display_name.split(" ")[0] : ""}
            </span>
            <span
              className="mt-1 text-xs text-slate-400 text-center w-full max-w-[128px] truncate overflow-hidden whitespace-nowrap block"
            >
              {emoji.created ? format(new Date(emoji.created * 1000), "MMM d") : ""}
            </span>
          </div>
        ))}
      </div>
      {showSeeMore && (
        <div className="w-full flex justify-center mt-4 mb-2">
          <Button
            variant="default"
            onClick={() => {
              // Track when user clicks See More
              analytics.trackEmojiFilter("see_more", "explorer")
              // Navigate to explorer page
              window.location.href = "/explorer"
            }}
          >
            See More
          </Button>
        </div>
      )}
      {/* Emoji Overlay */}
      {selectedEmoji && (
        <EmojiOverlay
          emoji={selectedEmoji}
          onClose={() => setSelectedEmoji(null)}
          onEmojiClick={(emoji) => {
            // Switch to the clicked emoji
            setSelectedEmoji(emoji)
          }}
          onUserClick={(userId, userName) => {
            // Close emoji overlay and open user overlay
            setSelectedEmoji(null)

            // Find user data from emoji data if available
            const userEmojis = emojiData.filter((e) => e.user_id === userId)

            if (userEmojis.length > 0) {
              // Calculate basic stats for this user
              const emojiCount = userEmojis.filter((e) => !e.is_alias).length
              const timestamps = userEmojis.map((e) => e.created)
              const mostRecentTimestamp = Math.max(...timestamps)
              const oldestTimestamp = Math.min(...timestamps)

              // Find user's rank in the leaderboard
              const userRank = leaderboard.findIndex(u => u.user_id === userId) + 1;
              
              // Create user object with the information we have
              setSelectedUser({
                user_id: userId,
                user_display_name: userName,
                emoji_count: emojiCount,
                most_recent_emoji_timestamp: mostRecentTimestamp,
                oldest_emoji_timestamp: oldestTimestamp,
                l4wepw: 0, // Placeholder, will be calculated in UserOverlay
                l4wepwChange: 0, // Placeholder, will be calculated in UserOverlay
                rank: userRank > 0 ? userRank : undefined
              })
            } else {
              // Find user's rank in the leaderboard (likely won't find any)
              const userRank = leaderboard.findIndex(u => u.user_id === userId) + 1;
              
              // Create minimal user object with required fields
              setSelectedUser({
                user_id: userId,
                user_display_name: userName,
                emoji_count: 0,
                most_recent_emoji_timestamp: 0,
                oldest_emoji_timestamp: 0,
                l4wepw: 0,
                l4wepwChange: 0,
                rank: userRank > 0 ? userRank : undefined
              })
            }
          }}
        />
      )}

      {/* User Overlay */}
      {selectedUser && (
        <UserOverlay
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onEmojiClick={(emoji) => {
            // Close user overlay and open emoji overlay
            setSelectedUser(null)
            setSelectedEmoji(emoji)
          }}
        />
      )}
    </>
  )
}
