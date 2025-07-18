"use client"

import React, { useRef, useCallback, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Emoji } from '@/lib/services/emoji-service'
import { Skeleton } from '@/components/ui/skeleton'

interface VirtualizedEmojiGridProps {
  emojis: Emoji[]
  onEmojiClick: (emoji: Emoji) => void
  imageErrors: Record<string, boolean>
  onImageError: (emojiName: string) => void
  getPlaceholderImage: (name: string) => string
}

export function VirtualizedEmojiGrid({
  emojis,
  onEmojiClick,
  imageErrors,
  onImageError,
  getPlaceholderImage
}: VirtualizedEmojiGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  // Calculate columns based on screen width
  const getColumns = useCallback(() => {
    if (typeof window === 'undefined') return 2
    const width = window.innerWidth
    if (width >= 1280) return 6 // xl
    if (width >= 1024) return 5 // lg
    if (width >= 768) return 4  // md
    if (width >= 640) return 3  // sm
    return 2
  }, [])

  const [columns, setColumns] = React.useState(getColumns())

  // Update columns on resize
  React.useEffect(() => {
    const handleResize = () => {
      setColumns(getColumns())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [getColumns])

  // Calculate rows from emojis
  const rows = useMemo(() => {
    const rowCount = Math.ceil(emojis.length / columns)
    return Array.from({ length: rowCount }, (_, i) => 
      emojis.slice(i * columns, (i + 1) * columns)
    )
  }, [emojis, columns])

  // Setup virtualizer
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 144, // Approximate height of each row
    overscan: 5,
  })

  const items = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-280px)] overflow-auto"
      style={{
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualRow) => {
          const row = rows[virtualRow.index]
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
              <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4`}>
                {row.map((emoji) => (
                  <div
                    key={`${emoji.name}-${emoji.url}`}
                    className="flex flex-col items-center justify-center rounded-lg border bg-card p-4 shadow hover:border-primary/30 cursor-pointer w-full min-h-[112px]"
                    title={emoji.name}
                    onClick={() => onEmojiClick(emoji)}
                  >
                    {imageErrors[emoji.name] ? (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs overflow-hidden">
                        {emoji.name.slice(0, 2)}
                      </div>
                    ) : (
                      <img
                        src={emoji.url || getPlaceholderImage(emoji.name)}
                        alt={`:${emoji.name}:`}
                        className="h-12 w-12 object-contain rounded"
                        onError={() => onImageError(emoji.name)}
                        loading="lazy"
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
                      {emoji.created ? new Date(emoji.created * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ""}
                    </span>
                  </div>
                ))}
                {/* Fill empty cells in the last row */}
                {row.length < columns && Array.from({ length: columns - row.length }).map((_, i) => (
                  <div key={`empty-${virtualRow.index}-${i}`} className="w-full" />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function VirtualizedEmojiGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center justify-center p-4 border rounded-lg bg-card">
          <Skeleton className="h-12 w-12 rounded" />
          <Skeleton className="h-4 w-16 mt-2" />
          <Skeleton className="h-3 w-12 mt-1" />
        </div>
      ))}
    </div>
  )
}