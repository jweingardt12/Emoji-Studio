"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Hash, Lock } from "lucide-react"
import type { ChannelReactionBreakdown } from "@/lib/services/reaction-service"
import type { SlackChannel } from "@/app/reactions/hooks/use-reactions-state"

interface ChannelBreakdownProps {
  breakdown: ChannelReactionBreakdown[]
  channels: SlackChannel[]
  customEmojiUrls: Map<string, string>
  userNameMap: Map<string, string>
  onEmojiClick?: (name: string) => void
  onChannelClick?: (channelId: string) => void
}

export function ChannelBreakdown({
  breakdown,
  channels,
  customEmojiUrls,
  userNameMap,
  onEmojiClick,
  onChannelClick,
}: ChannelBreakdownProps) {
  const channelMap = useMemo(() => new Map(channels.map((c) => [c.id, c])), [channels])
  const sorted = useMemo(() => [...breakdown].sort((a, b) => b.total_count - a.total_count), [breakdown])

  if (breakdown.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">By Channel</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <TooltipProvider delayDuration={200}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Channel</TableHead>
                <TableHead className="text-right w-24">Reactions</TableHead>
                <TableHead className="w-[220px]">Top Reactions</TableHead>
                <TableHead className="hidden md:table-cell w-[200px]">Top Reactors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((item) => {
                const channel = channelMap.get(item.channel_id)
                const displayName = channel?.name ?? item.channel_id
                const isPrivate = channel?.is_private ?? false
                const namedReactors = item.top_reactors
                  .filter((r) => userNameMap.has(r.user_id))
                  .slice(0, 3)

                return (
                  <TableRow
                    key={item.channel_id}
                    className={onChannelClick ? "cursor-pointer" : ""}
                    onClick={onChannelClick ? () => onChannelClick(item.channel_id) : undefined}
                  >
                    {/* Channel */}
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-1.5">
                        {isPrivate ? (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate max-w-[200px]">{displayName}</span>
                      </div>
                    </TableCell>

                    {/* Reactions count */}
                    <TableCell className="text-right tabular-nums font-semibold">
                      {item.total_count.toLocaleString()}
                    </TableCell>

                    {/* Top Reactions */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.top_reactions.slice(0, 4).map((reaction) => {
                          const url = customEmojiUrls.get(reaction.emoji_name)
                          return (
                            <Tooltip key={reaction.emoji_name}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 ${
                                    onEmojiClick && url ? "cursor-pointer hover:bg-muted" : "cursor-default"
                                  }`}
                                  onClick={onEmojiClick && url ? () => onEmojiClick(reaction.emoji_name) : undefined}
                                >
                                  {url ? (
                                    <img
                                      src={url}
                                      alt={reaction.emoji_name}
                                      className="w-4 h-4 object-contain"
                                    />
                                  ) : (
                                    <span className="text-xs">:{reaction.emoji_name}:</span>
                                  )}
                                  <span className="text-[11px] tabular-nums text-muted-foreground">
                                    {reaction.total_count}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                :{reaction.emoji_name}: — {reaction.total_count} reaction{reaction.total_count !== 1 ? "s" : ""}
                              </TooltipContent>
                            </Tooltip>
                          )
                        })}
                      </div>
                    </TableCell>

                    {/* Top Reactors */}
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {namedReactors.map((reactor) => {
                          const name = userNameMap.get(reactor.user_id)
                          return (
                            <span
                              key={reactor.user_id}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 text-xs"
                            >
                              <span className="font-medium">{name?.split(" ")[0]}</span>
                              <span className="text-muted-foreground tabular-nums">{reactor.reaction_count}</span>
                            </span>
                          )
                        })}
                        {namedReactors.length === 0 && item.top_reactors.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {item.top_reactors.length} {item.top_reactors.length === 1 ? "person" : "people"}
                          </span>
                        )}
                        {namedReactors.length > 0 && namedReactors.length < item.top_reactors.length && (
                          <span className="text-xs text-muted-foreground">
                            +{item.top_reactors.length - namedReactors.length}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
