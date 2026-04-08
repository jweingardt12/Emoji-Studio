"use client"

import { Button } from "@/components/ui/button"
import { X, Check, Hash, Radio } from "lucide-react"

interface ScanProgressProps {
  status: "idle" | "scanning" | "complete" | "error"
  currentChannel: string
  channelsDone: number
  channelsTotal: number
  reactionsFound: number
  onCancel: () => void
  scannedChannels?: string[]
}

export function ScanProgress({
  status,
  currentChannel,
  channelsDone,
  channelsTotal,
  reactionsFound,
  onCancel,
  scannedChannels = [],
}: ScanProgressProps) {
  if (status !== "scanning") return null

  const percent =
    channelsTotal > 0 ? Math.round((channelsDone / channelsTotal) * 100) : 0

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <Radio className="h-4 w-4 text-primary animate-pulse" />
            <span className="absolute h-6 w-6 rounded-full bg-primary/10 animate-ping" />
          </div>
          <div className="text-sm font-medium">
            Scanning channels
            <span className="inline-flex w-6 text-muted-foreground">
              <span className="animate-[ellipsis_1.5s_infinite]">...</span>
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Cancel scan"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Channel segments */}
      <div className="px-4 py-2">
        <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
          {Array.from({ length: channelsTotal }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-500 ${
                i < channelsDone
                  ? "bg-primary"
                  : i === channelsDone
                    ? "bg-primary/60 animate-pulse"
                    : "bg-transparent"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Channel list */}
      <div className="px-4 pb-3 space-y-1">
        {scannedChannels.map((name) => (
          <div key={name} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3 w-3 text-primary shrink-0" />
            <Hash className="h-3 w-3 shrink-0" />
            <span>{name}</span>
          </div>
        ))}
        {currentChannel && (
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Radio className="h-3 w-3 text-primary animate-pulse shrink-0" />
            <Hash className="h-3 w-3 shrink-0" />
            <span>{currentChannel}</span>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-t text-xs text-muted-foreground">
        <span>{channelsDone}/{channelsTotal} channels</span>
        <span className="tabular-nums font-medium text-foreground">
          {reactionsFound.toLocaleString()} reactions found
        </span>
        <span>{percent}%</span>
      </div>

      <style jsx>{`
        @keyframes ellipsis {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
        }
      `}</style>
    </div>
  )
}
