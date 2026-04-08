"use client"

import { useState, useMemo } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Hash, Lock, ChevronDown, ChevronRight } from "lucide-react"
import type { ChannelReactionBreakdown } from "@/lib/services/reaction-service"
import type { SlackChannel } from "@/app/reactions/hooks/use-reactions-state"

interface ChannelBreakdownProps {
  breakdown: ChannelReactionBreakdown[]
  channels: SlackChannel[]
  customEmojiUrls: Map<string, string>
}

function EmojiDisplay({
  name,
  customEmojiUrls,
}: {
  name: string
  customEmojiUrls: Map<string, string>
}) {
  const url = customEmojiUrls.get(name)
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`:${name}:`}
        className="w-5 h-5 object-contain"
        title={`:${name}:`}
      />
    )
  }
  return null
}

function ChannelRow({
  item,
  channel,
  customEmojiUrls,
}: {
  item: ChannelReactionBreakdown
  channel: SlackChannel | undefined
  customEmojiUrls: Map<string, string>
}) {
  const [open, setOpen] = useState(false)

  const displayName = channel?.name ?? item.channel_id
  const isPrivate = channel?.is_private ?? false

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left group">
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform" />
        )}
        {isPrivate ? (
          <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="flex-1 font-medium truncate">{displayName}</span>
        <Badge variant="secondary" className="shrink-0 text-xs">
          {item.total_count.toLocaleString()} reactions
        </Badge>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-3 pb-3 pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {item.top_reactions.map((reaction) => (
              <div
                key={reaction.emoji_name}
                className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5"
              >
                <EmojiDisplay
                  name={reaction.emoji_name}
                  customEmojiUrls={customEmojiUrls}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">
                    :{reaction.emoji_name}:
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {reaction.total_count.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function ChannelBreakdown({
  breakdown,
  channels,
  customEmojiUrls,
}: ChannelBreakdownProps) {
  const channelMap = useMemo(() => new Map(channels.map((c) => [c.id, c])), [channels])
  const sorted = useMemo(() => [...breakdown].sort((a, b) => b.total_count - a.total_count), [breakdown])

  if (breakdown.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">By Channel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-3">
        {sorted.map((item) => (
          <ChannelRow
            key={item.channel_id}
            item={item}
            channel={channelMap.get(item.channel_id)}
            customEmojiUrls={customEmojiUrls}
          />
        ))}
      </CardContent>
    </Card>
  )
}
