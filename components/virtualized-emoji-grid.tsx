"use client"

import React, { useMemo, memo, useCallback, useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"

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
const VirtualizedEmojiItem = memo<{
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
      className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-4 shadow-sm hover:border-primary/30 transition-colors cursor-pointer w-full h-28"
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

VirtualizedEmojiItem.displayName = "VirtualizedEmojiItem"

interface VirtualizedEmojiGridProps {
  maxHeight?: number // Maximum height in pixels
  itemsPerRow?: number // Number of items per row (auto-calculated if not provided)
  showSeeMore?: boolean // Whether to show see more functionality
}

export default function VirtualizedEmojiGrid({
  maxHeight = 800,
  itemsPerRow,
  showSeeMore = true
}: VirtualizedEmojiGridProps) {
  const { emojiData, loading } = useEmojiData()
  const analytics = useAnalytics()
  const [dataRefreshKey, setDataRefreshKey] = React.useState(0)
  const [localEmojiData, setLocalEmojiData] = React.useState<Emoji[]>([])

  // Container ref for calculating responsive columns
  const containerRef = useRef<HTMLDivElement>(null)

  // Update local emoji data when context data changes
  React.useEffect(() => {
    setLocalEmojiData(emojiData)
  }, [emojiData])

  // Listen for emoji data updates
  React.useEffect(() => {
    const handleEmojiDataUpdated = (event: CustomEvent) => {
      setDataRefreshKey(prev => prev + 1)

      if (event.detail && event.detail.emojiData) {
        setLocalEmojiData(event.detail.emojiData)
      } else {
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
        }, 150)
      }
    }

    window.addEventListener('emojiDataUpdated', handleEmojiDataUpdated as EventListener)

    return () => {
      window.removeEventListener('emojiDataUpdated', handleEmojiDataUpdated as EventListener)
    }
  }, [])

  // Get the leaderboard to determine user ranks
  const leaderboard = useMemo(() => {
    if (!localEmojiData || localEmojiData.length === 0) return []
    return getUserLeaderboard(localEmojiData, Math.floor(Date.now() / 1000))
  }, [localEmojiData, dataRefreshKey])

  const [selectedEmoji, setSelectedEmoji] = React.useState<Emoji | null>(null)
  const [selectedUser, setSelectedUser] = React.useState<UserWithEmojiCount | null>(null)
  const [imageErrors, setImageErrors] = React.useState<Record<string, boolean>>({})

  // Memoized sorting function
  const sortedEmojis = useMemo(() => {
    if (!localEmojiData || localEmojiData.length === 0) return []

    return localEmojiData
      .filter((emoji) => !emoji.is_alias)
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
  }, [localEmojiData, dataRefreshKey])

  // Calculate responsive columns (auto-fit with min 200px width)
  const columns = useMemo(() => {
    if (itemsPerRow) return itemsPerRow

    // Default responsive breakpoints for emoji grid
    if (typeof window === 'undefined') return 5 // SSR fallback

    const width = containerRef.current?.clientWidth || window.innerWidth

    if (width >= 1280) return 5      // xl and up
    if (width >= 1024) return 4      // lg
    if (width >= 768) return 3       // md
    if (width >= 640) return 2       // sm
    return 1                         // mobile
  }, [itemsPerRow, dataRefreshKey]) // Re-calculate on data changes to handle resize

  // Group emojis into rows for virtual scrolling
  const rows = useMemo(() => {
    const result: Emoji[][] = []
    for (let i = 0; i < sortedEmojis.length; i += columns) {
      result.push(sortedEmojis.slice(i, i + columns))
    }
    return result
  }, [sortedEmojis, columns])

  // Virtual scrolling configuration
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 140, // Height of each row (112px item + gap)
    overscan: 3, // Render 3 extra rows above/below viewport
  })

  // Memoized event handlers
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div
        ref={containerRef}
        className="w-full p-2"
        style={{ height: `${Math.min(maxHeight, rows.length * 140)}px`, overflow: 'auto' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index]
            if (!row) return null

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className={`grid grid-cols-${columns} gap-4 h-full`}>
                  {row.map((emoji) => (
                    <VirtualizedEmojiItem
                      key={`${emoji.name}-${emoji.url}`}
                      emoji={emoji}
                      imageError={imageErrors[emoji.name] || false}
                      onClick={() => handleEmojiClick(emoji)}
                      onImageError={() => handleImageError(emoji.name)}
                    />
                  ))}
                  {/* Fill empty slots in last row */}
                  {row.length < columns &&
                    Array.from({ length: columns - row.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-full" />
                    ))
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showSeeMore && sortedEmojis.length > 0 && (
        <div className="w-full flex justify-center mt-4 mb-2">
          <Button variant="default" onClick={handleSeeMoreClick}>
            See More ({sortedEmojis.length} total emojis)
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