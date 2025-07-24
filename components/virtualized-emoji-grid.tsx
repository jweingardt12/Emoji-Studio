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
    estimateSize: () => 160, // Adjusted height for better spacing
    overscan: 5,
  })

  const items = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className="overflow-hidden"
      style={{
        contain: 'strict',
        height: 'auto', // Let content determine height
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
              <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 p-2`}>
                {row.map((emoji) => (
                  <div
                    key={`${emoji.name}-${emoji.url}`}
                    className="flex flex-col items-center justify-center rounded-lg border bg-card p-2 sm:p-3 shadow hover:border-primary/30 hover:shadow-md transition-all cursor-pointer w-full min-h-[120px] sm:min-h-[130px]"
                    title={emoji.name}
                    onClick={() => onEmojiClick(emoji)}
                  >
                    {/* Emoji Image */}
                    <div className="flex-shrink-0 mb-1.5 sm:mb-2">
                      {imageErrors[emoji.name] ? (
                        <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                          {emoji.name.slice(0, 2).toUpperCase()}
                        </div>
                      ) : (
                        <img
                          src={emoji.url || getPlaceholderImage(emoji.name)}
                          alt={`:${emoji.name}:`}
                          className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded"
                          onError={() => onImageError(emoji.name)}
                          loading="lazy"
                        />
                      )}
                    </div>
                    
                    {/* Emoji Name */}
                    <span
                      className="text-xs font-medium text-foreground text-center w-full truncate px-1 mb-0.5"
                      title={`:${emoji.name}:`}
                    >
                      :{emoji.name && emoji.name.length > 12 ? emoji.name.slice(0, 12) + "…" : emoji.name}:
                    </span>
                    
                    {/* Creator Name */}
                    <span
                      className="text-xs text-muted-foreground text-center w-full truncate px-1 mb-0.5"
                      title={emoji.user_display_name}
                    >
                      {emoji.user_display_name ? emoji.user_display_name.split(" ")[0] : ""}
                    </span>
                    
                    {/* Creation Date */}
                    <span className="text-xs text-muted-foreground text-center w-full truncate px-1">
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 p-2">
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center justify-center p-2 sm:p-3 border rounded-lg bg-card min-h-[120px] sm:min-h-[130px]">
          {/* Emoji Image Skeleton */}
          <div className="flex-shrink-0 mb-1.5 sm:mb-2">
            <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded" />
          </div>
          {/* Emoji Name Skeleton */}
          <Skeleton className="h-3 w-16 mb-0.5" />
          {/* Creator Name Skeleton */}
          <Skeleton className="h-3 w-12 mb-0.5" />
          {/* Date Skeleton */}
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  )
}