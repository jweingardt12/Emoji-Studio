"use client"

import { useState, useEffect, RefObject, useCallback } from "react"
import { Share2, Copy, Download, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  generateImage,
  copyImageToClipboard,
  downloadImage,
  shareImageWithResult,
  blobToDataUrl,
  shouldUseInlineFallback,
} from "@/lib/utils/share-image"
import { isIOS, isWebView, supportsClipboardWriteImage } from "@/lib/utils/ios-detection"
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
  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null)
  const [showFallback, setShowFallback] = useState(false)
  const [needsFallback, setNeedsFallback] = useState(false)
  const track = useTrack()

  // Check if we need inline fallback on mount
  useEffect(() => {
    setNeedsFallback(shouldUseInlineFallback())
  }, [])

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
    // Check if clipboard is supported on this device before even trying
    if (!supportsClipboardWriteImage() && (isIOS() || isWebView())) {
      toast.error("Copying images isn't supported on this device. Use Share instead.", {
        duration: 4000,
      })
      return
    }

    setIsGenerating(true)
    setActiveAction("copy")
    try {
      const blob = await captureSlide()
      if (!blob) return

      const result = await copyImageToClipboard(blob)

      if (result.success) {
        toast.success(result.message)
        track("wrapped_slide_shared", {
          slide_name: slideName,
          action: "copy",
          year,
        })
      } else if (result.fallbackToShare) {
        toast.error(result.message, { duration: 4000 })
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Failed to copy:", error)
      if (isIOS() || isWebView()) {
        toast.error("Copying failed on this device. Use Share instead.", { duration: 4000 })
      } else {
        toast.error("Failed to copy to clipboard")
      }
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
      const result = await downloadImage(blob, `${filename}.png`)

      if (result.success) {
        // Show appropriate toast based on the method used
        if (result.method === "open") {
          // Special message for iOS fallback where image opens in new tab
          toast.success(result.message, { duration: 5000 })
        } else {
          toast.success(result.message)
        }

        track("wrapped_slide_shared", {
          slide_name: slideName,
          action: "download",
          year,
          method: result.method,
        })
      } else {
        toast.error(result.message, { duration: 4000 })
      }
    } catch (error) {
      console.error("Failed to download:", error)
      if (isIOS() || isWebView()) {
        toast.error("Download failed. Try using Share instead.", { duration: 4000 })
      } else {
        toast.error("Failed to download")
      }
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
      const result = await shareImageWithResult(blob, title, text)

      if (result.success && !result.cancelled) {
        // Show appropriate message based on the method used
        if (result.method === "download") {
          toast.success(result.message, { duration: 4000 })
        } else {
          toast.success(result.message)
        }

        track("wrapped_slide_shared", {
          slide_name: slideName,
          action: "share",
          year,
          method: result.method,
        })
      } else if (!result.success) {
        toast.error(result.message, { duration: 4000 })
      }
    } catch (error) {
      console.error("Failed to share:", error)
      toast.error("Failed to share")
    } finally {
      setIsGenerating(false)
      setActiveAction(null)
    }
  }

  // WebView fallback handler - generates image and shows inline for long-press save
  const handleSaveForWebView = async () => {
    setIsGenerating(true)
    setActiveAction("save")
    try {
      const blob = await captureSlide()
      if (!blob) return

      // Convert to data URL for inline display
      const dataUrl = await blobToDataUrl(blob)
      setFallbackImageUrl(dataUrl)
      setShowFallback(true)

      track("wrapped_slide_shared", {
        slide_name: slideName,
        action: "fallback_save",
        year,
      })

      toast.success("Image ready! Long-press to save.", { duration: 4000 })
    } catch (error) {
      console.error("Failed to generate image:", error)
      toast.error("Failed to generate image")
    } finally {
      setIsGenerating(false)
      setActiveAction(null)
    }
  }

  const closeFallback = () => {
    setShowFallback(false)
    setFallbackImageUrl(null)
  }

  // If showing fallback image, render the fallback UI
  if (showFallback && fallbackImageUrl) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative max-w-lg w-full bg-background rounded-xl p-4 space-y-4">
          {/* Close button */}
          <button
            onClick={closeFallback}
            className="absolute top-2 right-2 p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title */}
          <div className="text-center pt-2">
            <h3 className="text-lg font-semibold">Save Your Image</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Long-press the image and select "Save Image"
            </p>
          </div>

          {/* Image for long-press save */}
          <div className="flex justify-center">
            <img
              src={fallbackImageUrl}
              alt="Share card"
              className="max-w-full max-h-[50vh] rounded-lg shadow-lg object-contain"
              style={{ touchAction: "manipulation" }}
            />
          </div>

          {/* Close button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={closeFallback}
          >
            Done
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex items-center justify-center gap-2 mt-6"
      onClick={(e) => e.stopPropagation()}
    >
      {/* WebView fallback: Primary "Save" button that generates inline image */}
      {needsFallback ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveForWebView}
          disabled={isGenerating}
          className="bg-white/30 hover:bg-white/40 backdrop-blur-sm text-white border-0 gap-2"
        >
          {isGenerating && activeAction === "save" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="text-sm">Save</span>
        </Button>
      ) : (
        <>
          {/* Copy button */}
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

          {/* Download/Save button */}
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

          {/* Share button - always visible, with built-in fallbacks */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            disabled={isGenerating}
            className="bg-white/30 hover:bg-white/40 backdrop-blur-sm text-white border-0 gap-2"
          >
            {isGenerating && activeAction === "share" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            <span className="text-sm">Share</span>
          </Button>
        </>
      )}
    </div>
  )
}
