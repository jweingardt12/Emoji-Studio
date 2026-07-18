"use client"

import React, { useRef, useCallback, useMemo, startTransition } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Emoji } from '@/lib/services/emoji-service'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Copy, ExternalLink, Image as ImageIcon, CheckSquare } from 'lucide-react'
import { OptimizedEmojiImage } from '@/components/optimized-emoji-image'
import { cn } from '@/lib/utils'

interface VirtualizedExplorerGridProps {
  emojis: Emoji[]
  onEmojiClick: (emoji: Emoji) => void
  getPlaceholderImage: (name: string) => string
  onImageError: (emojiName: string) => void
  // Bulk selection
  bulkSelectionMode: boolean
  selectedEmojis: Set<string>
  toggleEmojiSelection: (emojiName: string, e: React.MouseEvent) => void
  // New badge
  showNewBadge: boolean
  sinceFilter: number | null
  // Quick actions
  copyEmojiName: (emoji: Emoji, e: React.MouseEvent) => void
  copyEmojiUrl: (emoji: Emoji, e: React.MouseEvent) => void
  copyImageToClipboard: (emoji: Emoji, e: React.MouseEvent) => void
  // Analytics
  trackEmojiView: (name: string, creator: string) => void
  // Mobile
  isMobile: boolean
}

export function VirtualizedExplorerGrid({
  emojis,
  onEmojiClick,
  getPlaceholderImage,
  onImageError,
  bulkSelectionMode,
  selectedEmojis,
  toggleEmojiSelection,
  showNewBadge,
  sinceFilter,
  copyEmojiName,
  copyEmojiUrl,
  copyImageToClipboard,
  trackEmojiView,
  isMobile,
}: VirtualizedExplorerGridProps) {
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

  // Update columns on resize with debounce
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setColumns(getColumns())
      }, 100)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timeoutId)
    }
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
    estimateSize: () => 260, // Row height: card (~200px) + grid gap (~20px) + row padding (~16px) + buffer
    overscan: 3,
  })

  const items = virtualizer.getVirtualItems()

  const handleEmojiClick = useCallback((emoji: Emoji, e: React.MouseEvent) => {
    if (bulkSelectionMode) {
      toggleEmojiSelection(emoji.name, e)
    } else {
      trackEmojiView(emoji.name, emoji.user_display_name || '')
      startTransition(() => {
        onEmojiClick(emoji)
      })
    }
  }, [bulkSelectionMode, toggleEmojiSelection, trackEmojiView, onEmojiClick])

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-300px)] overflow-auto"
      role="grid"
      aria-label={`Emoji grid, ${emojis.length} items`}
      style={{ contain: 'strict' }}
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
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 px-1 py-2" role="row">
                {row.map((emoji) => {
                  const isNew = showNewBadge && sinceFilter && emoji.created && emoji.created >= sinceFilter
                  const isSelected = selectedEmojis.has(emoji.name) && bulkSelectionMode

                  return (
                    <div
                      key={`${emoji.name}-${emoji.url}`}
                      role="gridcell"
                      tabIndex={0}
                      aria-label={`:${emoji.name}: emoji${emoji.user_display_name ? ` by ${emoji.user_display_name}` : ''}${isSelected ? ', selected' : ''}`}
                      className={cn(
                        "group relative flex flex-col items-center rounded-xl border bg-card text-card-foreground p-3 sm:p-4 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer w-full overflow-hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isNew && "ring-2 ring-primary/50 bg-primary/5",
                        isSelected && "ring-2 ring-primary bg-primary/5 border-primary",
                        !bulkSelectionMode && "hover:border-foreground/20"
                      )}
                      onClick={(e) => handleEmojiClick(emoji, e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleEmojiClick(emoji, e as unknown as React.MouseEvent)
                        }
                      }}
                    >
                      {/* Bulk Selection Checkbox */}
                      {bulkSelectionMode && (
                        <div className="absolute top-2 left-2 z-10">
                          <div className={cn(
                            "h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "bg-background border-muted-foreground/30"
                          )}>
                            {isSelected && <CheckSquare className="h-4 w-4" />}
                          </div>
                        </div>
                      )}

                      {/* New badge */}
                      {isNew && (
                        <Badge variant="default" className="absolute top-2 right-2 text-xs px-2 py-0.5">
                          New
                        </Badge>
                      )}

                      {/* Emoji Image */}
                      <div className="shrink-0 my-2">
                        <OptimizedEmojiImage
                          src={emoji.url || getPlaceholderImage(emoji.name)}
                          alt={`:${emoji.name}:`}
                          className="h-14 w-14 sm:h-16 sm:w-16 object-contain rounded-lg group-hover:scale-110 transition-transform duration-200"
                          onError={() => onImageError(emoji.name)}
                          fallback={
                            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                              {emoji.name.slice(0, 2).toUpperCase()}
                            </div>
                          }
                        />
                      </div>

                      {/* Emoji Details */}
                      <div className="w-full mt-auto space-y-0.5 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-card-foreground text-center truncate px-0.5" title={`:${emoji.name}:`}>
                          :{emoji.name.length > 14 ? emoji.name.slice(0, 14) + "…" : emoji.name}:
                        </p>
                        {emoji.user_display_name && (
                          <p className="text-[11px] sm:text-xs text-muted-foreground text-center truncate px-0.5" title={emoji.user_display_name}>
                            by {emoji.user_display_name.split(" ")[0]}
                          </p>
                        )}
                        {emoji.created && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground/70 text-center">
                            {new Date(emoji.created * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>

                      {/* Quick Actions - Desktop Only */}
                      {!isMobile && !bulkSelectionMode && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-1 bg-background/95 backdrop-blur-xs rounded-lg shadow-lg border p-1 z-20">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => copyEmojiName(emoji, e)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy name</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => copyEmojiUrl(emoji, e)}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy URL</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => copyImageToClipboard(emoji, e)}
                              >
                                <ImageIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy image</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
