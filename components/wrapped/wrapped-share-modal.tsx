"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { flushSync } from "react-dom"
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
import { Loader2, Download, Image, Film, Video, Square, Smartphone, Monitor, X, Play, Pause, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTrack } from "@/lib/hooks/use-track"
import {
  WrappedShareCard,
  WrappedShareCardFull,
  WrappedShareCardAnimated,
  MyEmojisShareCard,
  MyEmojisShareCardFull,
  MyEmojisShareCardAnimated,
  WRAPPED_BACKGROUNDS,
  WRAPPED_SIZES,
  type WrappedBackgroundStyle,
  type WrappedCardSize,
} from "./wrapped-share-card"
import { WrappedStats } from "@/lib/services/wrapped-service"
import { Emoji } from "@/lib/services/emoji-service"
import {
  generateImage,
  generateGif,
  generateVideo,
  captureElementAsCanvas,
  prefetchImagesToDataUrls,
  detectVideoEncoder,
  preloadVideoEncoder,
  getEncoderDescription,
  type EncoderType,
} from "@/lib/utils/share-image"
import { cn } from "@/lib/utils"

interface WrappedShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stats: WrappedStats
  workspaceName: string
  yearEmojis?: Emoji[] // All emojis from the year for "My Emojis" card
  creatorName?: string // Optional creator name for personalized card
  userId?: string // User ID for filtering emojis in "My Emojis" card
}

type ExportFormat = "image" | "gif" | "video"
type CardType = "stats" | "my-emojis"
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
  yearEmojis = [],
  creatorName,
  userId,
}: WrappedShareModalProps) {
  const isMobile = useIsMobile()
  const track = useTrack()
  const cardRef = useRef<HTMLDivElement>(null)
  const fullCardRef = useRef<HTMLDivElement>(null)
  const myEmojisFullCardRef = useRef<HTMLDivElement>(null)
  const myEmojisAnimatedCardRef = useRef<HTMLDivElement>(null)

  const [cardType, setCardType] = useState<CardType>("stats")
  const [backgroundStyle, setBackgroundStyle] = useState<WrappedBackgroundStyle>("cosmic")
  // Always use square size for exports
  const cardSize: WrappedCardSize = "square"
  const [exportFormat, setExportFormat] = useState<ExportFormat>("image")

  // Filter emojis to only show user's emojis for "My Emojis" card
  const userYearEmojis = useMemo(() => {
    if (!userId) return []  // Return empty if no user ID - can't show "My Emojis" without knowing the user
    return yearEmojis.filter(emoji => emoji.user_id === userId)
  }, [yearEmojis, userId])

  // Check if we have enough user emojis for the "My Emojis" card
  // Requires both a valid userId AND at least 5 emojis from that user this year
  const hasEnoughEmojis = userId && userYearEmojis.length >= 5
  // Always use draft quality for speed
  const qualityPreset: QualityPreset = "draft"
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationStage, setGenerationStage] = useState<"idle" | "capturing" | "encoding" | "finalizing">("idle")
  const [animationProgress, setAnimationProgress] = useState(0)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  // Preview state for inline media display (long-press to save)
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null)
  const [previewMediaType, setPreviewMediaType] = useState<"image" | "gif" | "video" | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [videoEncoderType, setVideoEncoderType] = useState<EncoderType | null>(null)
  const animatedCardRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const previewAnimationRef = useRef<number | null>(null)

  // Reset preview when modal closes and cleanup blob URLs
  useEffect(() => {
    if (!open) {
      if (previewMediaUrl) {
        URL.revokeObjectURL(previewMediaUrl)
      }
      setShowPreview(false)
      setPreviewMediaUrl(null)
      setPreviewMediaType(null)
    }
  }, [open, previewMediaUrl])

  // Detect video encoder and preload when modal opens
  // WebCodecs is hardware-accelerated and doesn't need preloading
  // FFmpeg WASM needs preloading to avoid 10-20s delay on first export
  useEffect(() => {
    if (open) {
      detectVideoEncoder().then((info) => {
        setVideoEncoderType(info.type)
        console.log(`[ShareModal] Video encoder: ${info.type}${info.reason ? ` (${info.reason})` : ""}`)
      })
      preloadVideoEncoder().catch((error) => {
        console.warn("Video encoder preload failed:", error)
      })
    }
  }, [open])

  // Preload images in the full card when modal opens
  // This ensures images are cached before capture operations
  useEffect(() => {
    if (!open) return

    // Small delay to allow full card to render
    const preloadImages = async () => {
      await new Promise(r => setTimeout(r, 100))

      const element = cardType === "my-emojis"
        ? document.getElementById("my-emojis-share-card-full")
        : document.getElementById("wrapped-share-card-full")

      if (!element) return

      const images = element.querySelectorAll("img")
      await Promise.all(
        Array.from(images).map(img =>
          new Promise<void>(resolve => {
            if (img.complete && img.naturalWidth > 0) {
              resolve()
              return
            }
            // Preload by setting up load handlers
            img.onload = () => resolve()
            img.onerror = () => resolve()
          })
        )
      )
    }

    preloadImages()
  }, [open, cardType, backgroundStyle, cardSize])

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

  const handleFormatChange = (format: ExportFormat) => {
    setExportFormat(format)
    track("wrapped_share_customized", {
      option: "format",
      value: format,
      year: stats.year,
    })
  }

  const handleCardTypeChange = (type: CardType) => {
    setCardType(type)
    track("wrapped_share_customized", {
      option: "card_type",
      value: type,
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
    // Use querySelector within the ref container to find the card by ID
    // This avoids duplicate ID issues when preview animation is playing
    if (cardType === "my-emojis") {
      const container = myEmojisFullCardRef.current
      if (!container) return null
      return container.querySelector("#my-emojis-share-card-full") as HTMLElement | null
    }
    const container = fullCardRef.current
    if (!container) return null
    return container.querySelector("#wrapped-share-card-full") as HTMLElement | null
  }, [cardType])

  const getAnimatedCardElement = useCallback((): HTMLElement | null => {
    // Use querySelector within the ref container to find the card by ID
    // This avoids duplicate ID issues when preview animation is playing
    if (cardType === "my-emojis") {
      const container = myEmojisAnimatedCardRef.current
      if (!container) return null
      return container.querySelector("#my-emojis-share-card-animated") as HTMLElement | null
    }
    const container = animatedCardRef.current
    if (!container) return null
    return container.querySelector("#wrapped-share-card-animated") as HTMLElement | null
  }, [cardType])

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
  // imageCache is a Map of URL -> base64 data URL that bypasses html-to-image's buggy caching
  const captureAnimatedFrame = useCallback(async (
    progress: number,
    imageCache?: Map<string, string>
  ): Promise<HTMLCanvasElement> => {
    // flushSync forces React to immediately process the state update
    // Without this, the state update is async and capture may happen before re-render
    flushSync(() => {
      setAnimationProgress(progress)
    })

    // Wait for browser to complete the paint cycle after React commit
    await waitForFrame()

    // Try to get the element with retries in case DOM isn't ready yet
    let element = getAnimatedCardElement()

    // Retry up to 3 times with increasing delays if element not found
    if (!element) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        await new Promise(resolve => setTimeout(resolve, attempt * 50))
        await waitForFrame()
        element = getAnimatedCardElement()
        if (element) break
      }
    }

    if (!element) {
      const debugInfo = {
        cardType,
        statsRefExists: !!animatedCardRef.current,
        myEmojisRefExists: !!myEmojisAnimatedCardRef.current,
      }
      console.error("[ShareModal] Animated card element not found:", debugInfo)
      throw new Error(`Animated card element not found (cardType: ${cardType})`)
    }

    // Pass the image cache to bypass html-to-image's buggy internal caching
    return captureElementAsCanvas(element, imageCache)
  }, [getAnimatedCardElement, waitForFrame, cardType])

  // Handler for generating media and showing inline preview for long-press save
  const handleGeneratePreview = useCallback(async () => {
    if (isGenerating) return

    // Clean up any previous preview
    if (previewMediaUrl) {
      URL.revokeObjectURL(previewMediaUrl)
      setPreviewMediaUrl(null)
    }

    // Create new abort controller for this operation
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationStage("capturing")

    try {
      const quality = QUALITY_PRESETS[qualityPreset]
      let blob: Blob

      if (exportFormat === "video") {
        // Generate MP4 video
        const totalFrames = quality.videoFrames
        const fps = quality.videoFps

        // Pre-fetch all emoji images as base64 data URLs BEFORE frame capture
        // This bypasses html-to-image's buggy internal caching that causes
        // all frames after frame 1 to show the same emoji
        const animatedElement = getAnimatedCardElement()
        if (!animatedElement) throw new Error("Animated card element not found")
        const imageCache = await prefetchImagesToDataUrls(animatedElement)
        console.log(`[Video] Pre-fetched ${imageCache.size} images as data URLs`)

        blob = await generateVideo(
          async (frameIndex: number) => {
            if (signal.aborted) throw new DOMException("Aborted", "AbortError")
            const progress = frameIndex / (totalFrames - 1)
            return captureAnimatedFrame(progress, imageCache)
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
        setPreviewMediaType("video")
      } else if (exportFormat === "gif") {
        // Generate animated GIF
        const totalFrames = quality.gifFrames
        const frameDelay = Math.round(1000 / quality.gifFps)

        // Pre-fetch all emoji images as base64 data URLs BEFORE frame capture
        // This bypasses html-to-image's buggy internal caching that causes
        // all frames after frame 1 to show the same emoji
        const animatedElement = getAnimatedCardElement()
        if (!animatedElement) throw new Error("Animated card element not found")
        const imageCache = await prefetchImagesToDataUrls(animatedElement)
        console.log(`[GIF] Pre-fetched ${imageCache.size} images as data URLs`)

        blob = await generateGif(
          async (frameIndex: number) => {
            if (signal.aborted) throw new DOMException("Aborted", "AbortError")
            const progress = frameIndex / (totalFrames - 1)
            return captureAnimatedFrame(progress, imageCache)
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
        setPreviewMediaType("gif")
      } else {
        // Generate static image
        const element = getFullCardElement()
        if (!element) throw new Error("Card element not found")
        blob = await generateImage(element)
        if (signal.aborted) throw new DOMException("Aborted", "AbortError")
        setPreviewMediaType("image")
      }

      setGenerationStage("finalizing")

      // Create blob URL for inline display
      const blobUrl = URL.createObjectURL(blob)
      setPreviewMediaUrl(blobUrl)
      setShowPreview(true)

      track("wrapped_share_preview_generated", {
        year: stats.year,
        format: exportFormat,
        background: backgroundStyle,
        card_type: cardType,
      })

      const formatLabel = exportFormat === "video" ? "Video" : exportFormat === "gif" ? "GIF" : "Image"
      toast.success(`${formatLabel} ready! Long-press to save.`, { duration: 4000 })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }
      console.error("Failed to generate preview:", error)
      toast.error("Failed to generate. Please try again.")
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
      setGenerationStage("idle")
      abortControllerRef.current = null
    }
  }, [isGenerating, previewMediaUrl, exportFormat, qualityPreset, captureAnimatedFrame, getFullCardElement, getAnimatedCardElement, generationStage, track, stats.year, backgroundStyle, cardType])

  // Go back from preview to customization
  const handleBackFromPreview = useCallback(() => {
    if (previewMediaUrl) {
      URL.revokeObjectURL(previewMediaUrl)
    }
    setShowPreview(false)
    setPreviewMediaUrl(null)
    setPreviewMediaType(null)
  }, [previewMediaUrl])

  // Render full-size cards for export (static + animated)
  // IMPORTANT: Always render BOTH card types to ensure refs are attached
  // The cards are positioned off-screen anyway, so rendering both has no visual impact
  const renderFullCard = useCallback(() => {
    return (
      <>
        {/* Stats cards - always rendered for ref stability */}
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
        {/* My Emojis cards - always rendered for ref stability */}
        <div
          ref={myEmojisFullCardRef}
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
          }}
        >
          <MyEmojisShareCardFull
            emojis={userYearEmojis}
            workspaceName={workspaceName}
            backgroundStyle={backgroundStyle}
            size={cardSize}
            year={stats.year}
            creatorName={creatorName}
          />
        </div>
        <div
          ref={myEmojisAnimatedCardRef}
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
          }}
        >
          <MyEmojisShareCardAnimated
            emojis={userYearEmojis}
            workspaceName={workspaceName}
            backgroundStyle={backgroundStyle}
            size={cardSize}
            year={stats.year}
            creatorName={creatorName}
            animationProgress={animationProgress}
          />
        </div>
      </>
    )
  }, [stats, workspaceName, backgroundStyle, cardSize, animationProgress, userYearEmojis, creatorName])

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

  // Preview view - shows generated media inline for long-press save
  const PreviewView = (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">
          Save Your {previewMediaType === "video" ? "Video" : previewMediaType === "gif" ? "GIF" : "Image"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {previewMediaType === "video"
            ? "Long-press the video and select \"Save Video\", or use the video controls to save"
            : "Long-press the image below and select \"Save Image\" or \"Add to Photos\""
          }
        </p>
      </div>

      {/* Generated media for long-press save */}
      {previewMediaUrl && (
        <div className="flex justify-center">
          <div className="relative rounded-lg overflow-hidden shadow-lg border border-border">
            {previewMediaType === "video" ? (
              <video
                src={previewMediaUrl}
                controls
                autoPlay
                loop
                muted
                playsInline
                className="max-w-full max-h-[60vh] object-contain"
                style={{ touchAction: "manipulation" }}
              />
            ) : (
              <img
                src={previewMediaUrl}
                alt="Your Wrapped share card"
                className="max-w-full max-h-[60vh] object-contain"
                style={{ touchAction: "manipulation" }}
              />
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium">How to save:</p>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          {previewMediaType === "video" ? (
            <>
              <li>Long-press on the video above</li>
              <li>Select "Save Video" or "Download Video"</li>
              <li>Find it in your photo library!</li>
            </>
          ) : (
            <>
              <li>Press and hold on the {previewMediaType === "gif" ? "GIF" : "image"} above</li>
              <li>Select "Save Image" or "Add to Photos"</li>
              <li>Find it in your photo library!</li>
            </>
          )}
        </ol>
      </div>

      {/* Back button */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleBackFromPreview}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to customize
        </Button>
      </div>
    </div>
  )

  const ModalContent = (
    <div className="space-y-4">
      {/* Show preview view or customization view */}
      {showPreview ? (
        PreviewView
      ) : (
        <>
      {/* Card Type Selection - only show if we have emojis */}
      {hasEnoughEmojis && (
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Card Type</label>
          <ToggleGroup
            type="single"
            value={cardType}
            onValueChange={(v) => v && handleCardTypeChange(v as CardType)}
            className="justify-start"
          >
            <ToggleGroupItem value="stats" className="gap-2">
              <span>📊</span>
              <span>Stats</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="my-emojis" className="gap-2">
              <span>🎨</span>
              <span>My Emojis</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {/* Preview */}
      <div className="flex justify-center">
        <div className="relative group">
          {/* Show animated card when preview is playing, static otherwise */}
          {cardType === "my-emojis" ? (
            // My Emojis card preview
            isPreviewPlaying && (exportFormat === "gif" || exportFormat === "video") ? (
              <MyEmojisShareCardAnimated
                emojis={userYearEmojis}
                workspaceName={workspaceName}
                backgroundStyle={backgroundStyle}
                size={cardSize}
                year={stats.year}
                creatorName={creatorName}
                animationProgress={animationProgress}
              />
            ) : (
              <MyEmojisShareCard
                emojis={userYearEmojis}
                workspaceName={workspaceName}
                backgroundStyle={backgroundStyle}
                size={cardSize}
                year={stats.year}
                creatorName={creatorName}
              />
            )
          ) : (
            // Stats card preview
            isPreviewPlaying && (exportFormat === "gif" || exportFormat === "video") ? (
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
            )
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

      {/* Background selection - exciting color picker */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">Background</label>
        <div className="flex justify-between gap-1">
          {(Object.keys(WRAPPED_BACKGROUNDS) as WrappedBackgroundStyle[]).map((style) => (
            <button
              key={style}
              onClick={() => handleBackgroundChange(style)}
              className={cn(
                "flex-1 h-10 rounded-lg border-2 transition-all flex items-center justify-center text-lg",
                backgroundStyle === style
                  ? "border-white scale-105 ring-2 ring-white/30 shadow-lg"
                  : "border-transparent hover:border-white/50 hover:scale-102"
              )}
              style={{ background: WRAPPED_BACKGROUNDS[style].gradient }}
              title={WRAPPED_BACKGROUNDS[style].label}
            >
              <span className="drop-shadow-md">{WRAPPED_BACKGROUNDS[style].emoji}</span>
            </button>
          ))}
        </div>
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
        {exportFormat === "video" && videoEncoderType && (
          <p className="text-xs text-muted-foreground mt-1.5">
            {getEncoderDescription(videoEncoderType)}
          </p>
        )}
      </div>

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

      {/* Single Generate button */}
      <Button
        className="w-full"
        onClick={handleGeneratePreview}
        disabled={isGenerating}
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Generate {exportFormat === "image" ? "Image" : exportFormat === "gif" ? "GIF" : "Video"}
          </>
        )}
      </Button>
        </>
      )}

      {/* Hidden full-size card for export */}
      {renderFullCard()}
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle>Share Your Wrapped</DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close share modal"
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
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
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle>Share Your Wrapped</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close share modal"
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        {ModalContent}
      </DialogContent>
    </Dialog>
  )
}
