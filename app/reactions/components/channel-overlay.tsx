"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X, Hash, Lock, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  aggregateReactions,
  getUserReactionStats,
  type ReactionEvent,
  type ChannelReactionBreakdown,
} from "@/lib/services/reaction-service"
import type { SlackChannel } from "@/app/reactions/hooks/use-reactions-state"
import { ShareOverlayButtons } from "./share-overlay-buttons"

const BAR_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

interface ChannelOverlayProps {
  channel: SlackChannel | null
  breakdown: ChannelReactionBreakdown | null
  reactionEvents: ReactionEvent[]
  customEmojiUrls: Map<string, string>
  userNameMap: Map<string, string>
  onClose: () => void
  onEmojiClick?: (name: string) => void
  dateRange?: string
}

export function ChannelOverlay({
  channel: channelProp,
  breakdown: breakdownProp,
  reactionEvents,
  customEmojiUrls,
  userNameMap,
  onClose,
  onEmojiClick,
  dateRange,
}: ChannelOverlayProps) {
  const isMobileRaw = useIsMobile()
  const isMobile = isMobileRaw ?? false
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [displayedChannel, setDisplayedChannel] = useState<SlackChannel | null>(null)
  const [displayedBreakdown, setDisplayedBreakdown] = useState<ChannelReactionBreakdown | null>(null)
  const wasDrawerOpen = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Keep displayed data around during exit animation
  useEffect(() => {
    if (channelProp && breakdownProp) {
      setDisplayedChannel(channelProp)
      setDisplayedBreakdown(breakdownProp)
    } else if (displayedChannel) {
      setIsVisible(false)
      const timer = setTimeout(() => {
        setDisplayedChannel(null)
        setDisplayedBreakdown(null)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [channelProp, breakdownProp])

  // Entry animation
  useEffect(() => {
    if (channelProp && breakdownProp) {
      if (isMobile) {
        setIsDrawerOpen(true)
      } else {
        document.body.style.overflow = "hidden"
        setTimeout(() => setIsVisible(true), 10)
        return () => {
          document.body.style.overflow = ""
        }
      }
    } else {
      setIsVisible(false)
      setIsDrawerOpen(false)
      if (!isMobile) {
        document.body.style.overflow = ""
      }
    }
  }, [channelProp, breakdownProp, isMobile])

  // Handle drawer close
  useEffect(() => {
    if (isMobile && channelProp) {
      if (isDrawerOpen) {
        wasDrawerOpen.current = true
      } else if (wasDrawerOpen.current) {
        onClose()
        wasDrawerOpen.current = false
      }
    }
  }, [isDrawerOpen, isMobile, channelProp, onClose])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => onClose(), 300)
  }

  // Compute full channel data
  const channelData = useMemo(() => {
    if (!displayedBreakdown) return null

    const channelEvents = reactionEvents.filter(
      (e) => e.channel_id === displayedBreakdown.channel_id
    )
    const allReactions = aggregateReactions(channelEvents)
      .sort((a, b) => b.total_count - a.total_count)
    const allReactors = getUserReactionStats(channelEvents)
      .sort((a, b) => b.reaction_count - a.reaction_count)

    const uniqueEmojis = allReactions.length
    const uniqueReactors = new Set(channelEvents.flatMap((e) => e.user_ids)).size
    const totalReactions = displayedBreakdown.total_count

    return { allReactions, allReactors, uniqueEmojis, uniqueReactors, totalReactions }
  }, [displayedBreakdown, reactionEvents])

  if (!displayedChannel || !displayedBreakdown || !channelData) return null
  if (!mounted) return null

  const channel = displayedChannel

  const content = (
    <TooltipProvider delayDuration={200}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {channel.is_private ? (
              <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
            ) : (
              <Hash className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <h2 className="text-lg font-semibold truncate">{channel.name}</h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ShareOverlayButtons
              contentRef={contentRef}
              filename={`${channel.name}-reactions.png`}
              dateRange={dateRange}
            />
            {!isMobile && (
              <Button variant="ghost" size="icon" onClick={handleClose} data-close-button>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground text-lg tabular-nums">
            {channelData.totalReactions.toLocaleString()}
          </span>
          <span>reactions</span>
          <span className="text-border">|</span>
          <span>{channelData.uniqueEmojis} emoji{channelData.uniqueEmojis !== 1 ? "s" : ""}</span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {channelData.uniqueReactors} {channelData.uniqueReactors === 1 ? "person" : "people"}
          </span>
          {channel.num_members > 0 && (
            <>
              <span className="text-border">|</span>
              <span>{channel.num_members} members</span>
            </>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6 overflow-auto">
        {/* All Reactions */}
        <div data-share-section>
          <h3 className="text-sm font-semibold mb-3">Reactions</h3>
          <div className="space-y-1">
            {channelData.allReactions.slice(0, 20).map((reaction, i) => {
              const url = customEmojiUrls.get(reaction.emoji_name)
              const barPct = Math.max(3, (reaction.total_count / channelData.allReactions[0].total_count) * 100)

              return (
                <div
                  key={reaction.emoji_name}
                  className={`flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-muted/40 transition-colors ${
                    onEmojiClick && url ? "cursor-pointer" : "cursor-default"
                  }`}
                  onClick={onEmojiClick && url ? () => onEmojiClick(reaction.emoji_name) : undefined}
                >
                  <div className="h-6 w-6 shrink-0 flex items-center justify-center">
                    {url && (
                      <img src={url} alt={reaction.emoji_name} className="h-5 w-5 object-contain" />
                    )}
                  </div>
                  <span className="text-sm font-medium truncate w-36 shrink-0">
                    :{reaction.emoji_name}:
                  </span>
                  <div className="flex-1 min-w-0 hidden sm:block">
                    <Progress
                      value={barPct}
                      className="h-2 bg-muted/60"
                      style={{ ["--progress-color" as string]: BAR_COLORS[i % BAR_COLORS.length] }}
                    />
                  </div>
                  <span className="text-xs font-semibold tabular-nums shrink-0 w-10 text-right">
                    {reaction.total_count.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 w-16 text-right hidden sm:block">
                    {reaction.unique_users} {reaction.unique_users === 1 ? "user" : "users"}
                  </span>
                </div>
              )
            })}
            {channelData.allReactions.length > 20 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                + {channelData.allReactions.length - 20} more emojis
              </p>
            )}
          </div>
        </div>

        {/* Top Reactors */}
        {channelData.allReactors.length > 0 && (
          <div data-share-section>
            <h3 className="text-sm font-semibold mb-3">Top Reactors</h3>
            <div className="space-y-1">
              {channelData.allReactors
                .filter((r) => userNameMap.has(r.user_id))
                .slice(0, 10)
                .map((reactor, i) => {
                  const name = userNameMap.get(reactor.user_id)
                  const maxCount = channelData.allReactors[0].reaction_count
                  const barPct = Math.max(3, (reactor.reaction_count / maxCount) * 100)

                  return (
                    <div
                      key={reactor.user_id}
                      className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-muted/40 transition-colors"
                    >
                      <span className="text-xs font-semibold text-muted-foreground w-5 text-right tabular-nums shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium truncate w-24 shrink-0">
                        {name?.split(" ")[0]}
                      </span>
                      <div className="flex-1 min-w-0 hidden sm:block">
                        <Progress
                          value={barPct}
                          className="h-2 bg-muted/60"
                          style={{ ["--progress-color" as string]: BAR_COLORS[i % BAR_COLORS.length] }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums shrink-0 w-10 text-right">
                        {reactor.reaction_count.toLocaleString()}
                      </span>
                      <div className="hidden md:flex items-center gap-0.5 shrink-0">
                        {reactor.top_emojis.slice(0, 3).map((emojiName) => {
                          const url = customEmojiUrls.get(emojiName)
                          if (!url) return null
                          return (
                            <Tooltip key={emojiName}>
                              <TooltipTrigger asChild>
                                <img src={url} alt={emojiName} className="h-4 w-4 object-contain" />
                              </TooltipTrigger>
                              <TooltipContent side="top">:{emojiName}:</TooltipContent>
                            </Tooltip>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )

  // Mobile drawer
  if (isMobile) {
    return (
      <Drawer
        open={isDrawerOpen}
        onOpenChange={(open) => {
          setIsDrawerOpen(open)
          if (!open) onClose()
        }}
      >
        <DrawerContent className="h-[90vh]">
          <div className="overflow-auto">{content}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  // Desktop overlay
  return createPortal(
    <div
      className={`fixed inset-0 z-9999 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-300 ease-out ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      <div
        ref={contentRef}
        className={`bg-card border border-border shadow-lg rounded-xl w-full max-w-3xl max-h-[75vh] overflow-auto transition-all duration-300 ease-out ${
          isVisible ? "scale-100" : "scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>,
    document.body
  )
}
