"use client"

import { Progress } from "@/components/ui/progress"
import { Loader2 as LoaderIcon, CheckCircle2 } from "lucide-react"

interface LoadingOverlayProps {
  isOpen: boolean
  progress: number
  loadingStage: string
  isSuccess?: boolean
}

export function LoadingOverlay({ isOpen, progress, loadingStage, isSuccess }: LoadingOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="mx-auto max-w-md px-4">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center rounded-full bg-muted p-4">
              {isSuccess ? (
                <CheckCircle2 className="h-8 w-8 text-green-600 animate-in zoom-in duration-300" />
              ) : (
                <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
              )}
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                {isSuccess ? "Successfully synced custom Slack emojis!" : (loadingStage || "Processing, please wait...")}
              </h2>
              <p className="text-muted-foreground">
                {isSuccess ? "Your emojis are ready to explore!" : "Syncing your emojis from Slack"}
              </p>
            </div>
            {!isSuccess && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full h-3" />
                <p className="text-sm text-muted-foreground">
                  {progress}% complete
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
