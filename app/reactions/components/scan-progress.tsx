"use client"

import { Button } from "@/components/ui/button"
import { X, Loader2 } from "lucide-react"

interface ScanProgressProps {
  status: "idle" | "scanning" | "complete" | "error"
  currentChannel: string
  channelsDone: number
  channelsTotal: number
  reactionsFound: number
  onCancel: () => void
}

export function ScanProgress({
  status,
  currentChannel,
  channelsDone,
  channelsTotal,
  reactionsFound,
  onCancel,
}: ScanProgressProps) {
  if (status !== "scanning") return null

  const percent =
    channelsTotal > 0 ? Math.round((channelsDone / channelsTotal) * 100) : 0

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          <span className="font-medium">
            {currentChannel ? (
              <>
                Scanning{" "}
                <span className="text-primary">#{currentChannel}</span>
                {channelsTotal > 0 && (
                  <span className="text-muted-foreground ml-1">
                    ({channelsDone + 1}/{channelsTotal} channels)
                  </span>
                )}
              </>
            ) : (
              "Starting scan…"
            )}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-7 w-7 p-0 shrink-0"
          aria-label="Cancel scan"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {channelsDone} of {channelsTotal} channels scanned
        </span>
        <span>
          {reactionsFound.toLocaleString()} reactions found
        </span>
      </div>
    </div>
  )
}
