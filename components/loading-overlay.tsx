"use client"

import { Progress } from "@/components/ui/progress"
import { Loader2 as LoaderIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface LoadingOverlayProps {
  isOpen: boolean
  progress: number
  loadingStage: string
}

export function LoadingOverlay({ isOpen, progress, loadingStage }: LoadingOverlayProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} modal={true}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center mb-2">
            <LoaderIcon className="mr-2 h-5 w-5 animate-spin" />
            {loadingStage || "Processing, please wait..."}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Progress value={progress} className="w-full h-2.5" />
          <p className="text-center text-sm text-muted-foreground mt-2">
            {progress}% complete
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
