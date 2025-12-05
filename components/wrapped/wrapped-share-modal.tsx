"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Copy, Download, Share2, Check, Image, Film, Video, Square, Smartphone, Monitor } from "lucide-react"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTrack } from "@/lib/hooks/use-track"
import {
  WrappedShareCard,
  WrappedShareCardFull,
  WrappedShareCardAnimated,
  WRAPPED_BACKGROUNDS,
  WRAPPED_SIZES,
  type WrappedBackgroundStyle,
  type WrappedCardSize,
} from "./wrapped-share-card"
import { WrappedStats } from "@/lib/services/wrapped-service"
import {
  generateImage,
  copyImageToClipboard,
  downloadImage,
  shareImage,
  canShare,
  generateGif,
  downloadGif,
  shareGif,
  generateVideo,
  downloadVideo,
  shareVideo,
  captureElementAsCanvas,
} from "@/lib/utils/share-image"
import { cn } from "@/lib/utils"

interface WrappedShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stats: WrappedStats
  workspaceName: string
}

type ExportFormat = "image" | "gif" | "video"

const SIZE_ICONS: Record<WrappedCardSize, React.ReactNode> = {
  square: <Square className="w-4 h-4" />,
  story: <Smartphone className="w-4 h-4" />,
  wide: <Monitor className="w-4 h-4" />,
}

export function WrappedShareModal({
  open,
  onOpenChange,
  stats,
  workspaceName,
}: WrappedShareModalProps) {
  const isMobile = useIsMobile()
  const track = useTrack()
  const cardRef = useRef<HTMLDivElement>(null)
  const fullCardRef = useRef<HTMLDivElement>(null)

  const [backgroundStyle, setBackgroundStyle] = useState<WrappedBackgroundStyle>("purple")
  const [cardSize, setCardSize] = useState<WrappedCardSize>("square")
  const [exportFormat, setExportFormat] = useState<ExportFormat>("image")
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [canShareFiles, setCanShareFiles] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [animationProgress, setAnimationProgress] = useState(0)
  const animatedCardRef = useRef<HTMLDivElement>(null)

  // Check Web Share API support
  useEffect(() => {
    setCanShareFiles(canShare())
  }, [])

  // Track modal opened
  useEffect(() => {
    if (open) {
      track("wrapped_share_opened", {
        year: stats.year,
        total_emojis: stats.overview.totalEmojis,
      })
    }
  }, [open, track, stats])

  // Handlers for customization options with tracking
  const handleBackgroundChange = (style: WrappedBackgroundStyle) => {
    setBackgroundStyle(style)
    track("wrapped_share_customized", {
      option: "background",
      value: style,
      year: stats.year,
    })
  }

  const handleSizeChange = (size: WrappedCardSize) => {
    setCardSize(size)
    track("wrapped_share_customized", {
      option: "size",
      value: size,
      year: stats.year,
    })
  }

  const handleFormatChange = (format: ExportFormat) => {
    setExportFormat(format)
    track("wrapped_share_customized", {
      option: "format",
      value: format,
      year: stats.year,
    })
  }

  const getFullCardElement = useCallback((): HTMLElement | null => {
    return document.getElementById("wrapped-share-card-full")
  }, [])

  const getAnimatedCardElement = useCallback((): HTMLElement | null => {
    return document.getElementById("wrapped-share-card-animated")
  }, [])

  // Capture a frame with a specific animation progress
  const captureAnimatedFrame = useCallback(async (progress: number): Promise<HTMLCanvasElement> => {
    // Update animation progress state
    setAnimationProgress(progress)

    // Wait for React to re-render
    await new Promise(resolve => setTimeout(resolve, 16)) // ~1 frame at 60fps

    const element = getAnimatedCardElement()
    if (!element) throw new Error("Animated card element not found")

    return captureElementAsCanvas(element)
  }, [getAnimatedCardElement])

  // Render full-size cards for export (static + animated)
  const renderFullCard = useCallback(() => {
    return (
      <>
        {/* Static card for image export */}
        <div
          ref={fullCardRef}
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
          }}
        >
          <WrappedShareCardFull
            stats={stats}
            workspaceName={workspaceName}
            backgroundStyle={backgroundStyle}
            size={cardSize}
          />
        </div>
        {/* Animated card for video/GIF export */}
        <div
          ref={animatedCardRef}
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
          }}
        >
          <WrappedShareCardAnimated
            stats={stats}
            workspaceName={workspaceName}
            backgroundStyle={backgroundStyle}
            size={cardSize}
            animationProgress={animationProgress}
          />
        </div>
      </>
    )
  }, [stats, workspaceName, backgroundStyle, cardSize, animationProgress])

  const handleCopy = useCallback(async () => {
    if (isGenerating) return
    setIsGenerating(true)
    setCopied(false)

    try {
      const element = getFullCardElement()
      if (!element) throw new Error("Card element not found")

      const blob = await generateImage(element)
      await copyImageToClipboard(blob)

      setCopied(true)
      toast.success("Copied to clipboard!")
      track("wrapped_share_copied", {
        year: stats.year,
        background: backgroundStyle,
        size: cardSize,
      })

      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
      toast.error("Failed to copy image")
    } finally {
      setIsGenerating(false)
    }
  }, [isGenerating, getFullCardElement, track, stats.year, backgroundStyle, cardSize])

  const handleDownload = useCallback(async () => {
    if (isGenerating) return
    setIsGenerating(true)
    setGenerationProgress(0)

    try {
      const element = getFullCardElement()
      if (!element) throw new Error("Card element not found")

      const filename = `emoji-wrapped-${stats.year}-${workspaceName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`

      if (exportFormat === "video") {
        // Generate MP4 video with animated content
        // 150 frames at 30fps = 5 second video
        const totalFrames = 150
        const blob = await generateVideo(
          async (frameIndex: number) => {
            const progress = frameIndex / (totalFrames - 1)
            return captureAnimatedFrame(progress)
          },
          totalFrames,
          30,
          setGenerationProgress
        )
        downloadVideo(blob, filename)
        toast.success("Video downloaded!")
      } else if (exportFormat === "gif") {
        // Generate animated GIF with animated content
        // 30 frames at 10fps = 3 second GIF
        const totalFrames = 30
        const blob = await generateGif(
          async (frameIndex: number) => {
            const progress = frameIndex / (totalFrames - 1)
            return captureAnimatedFrame(progress)
          },
          totalFrames,
          100, // 100ms delay between frames in GIF (10fps)
          0, // No additional capture interval needed since we control progress
          setGenerationProgress
        )
        downloadGif(blob, filename)
        toast.success("GIF downloaded!")
      } else {
        const blob = await generateImage(element)
        downloadImage(blob, `${filename}.png`)
        toast.success("Image downloaded!")
      }

      track("wrapped_share_downloaded", {
        year: stats.year,
        format: exportFormat,
        background: backgroundStyle,
        size: cardSize,
      })
    } catch (error) {
      console.error("Failed to download:", error)
      toast.error("Failed to download")
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }, [isGenerating, getFullCardElement, captureAnimatedFrame, exportFormat, stats.year, workspaceName, track, backgroundStyle, cardSize])

  const handleShare = useCallback(async () => {
    if (isGenerating) return
    setIsGenerating(true)
    setGenerationProgress(0)

    try {
      const element = getFullCardElement()
      if (!element) throw new Error("Card element not found")

      const title = `${workspaceName} Emoji Wrapped ${stats.year}`
      const text = `Check out our emoji stats from ${stats.year}! Created with Emoji Studio`
      let shared = false

      if (exportFormat === "video") {
        const totalFrames = 150
        const blob = await generateVideo(
          async (frameIndex: number) => {
            const progress = frameIndex / (totalFrames - 1)
            return captureAnimatedFrame(progress)
          },
          totalFrames,
          30,
          setGenerationProgress
        )
        shared = await shareVideo(blob, title, text)
      } else if (exportFormat === "gif") {
        const totalFrames = 30
        const blob = await generateGif(
          async (frameIndex: number) => {
            const progress = frameIndex / (totalFrames - 1)
            return captureAnimatedFrame(progress)
          },
          totalFrames,
          100,
          0,
          setGenerationProgress
        )
        shared = await shareGif(blob, title, text)
      } else {
        const blob = await generateImage(element)
        shared = await shareImage(blob, title, text)
      }

      if (shared) {
        track("wrapped_share_shared", {
          year: stats.year,
          format: exportFormat,
          background: backgroundStyle,
          size: cardSize,
        })
      }
    } catch (error) {
      console.error("Failed to share:", error)
      toast.error("Failed to share")
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }, [isGenerating, getFullCardElement, captureAnimatedFrame, workspaceName, stats.year, track, backgroundStyle, cardSize, exportFormat])

  const ModalContent = (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex justify-center">
        <WrappedShareCard
          stats={stats}
          workspaceName={workspaceName}
          backgroundStyle={backgroundStyle}
          size={cardSize}
        />
      </div>

      {/* Background selection */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">Background</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(WRAPPED_BACKGROUNDS) as WrappedBackgroundStyle[]).map((style) => (
            <button
              key={style}
              onClick={() => handleBackgroundChange(style)}
              className={cn(
                "w-8 h-8 rounded-full border-2 transition-all",
                backgroundStyle === style
                  ? "border-white scale-110 ring-2 ring-white/30"
                  : "border-transparent hover:border-white/50"
              )}
              style={{ background: WRAPPED_BACKGROUNDS[style].gradient }}
              title={WRAPPED_BACKGROUNDS[style].label}
            />
          ))}
        </div>
      </div>

      {/* Size selection */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">Size</label>
        <ToggleGroup
          type="single"
          value={cardSize}
          onValueChange={(v) => v && handleSizeChange(v as WrappedCardSize)}
          className="justify-start"
        >
          {(Object.keys(WRAPPED_SIZES) as WrappedCardSize[]).map((size) => (
            <ToggleGroupItem key={size} value={size} className="gap-2">
              {SIZE_ICONS[size]}
              <span className="hidden sm:inline">{size.charAt(0).toUpperCase() + size.slice(1)}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Format selection */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">Format</label>
        <ToggleGroup
          type="single"
          value={exportFormat}
          onValueChange={(v) => v && handleFormatChange(v as ExportFormat)}
          className="justify-start"
        >
          <ToggleGroupItem value="image" className="gap-2">
            <Image className="w-4 h-4" />
            <span>Image</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="gif" className="gap-2">
            <Film className="w-4 h-4" />
            <span>GIF</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="video" className="gap-2">
            <Video className="w-4 h-4" />
            <span>Video</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Progress bar */}
      {isGenerating && generationProgress > 0 && (
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${generationProgress * 100}%` }}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleCopy}
          disabled={isGenerating}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </>
          )}
        </Button>

        <Button
          variant="outline"
          className="flex-1"
          onClick={handleDownload}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {Math.round(generationProgress * 100)}%
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download
            </>
          )}
        </Button>

        {canShareFiles && (
          <Button
            className="flex-1"
            onClick={handleShare}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4 mr-2" />
            )}
            Share
          </Button>
        )}
      </div>

      {/* Hidden full-size card for export */}
      {renderFullCard()}
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Share Your Wrapped</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {ModalContent}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Wrapped</DialogTitle>
        </DialogHeader>
        {ModalContent}
      </DialogContent>
    </Dialog>
  )
}
