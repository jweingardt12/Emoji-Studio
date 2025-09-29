"use client"

import { Loader2, CheckCircle2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface EmojiImportStatusProps {
  isActive: boolean
  progress: number
  stage?: string
  description?: string
  isSuccess?: boolean
  className?: string
}
export function EmojiImportStatus({
  isActive,
  progress,
  stage,
  description,
  isSuccess,
  className,
}: EmojiImportStatusProps) {
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)))
  const isComplete = Boolean(isSuccess || (!isActive && clampedProgress >= 100))
  const shouldRender = isActive || isComplete

  if (!shouldRender) return null

  const heading = stage || (isComplete ? "Emoji import finished" : "Syncing emojis…")
  const helperText =
    description ||
    (isComplete
      ? "All set—your emojis are ready to explore."
      : "Hang tight while we bring in your custom emoji library.")

  return (
    <div
      className={cn(
        "rounded-lg border bg-card/95 p-4 shadow-sm backdrop-blur-sm",
        className,
      )}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {isComplete ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
        ) : (
          <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-primary" />
        )}
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-sm font-semibold leading-none">{heading}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{helperText}</p>
          </div>
          <div className="space-y-1.5">
            <Progress value={clampedProgress} className="h-2" />
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
              <span>{isComplete ? "Complete" : "In progress"}</span>
              <span>{clampedProgress}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
