"use client"

import React, { useMemo, memo, useCallback } from "react"

import { Button } from "@/components/ui/button"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { Skeleton } from "@/components/ui/skeleton"
import EmojiOverlay from "@/components/emoji-overlay"
import UserOverlay from "@/components/user-overlay"
import type { Emoji, UserWithEmojiCount } from "@/lib/services/emoji-service"
import { getUserLeaderboard } from "@/lib/services/emoji-service"
import { useAnalytics } from "@/lib/analytics"
import { format } from "date-fns"

// Memoized individual emoji item to prevent unnecessary re-renders
const EmojiItem = memo<{
  emoji: Emoji
  imageError: boolean
  onClick: () => void
  onImageError: () => void
}>(({ emoji, imageError, onClick, onImageError }) => {
  const getPlaceholderImage = useCallback((emojiName: string) => {
    return `/placeholder.svg?height=128&width=128&query=${encodeURIComponent(emojiName)}%20emoji`
  }, [])

  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-4 shadow-sm hover:border-primary/30 transition-colors cursor-pointer w-full min-h-[112px]"
      title={emoji.name}
      onClick={onClick}
    >
      {emoji.is_alias ? (
        <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs">alias</div>
      ) : imageError ? (
        <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs overflow-hidden">
          {emoji.name.slice(0, 2)}
        </div>
      ) : (
        <img
          src={emoji.url || getPlaceholderImage(emoji.name)}
          alt={`:${emoji.name}:`}
          className="h-12 w-12 object-contain rounded"
          onError={onImageError}
        />
      )}
      <span
        className="mt-2 text-sm font-medium text-muted-foreground text-center w-full max-w-[160px] truncate overflow-hidden whitespace-nowrap block"
        title={":" + emoji.name + ":"}
      >
        :{emoji.name && emoji.name.length > 20 ? emoji.name.slice(0, 20) + "…" : emoji.name}:
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
  )
})

EmojiItem.displayName = "EmojiItem"

export default function EmojiGrid({ limit }: { limit?: number } = {}) {
  const { emojiData, loading } = useEmojiData()
  const analytics = useAnalytics()
  const [dataRefreshKey, setDataRefreshKey] = React.useState(0)
  const [localEmojiData, setLocalEmojiData] = React.useState<Emoji[]>([])

  // Update local emoji data when context data changes
  React.useEffect(() => {
    setLocalEmojiData(emojiData)
  }, [emojiData])
  
  // Listen for emoji data updates to force re-render
  React.useEffect(() => {
    const handleEmojiDataUpdated = (event: CustomEvent) => {
      setDataRefreshKey(prev => prev + 1)
      
      // Use data from event if available
      if (event.detail && event.detail.emojiData) {
        setLocalEmojiData(event.detail.emojiData);
      } else {
        // Fallback to localStorage
        setTimeout(() => {
          try {
            const storedData = localStorage.getItem("emojiData")
            if (storedData) {
              const parsedData = JSON.parse(storedData)
              if (Array.isArray(parsedData) && parsedData.length > 0) {
                setLocalEmojiData(parsedData)
              }
            }
          } catch (error) {
            // Silent error handling
          }
        }, 150) // Slightly longer delay than the context update
      }
    }
    
    window.addEventListener('emojiDataUpdated', handleEmojiDataUpdated as EventListener)
    
    return () => {
      window.removeEventListener('emojiDataUpdated', handleEmojiDataUpdated as EventListener)
    }
  }, [])
  
  // Get the leaderboard to determine user ranks - optimize with stable timestamp
  const leaderboard = useMemo(() => {
    if (!localEmojiData || localEmojiData.length === 0) return []
    return getUserLeaderboard(localEmojiData, Math.floor(Date.now() / 1000))
  }, [localEmojiData, dataRefreshKey])

  const [selectedEmoji, setSelectedEmoji] = React.useState<Emoji | null>(null)
  const [selectedUser, setSelectedUser] = React.useState<UserWithEmojiCount | null>(null)
  const [imageErrors, setImageErrors] = React.useState<Record<string, boolean>>({})



  // Memoized sorting function to prevent recalculations
  const sorted = useMemo(() => {
    if (!localEmojiData || localEmojiData.length === 0) return []

    return localEmojiData
      .filter((emoji) => !emoji.is_alias) // Filter out aliases
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
  }, [localEmojiData, dataRefreshKey])

  // Memoized display values
  const { displayEmojis, showSeeMore } = useMemo(() => {
    const displayCount = limit ?? 20
    return {
      displayEmojis: sorted.slice(0, displayCount),
      showSeeMore: sorted.length > displayCount
    }
  }, [sorted, limit])

  // Memoized event handlers to prevent child re-renders
  const handleImageError = useCallback((emojiName: string) => {
    setImageErrors((prev) => ({ ...prev, [emojiName]: true }))
  }, [])

  const handleEmojiClick = useCallback((emoji: Emoji) => {
    setSelectedEmoji(emoji)
    analytics.trackEmojiView(emoji.name, emoji.user_display_name || "")
  }, [analytics])

  const handleSeeMoreClick = useCallback(() => {
    analytics.trackEmojiFilter("see_more", "explorer")
    window.location.href = "/explorer"
  }, [analytics])

  const handleUserClick = useCallback((userId: string, userName: string) => {
    setSelectedEmoji(null)

    const userEmojis = localEmojiData.filter((e) => e.user_id === userId)

    if (userEmojis.length > 0) {
      const emojiCount = userEmojis.filter((e) => !e.is_alias).length
      const timestamps = userEmojis
        .map((e) => e.created)
        .filter((t): t is number => typeof t === 'number' && t > 0)
      const mostRecentTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : 0
      const oldestTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : 0
      const userRank = leaderboard.findIndex(u => u.user_id === userId) + 1

      setSelectedUser({
        user_id: userId,
        user_display_name: userName,
        emoji_count: emojiCount,
        most_recent_emoji_timestamp: mostRecentTimestamp,
        oldest_emoji_timestamp: oldestTimestamp,
        l4wepw: 0,
        l4wepwChange: 0,
        rank: userRank > 0 ? userRank : undefined
      })
    } else {
      const userRank = leaderboard.findIndex(u => u.user_id === userId) + 1

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
  }, [localEmojiData, leaderboard])

  // Create stable click handlers to prevent child re-renders
  const emojiClickHandlers = useMemo(() => {
    const handlers = new Map<string, () => void>()
    displayEmojis.forEach(emoji => {
      const key = `${emoji.name}-${emoji.url}`
      handlers.set(key, () => handleEmojiClick(emoji))
    })
    return handlers
  }, [displayEmojis, handleEmojiClick])

  const imageErrorHandlers = useMemo(() => {
    const handlers = new Map<string, () => void>()
    displayEmojis.forEach(emoji => {
      handlers.set(emoji.name, () => handleImageError(emoji.name))
    })
    return handlers
  }, [displayEmojis, handleImageError])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-20 rounded bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-2">
        {displayEmojis.map((emoji) => {
          const key = `${emoji.name}-${emoji.url}`
          return (
            <EmojiItem
              key={key}
              emoji={emoji}
              imageError={imageErrors[emoji.name] || false}
              onClick={emojiClickHandlers.get(key)!}
              onImageError={imageErrorHandlers.get(emoji.name)!}
            />
          )
        })}
      </div>
      {showSeeMore && (
        <div className="w-full flex justify-center mt-4 mb-2">
          <Button
            variant="default"
            onClick={handleSeeMoreClick}
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
          onEmojiClick={setSelectedEmoji}
          onUserClick={handleUserClick}
        />
      )}

      {/* User Overlay */}
      {selectedUser && (
        <UserOverlay
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onEmojiClick={(emoji) => {
            setSelectedUser(null)
            setSelectedEmoji(emoji)
          }}
        />
      )}
    </>
  )
}
