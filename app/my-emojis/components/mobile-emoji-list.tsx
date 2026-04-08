"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { User, MoreVertical } from "lucide-react"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import type { MyEmoji, ViewMode } from "../hooks/use-my-emojis-state"

interface MobileEmojiListProps {
  sortedEmojis: MyEmoji[]
  loading: boolean
  isRefreshing: boolean
  searchQuery: string
  hasRealData: boolean
  viewMode: ViewMode
  getAliasesForEmoji: (name: string) => string[]
  setSelectedEmoji: (emoji: MyEmoji) => void
  setIsActionsDrawerOpen: (open: boolean) => void
}

export function MobileEmojiList({
  sortedEmojis,
  loading,
  isRefreshing,
  searchQuery,
  hasRealData,
  viewMode,
  getAliasesForEmoji,
  setSelectedEmoji,
  setIsActionsDrawerOpen,
}: MobileEmojiListProps) {
  if (loading || isRefreshing) {
    return viewMode === "table" ? (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-16 w-16 rounded-lg" />
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

  if (viewMode === "table") {
    return (
      <div className="space-y-2">
        {sortedEmojis.map((emoji) => (
          <div key={emoji.name} className="flex items-center gap-3 p-3 border-b bg-card">
            <div className="relative h-12 w-12 flex-shrink-0">
              <Image
                src={emoji.url}
                alt={emoji.name}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">:{emoji.name}:</p>
              {emoji.created && (
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(emoji.created * 1000), { addSuffix: true })}
                </p>
              )}
              {(() => {
                const aliases = getAliasesForEmoji(emoji.name)
                if (aliases.length > 0) {
                  return (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {aliases.slice(0, 2).map(alias => (
                        <Badge key={alias} variant="outline" className="text-xs py-0 px-1">
                          :{alias}:
                        </Badge>
                      ))}
                      {aliases.length > 2 && (
                        <Badge variant="outline" className="text-xs py-0 px-1">
                          +{aliases.length - 2}
                        </Badge>
                      )}
                    </div>
                  )
                }
                return null
              })()}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => {
                setSelectedEmoji(emoji)
                setIsActionsDrawerOpen(true)
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    )
  }

  // Grid view
  return (
    <div className="grid grid-cols-2 gap-2 px-2">
      {sortedEmojis.map((emoji) => (
        <div
          key={emoji.name}
          className="group relative flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
        >
          {/* Emoji Image */}
          <div className="relative h-16 w-16">
            <Image
              src={emoji.url}
              alt={emoji.name}
              fill
              className="object-contain"
              unoptimized
            />
          </div>

          {/* Emoji Info */}
          <div className="text-center w-full">
            <p className="font-medium text-sm truncate">:{emoji.name}:</p>
            {emoji.created && (
              <p className="text-xs text-muted-foreground">
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

          {/* Action Button for Mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 bg-background/80 backdrop-blur-sm"
            onClick={() => {
              setSelectedEmoji(emoji)
              setIsActionsDrawerOpen(true)
            }}
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  )
}
