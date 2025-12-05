"use client"

import { useState, RefObject, useCallback } from "react"
import { Share2, Copy, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  generateImage,
  copyImageToClipboard,
  downloadImage,
  shareImage,
  canShare,
} from "@/lib/utils/share-image"
import { useTrack } from "@/lib/hooks/use-track"

interface SlideShareButtonProps {
  slideRef: RefObject<HTMLDivElement | null>
  slideName: string
  workspaceName: string
  year: number
  backgroundColor?: string
  onCaptureStart?: () => void
  onCaptureEnd?: () => void
}

export function SlideShareButton({
  slideRef,
  slideName,
  workspaceName,
  year,
  backgroundColor = "#1e1b4b", // Default dark purple
  onCaptureStart,
  onCaptureEnd,
}: SlideShareButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const canShareFiles = canShare()
  const track = useTrack()

  const captureSlide = useCallback(async (): Promise<Blob | null> => {
    const element = slideRef.current
    if (!element) {
      toast.error("Could not capture slide")
      return null
    }
    try {
      // Signal capture start for any parent components that need to switch to static mode
      onCaptureStart?.()
      // Small delay to allow React to re-render with captureMode
      await new Promise(resolve => setTimeout(resolve, 100))

      const blob = await generateImage(element, backgroundColor)

      // Signal capture end
      onCaptureEnd?.()

      return blob
    } catch (error) {
      console.error("Failed to capture slide:", error)
      toast.error("Failed to capture slide")
      onCaptureEnd?.()
      return null
    }
  }, [slideRef, backgroundColor, onCaptureStart, onCaptureEnd])

  const handleCopy = async () => {
    setIsGenerating(true)
    setActiveAction("copy")
    try {
      const blob = await captureSlide()
      if (!blob) return
      await copyImageToClipboard(blob)
      toast.success("Copied to clipboard!")
      track("wrapped_slide_shared", {
        slide_name: slideName,
        action: "copy",
        year,
      })
    } catch (error) {
      console.error("Failed to copy:", error)
      toast.error("Failed to copy to clipboard")
    } finally {
      setIsGenerating(false)
      setActiveAction(null)
    }
  }

  const handleDownload = async () => {
    setIsGenerating(true)
    setActiveAction("download")
    try {
      const blob = await captureSlide()
      if (!blob) return
      const filename = `emoji-wrapped-${year}-${workspaceName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${slideName}`
      downloadImage(blob, `${filename}.png`)
      toast.success("Downloaded!")
      track("wrapped_slide_shared", {
        slide_name: slideName,
        action: "download",
        year,
      })
    } catch (error) {
      console.error("Failed to download:", error)
      toast.error("Failed to download")
    } finally {
      setIsGenerating(false)
      setActiveAction(null)
    }
  }

  const handleShare = async () => {
    setIsGenerating(true)
    setActiveAction("share")
    try {
      const blob = await captureSlide()
      if (!blob) return
      const title = `${workspaceName} Emoji Wrapped ${year}`
      const text = `Check out this slide from our Emoji Wrapped! Made with Emoji Studio`
      const shared = await shareImage(blob, title, text)
      if (shared) {
        track("wrapped_slide_shared", {
          slide_name: slideName,
          action: "share",
          year,
        })
      }
    } catch (error) {
      console.error("Failed to share:", error)
      toast.error("Failed to share")
    } finally {
      setIsGenerating(false)
      setActiveAction(null)
    }
  }

  return (
    <div
      className="flex items-center justify-center gap-2 mt-6"
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        disabled={isGenerating}
        className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0 gap-2"
      >
        {isGenerating && activeAction === "copy" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
        <span className="text-sm">Copy</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleDownload}
        disabled={isGenerating}
        className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0 gap-2"
      >
        {isGenerating && activeAction === "download" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span className="text-sm">Save</span>
      </Button>

      {canShareFiles && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          disabled={isGenerating}
          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0 gap-2"
        >
          {isGenerating && activeAction === "share" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
          <span className="text-sm">Share</span>
        </Button>
      )}
    </div>
  )
}
