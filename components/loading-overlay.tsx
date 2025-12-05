"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Progress } from "@/components/ui/progress"
import { Loader2 as LoaderIcon, CheckCircle2 } from "lucide-react"
import { WarpBackgroundSimple } from "./warp-background-simple"
import { cn } from "@/lib/utils"

interface LoadingOverlayProps {
  isOpen: boolean
  progress: number
  loadingStage: string
  isSuccess?: boolean
  onTransitionComplete?: () => void
}

export function LoadingOverlay({ isOpen, progress, loadingStage, isSuccess, onTransitionComplete }: LoadingOverlayProps) {
  const [shouldRender, setShouldRender] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      // Small delay to ensure the DOM is ready before starting animation
      requestAnimationFrame(() => {
        setIsVisible(true)
      })
    } else {
      setIsVisible(false)
      const timer = setTimeout(() => {
        setShouldRender(false)
        onTransitionComplete?.()
      }, 300) // Match transition duration
      return () => clearTimeout(timer)
    }
  }, [isOpen, onTransitionComplete])

  if (!shouldRender || !mounted) return null;

  return createPortal(
    <div className={cn(
      "fixed inset-0 z-[9999] transition-all duration-300 ease-out",
      isVisible ? "opacity-100" : "opacity-0"
    )}>
      {/* Full opaque background */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Simplified WarpBackground - now with more beams and faster animation */}
      <div className="absolute inset-0 overflow-hidden">
        <WarpBackgroundSimple 
          className="absolute inset-0"
          beamsPerSide={12}
          beamDelayMax={6}
          beamDelayMin={0}
          beamDuration={8}
        >
          <div className="absolute inset-0" />
        </WarpBackgroundSimple>
      </div>
      
      {/* Content overlay */}
      <div className="relative z-10 flex h-full w-full items-center justify-center">
        <div className={cn(
          "mx-auto max-w-md px-4 transition-all duration-300 ease-out",
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}>
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center rounded-full bg-background/90 backdrop-blur-sm border p-4 shadow-lg">
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
    </div>,
    document.body
  )
}
