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
import { Loader2, Copy, Download, Share2, Check, Image, Film, Video, Square, Smartphone, Monitor, X, Play, Pause } from "lucide-react"
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
import { VideoProcessor } from "@/lib/utils/video-processor"
import { cn } from "@/lib/utils"

interface WrappedShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stats: WrappedStats
  workspaceName: string
}

type ExportFormat = "image" | "gif" | "video"
type QualityPreset = "draft" | "standard" | "premium"

// Quality preset configurations
const QUALITY_PRESETS: Record<QualityPreset, {
  label: string
  description: string
  gifFrames: number
  gifFps: number
  videoFrames: number
  videoFps: number
  videoCrf: number
}> = {
  draft: {
    label: "Draft",
    description: "Fast, smaller file",
    gifFrames: 15,
    gifFps: 8,
    videoFrames: 75,
    videoFps: 15,
    videoCrf: 28,
  },
  standard: {
    label: "Standard",
    description: "Balanced quality",
    gifFrames: 30,
    gifFps: 10,
    videoFrames: 150,
    videoFps: 30,
    videoCrf: 23,
  },
  premium: {
    label: "Premium",
    description: "Best quality",
    gifFrames: 45,
    gifFps: 15,
    videoFrames: 150,
    videoFps: 30,
    videoCrf: 18,
  },
}

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
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>("standard")
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [canShareFiles, setCanShareFiles] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationStage, setGenerationStage] = useState<"idle" | "capturing" | "encoding" | "finalizing">("idle")
  const [animationProgress, setAnimationProgress] = useState(0)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const animatedCardRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const previewAnimationRef = useRef<number | null>(null)

  // Check Web Share API support
  useEffect(() => {
    setCanShareFiles(canShare())
  }, [])

  // Preload FFmpeg WASM when modal opens (eliminates 10-20s delay on first video export)
  useEffect(() => {
    if (open) {
      VideoProcessor.loadFFmpeg().catch((error) => {
        console.warn("FFmpeg preload failed:", error)
      })
    }
  }, [open])

  // Track modal opened
  useEffect(() => {
    if (open) {
      track("wrapped_share_opened", {
        year: stats.year,
        total_emojis: stats.overview.totalEmojis,
      })
    }
  }, [open, track, stats])

  // Animation preview loop
  useEffect(() => {
    if (!isPreviewPlaying) {
      // Cleanup when stopped
      if (previewAnimationRef.current) {
        cancelAnimationFrame(previewAnimationRef.current)
        previewAnimationRef.current = null
      }
      return
    }

    const quality = QUALITY_PRESETS[qualityPreset]
    const duration = exportFormat === "video"
      ? (quality.videoFrames / quality.videoFps) * 1000
      : (quality.gifFrames / quality.gifFps) * 1000
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      setAnimationProgress(progress)

      if (progress < 1) {
        previewAnimationRef.current = requestAnimationFrame(animate)
      } else {
        // Loop the animation
        setIsPreviewPlaying(false)
        setAnimationProgress(0)
      }
    }

    previewAnimationRef.current = requestAnimationFrame(animate)

    return () => {
      if (previewAnimationRef.current) {
        cancelAnimationFrame(previewAnimationRef.current)
        previewAnimationRef.current = null
      }
    }
  }, [isPreviewPlaying, qualityPreset, exportFormat])

  // Stop preview when modal closes or format changes to image
  useEffect(() => {
    if (!open || exportFormat === "image") {
      setIsPreviewPlaying(false)
      setAnimationProgress(0)
    }
  }, [open, exportFormat])

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

  const handleQualityChange = (quality: QualityPreset) => {
    setQualityPreset(quality)
    track("wrapped_share_customized", {
      option: "quality",
      value: quality,
      year: stats.year,
    })
  }

  const handlePreviewToggle = useCallback(() => {
    if (isPreviewPlaying) {
      setIsPreviewPlaying(false)
      setAnimationProgress(0)
    } else {
      setAnimationProgress(0)
      setIsPreviewPlaying(true)
    }
  }, [isPreviewPlaying])

  const getFullCardElement = useCallback((): HTMLElement | null => {
    return document.getElementById("wrapped-share-card-full")
  }, [])

  const getAnimatedCardElement = useCallback((): HTMLElement | null => {
    return document.getElementById("wrapped-share-card-animated")
  }, [])

  // Wait for the next animation frame (browser paint cycle)
  const waitForFrame = useCallback((): Promise<void> => {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        // Double RAF ensures we're past React's commit phase
        requestAnimationFrame(() => resolve())
      })
    })
  }, [])

  // Capture a frame with a specific animation progress
  const captureAnimatedFrame = useCallback(async (progress: number): Promise<HTMLCanvasElement> => {
    // Update animation progress state
    setAnimationProgress(progress)

    // Wait for browser to complete the paint cycle (smarter than fixed 16ms delay)
    // Double requestAnimationFrame ensures React has committed and browser has painted
    await waitForFrame()

    const element = getAnimatedCardElement()
    if (!element) throw new Error("Animated card element not found")

    return captureElementAsCanvas(element)
  }, [getAnimatedCardElement, waitForFrame])

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

  // Cancel generation in progress
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsGenerating(false)
    setGenerationProgress(0)
    setGenerationStage("idle")
    toast.info("Generation cancelled")
  }, [])

  const handleDownload = useCallback(async () => {
    if (isGenerating) return

    // Create new abort controller for this operation
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationStage("capturing")

    try {
      const element = getFullCardElement()
      if (!element) throw new Error("Card element not found")

      const filename = `emoji-wrapped-${stats.year}-${workspaceName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`

      const quality = QUALITY_PRESETS[qualityPreset]

      if (exportFormat === "video") {
        // Generate MP4 video with animated content using quality preset
        const totalFrames = quality.videoFrames
        const fps = quality.videoFps
        const blob = await generateVideo(
          async (frameIndex: number) => {
            // Check for cancellation before each frame
            if (signal.aborted) throw new DOMException("Aborted", "AbortError")
            const progress = frameIndex / (totalFrames - 1)
            return captureAnimatedFrame(progress)
          },
          totalFrames,
          fps,
          (progress) => {
            setGenerationProgress(progress)
            // Switch to encoding stage after frame capture (30% point)
            if (progress > 0.3 && generationStage === "capturing") {
              setGenerationStage("encoding")
            }
          }
        )
        if (signal.aborted) throw new DOMException("Aborted", "AbortError")
        setGenerationStage("finalizing")
        downloadVideo(blob, filename)
        toast.success("Video downloaded!")
      } else if (exportFormat === "gif") {
        // Generate animated GIF with animated content using quality preset
        const totalFrames = quality.gifFrames
        const frameDelay = Math.round(1000 / quality.gifFps)
        const blob = await generateGif(
          async (frameIndex: number) => {
            // Check for cancellation before each frame
            if (signal.aborted) throw new DOMException("Aborted", "AbortError")
            const progress = frameIndex / (totalFrames - 1)
            return captureAnimatedFrame(progress)
          },
          totalFrames,
          frameDelay, // Delay between frames in GIF based on fps
          0, // No additional capture interval needed since we control progress
          (progress) => {
            setGenerationProgress(progress)
            // Switch to encoding stage after frame capture (80% point for GIF)
            if (progress > 0.8 && generationStage === "capturing") {
              setGenerationStage("encoding")
            }
          }
        )
        if (signal.aborted) throw new DOMException("Aborted", "AbortError")
        setGenerationStage("finalizing")
        downloadGif(blob, filename)
        toast.success("GIF downloaded!")
      } else {
        const blob = await generateImage(element)
        if (signal.aborted) throw new DOMException("Aborted", "AbortError")
        setGenerationStage("finalizing")
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
      // Don't show error for user-initiated cancellation
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }
      console.error("Failed to download:", error)
      toast.error("Failed to download")
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
      setGenerationStage("idle")
    }
  }, [isGenerating, getFullCardElement, captureAnimatedFrame, exportFormat, stats.year, workspaceName, track, backgroundStyle, cardSize, generationStage])

  const handleShare = useCallback(async () => {
    if (isGenerating) return

    // Create new abort controller for this operation
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationStage("capturing")

    try {
      const element = getFullCardElement()
      if (!element) throw new Error("Card element not found")

      const title = `${workspaceName} Emoji Wrapped ${stats.year}`
      const text = `Check out our emoji stats from ${stats.year}! Created with Emoji Studio`
      let shared = false

      const quality = QUALITY_PRESETS[qualityPreset]

      if (exportFormat === "video") {
        const totalFrames = quality.videoFrames
        const fps = quality.videoFps
        const blob = await generateVideo(
          async (frameIndex: number) => {
            if (signal.aborted) throw new DOMException("Aborted", "AbortError")
            const progress = frameIndex / (totalFrames - 1)
            return captureAnimatedFrame(progress)
          },
          totalFrames,
          fps,
          (progress) => {
            setGenerationProgress(progress)
            if (progress > 0.3 && generationStage === "capturing") {
              setGenerationStage("encoding")
            }
          }
        )
        if (signal.aborted) throw new DOMException("Aborted", "AbortError")
        setGenerationStage("finalizing")
        shared = await shareVideo(blob, title, text)
      } else if (exportFormat === "gif") {
        const totalFrames = quality.gifFrames
        const frameDelay = Math.round(1000 / quality.gifFps)
        const blob = await generateGif(
          async (frameIndex: number) => {
            if (signal.aborted) throw new DOMException("Aborted", "AbortError")
            const progress = frameIndex / (totalFrames - 1)
            return captureAnimatedFrame(progress)
          },
          totalFrames,
          frameDelay,
          0,
          (progress) => {
            setGenerationProgress(progress)
            if (progress > 0.8 && generationStage === "capturing") {
              setGenerationStage("encoding")
            }
          }
        )
        if (signal.aborted) throw new DOMException("Aborted", "AbortError")
        setGenerationStage("finalizing")
        shared = await shareGif(blob, title, text)
      } else {
        const blob = await generateImage(element)
        if (signal.aborted) throw new DOMException("Aborted", "AbortError")
        setGenerationStage("finalizing")
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
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }
      console.error("Failed to share:", error)
      toast.error("Failed to share")
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
      setGenerationStage("idle")
      abortControllerRef.current = null
    }
  }, [isGenerating, getFullCardElement, captureAnimatedFrame, workspaceName, stats.year, track, backgroundStyle, cardSize, exportFormat, generationStage])

  const ModalContent = (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex justify-center">
        <div className="relative group">
          {/* Show animated card when preview is playing, static otherwise */}
          {isPreviewPlaying && (exportFormat === "gif" || exportFormat === "video") ? (
            <WrappedShareCardAnimated
              stats={stats}
              workspaceName={workspaceName}
              backgroundStyle={backgroundStyle}
              size={cardSize}
              animationProgress={animationProgress}
            />
          ) : (
            <WrappedShareCard
              stats={stats}
              workspaceName={workspaceName}
              backgroundStyle={backgroundStyle}
              size={cardSize}
            />
          )}

          {/* Preview play/pause button for animated formats */}
          {(exportFormat === "gif" || exportFormat === "video") && !isGenerating && (
            <button
              onClick={handlePreviewToggle}
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity",
                isPreviewPlaying ? "opacity-0 hover:opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
              aria-label={isPreviewPlaying ? "Pause preview" : "Play preview"}
            >
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                {isPreviewPlaying ? (
                  <Pause className="w-5 h-5 text-gray-800" />
                ) : (
                  <Play className="w-5 h-5 text-gray-800 ml-0.5" />
                )}
              </div>
            </button>
          )}

          {/* Progress indicator during preview */}
          {isPreviewPlaying && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
              <div
                className="h-full bg-white/80 transition-all duration-75"
                style={{ width: `${animationProgress * 100}%` }}
              />
            </div>
          )}
        </div>
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

      {/* Quality selection - only show for animated formats */}
      {(exportFormat === "gif" || exportFormat === "video") && (
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Quality</label>
          <ToggleGroup
            type="single"
            value={qualityPreset}
            onValueChange={(v) => v && handleQualityChange(v as QualityPreset)}
            className="justify-start"
          >
            {(Object.keys(QUALITY_PRESETS) as QualityPreset[]).map((preset) => (
              <ToggleGroupItem key={preset} value={preset} className="flex-col items-start gap-0 h-auto py-2 px-3">
                <span className="font-medium">{QUALITY_PRESETS[preset].label}</span>
                <span className="text-xs text-muted-foreground">{QUALITY_PRESETS[preset].description}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      {/* Progress bar with stage indicator and cancel button */}
      {isGenerating && generationProgress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>
              {generationStage === "capturing" && "Capturing frames..."}
              {generationStage === "encoding" && "Encoding..."}
              {generationStage === "finalizing" && "Finalizing..."}
            </span>
            <div className="flex items-center gap-2">
              <span>{Math.round(generationProgress * 100)}%</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={handleCancel}
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${generationProgress * 100}%` }}
            />
          </div>
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
