"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Edit2, Trash2, User, MoreVertical, Copy, ExternalLink, CheckSquare, Square, Image as ImageIcon } from "lucide-react"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import type { MyEmoji } from "../hooks/use-my-emojis-state"

interface EmojiGridViewProps {
  sortedEmojis: MyEmoji[]
  loading: boolean
  isRefreshing: boolean
  searchQuery: string
  hasRealData: boolean
  isMobile: boolean | null
  selectedEmojiNames: Set<string>
  toggleEmojiSelection: (name: string) => void
  getAliasesForEmoji: (name: string) => string[]
  copyEmojiName: (emoji: MyEmoji) => void
  copyEmojiUrl: (emoji: MyEmoji) => void
  copyImageToClipboard: (emoji: MyEmoji) => void
  handleRename: (emoji: MyEmoji) => void
  handleDelete: (emoji: MyEmoji) => void
  setSelectedEmoji: (emoji: MyEmoji) => void
  setIsActionsDrawerOpen: (open: boolean) => void
}

export function EmojiGridView({
  sortedEmojis,
  loading,
  isRefreshing,
  searchQuery,
  hasRealData,
  isMobile,
  selectedEmojiNames,
  toggleEmojiSelection,
  getAliasesForEmoji,
  copyEmojiName,
  copyEmojiUrl,
  copyImageToClipboard,
  handleRename,
  handleDelete,
  setSelectedEmoji,
  setIsActionsDrawerOpen,
}: EmojiGridViewProps) {
  if (loading || isRefreshing) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-24 w-24 rounded-lg" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (sortedEmojis.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {searchQuery ? "No emojis found matching your search." : "You haven't created any emojis yet."}
        </p>
        {!hasRealData && (
          <p className="text-sm text-muted-foreground mt-2">
            Connect to Slack in Settings to see your emojis.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'} gap-4 sm:gap-5`}>
      {sortedEmojis.map((emoji) => (
        <ContextMenu key={emoji.name}>
          <ContextMenuTrigger asChild>
            <div
              className={`group relative flex flex-col items-center justify-between rounded-xl border-2 p-4 shadow-sm hover:shadow-lg transition-[border-color,background-color,box-shadow] duration-200 cursor-pointer ${selectedEmojiNames.has(emoji.name) ? 'bg-primary/10 border-primary shadow-md' : 'bg-card hover:border-primary/40'}`}
              onClick={() => toggleEmojiSelection(emoji.name)}
              onContextMenu={(e) => {
                e.stopPropagation()
              }}
            >
              {/* Selection Checkbox */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 left-2 h-6 w-6 bg-background/80 backdrop-blur-sm z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleEmojiSelection(emoji.name)
                }}
              >
                {selectedEmojiNames.has(emoji.name) ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </Button>

              {/* Emoji Image - Larger */}
              <div className={`relative ${isMobile ? 'h-16 w-16' : 'h-20 w-20 sm:h-24 sm:w-24'} mb-3 mt-2`}>
                <Image
                  src={emoji.url}
                  alt={emoji.name}
                  fill
                  className="object-contain rounded-lg group-hover:scale-110 transition-transform duration-200"
                  unoptimized
                />
              </div>

              {/* Emoji Info */}
              <div className="w-full space-y-1">
                <p className="text-sm font-semibold text-foreground text-center truncate px-1" title={`:${emoji.name}:`}>:{emoji.name.length > 14 ? emoji.name.slice(0, 14) + "\u2026" : emoji.name}:</p>
                {emoji.created && (
                  <p className="text-xs text-muted-foreground/80 text-center">
                    {formatDistanceToNow(new Date(emoji.created * 1000), { addSuffix: true })}
                  </p>
                )}
                {emoji.is_alias === 1 && emoji.alias_for ? (
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-xs">
                      alias of :{emoji.alias_for}:
                    </Badge>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const aliases = getAliasesForEmoji(emoji.name)
                      if (aliases.length > 0) {
                        return (
                          <div className="mt-1 flex flex-wrap gap-1 justify-center">
                            {aliases.slice(0, 2).map(alias => (
                              <Badge key={alias} variant="outline" className="text-xs">
                                :{alias}:
                              </Badge>
                            ))}
                            {aliases.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{aliases.length - 2}
                              </Badge>
                            )}
                          </div>
                        )
                      }
                      return null
                    })()}
                  </>
                )}
              </div>

              {/* Action Buttons */}
              {isMobile ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 bg-background/80 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedEmoji(emoji)
                    setIsActionsDrawerOpen(true)
                  }}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              ) : (
                /* Desktop Quick Actions - Floating Toolbar positioned at top to avoid covering text */
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-1 z-20">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyEmojiName(emoji)
                        }}
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
                        onClick={(e) => {
                          e.stopPropagation()
                          copyEmojiUrl(emoji)
                        }}
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
                        onClick={(e) => {
                          e.stopPropagation()
                          copyImageToClipboard(emoji)
                        }}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy image</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRename(emoji)
                        }}
                        disabled={emoji.is_alias === 1}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {emoji.is_alias === 1 ? "Cannot rename aliases" : "Rename"}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(emoji)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={(e) => {
              e.stopPropagation()
              copyEmojiName(emoji)
            }}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Name
            </ContextMenuItem>
            <ContextMenuItem onClick={(e) => {
              e.stopPropagation()
              copyEmojiUrl(emoji)
            }}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Copy URL
            </ContextMenuItem>
            <ContextMenuItem onClick={(e) => {
              e.stopPropagation()
              copyImageToClipboard(emoji)
            }}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Copy Image
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={(e) => {
              e.stopPropagation()
              handleRename(emoji)
            }} disabled={emoji.is_alias === 1}>
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={(e) => {
              e.stopPropagation()
              handleDelete(emoji)
            }} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </div>
  )
}
