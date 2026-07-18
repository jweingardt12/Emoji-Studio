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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Copy, Download, Share2, Check, Image, Film } from "lucide-react"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTrack } from "@/lib/hooks/use-track"
import {
  LeaderboardShareCard,
  SHARE_BACKGROUNDS,
  DATE_RANGE_LABELS,
  type ShareBackgroundStyle,
} from "@/components/leaderboard-share-card"
import type { UserWithEmojiCount, DateRange } from "@/components/leaderboard"
import {
  generateImage,
  copyImageToClipboard,
  downloadImage,
  shareImageWithResult,
  downloadGif,
  shareGifWithResult,
  type DownloadResult,
  type ShareResult,
} from "@/lib/utils/share-image"
import { isIOS, isWebView, supportsClipboardWriteImage } from "@/lib/utils/ios-detection"
import { cn } from "@/lib/utils"

interface LeaderboardShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: UserWithEmojiCount[]
  dateRange: DateRange
  onDateRangeChange?: (range: DateRange) => void
  workspaceName: string
}

type UserCount = 3 | 5 | 10
type ExportFormat = "image" | "gif"

export function LeaderboardShareModal({
  open,
  onOpenChange,
  users,
  dateRange,
  onDateRangeChange,
  workspaceName,
}: LeaderboardShareModalProps) {
  const isMobile = useIsMobile()
  const track = useTrack()
  const cardRef = useRef<HTMLDivElement>(null)

  const [userCount, setUserCount] = useState<UserCount>(5)
  const [backgroundStyle, setBackgroundStyle] = useState<ShareBackgroundStyle>("charcoal")
  const [showEmojis, setShowEmojis] = useState(true)
  const [exportFormat, setExportFormat] = useState<ExportFormat>("image")
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Track modal opened
  useEffect(() => {
    if (open) {
      track("leaderboard_share_opened", {
        user_count: userCount,
        date_range: dateRange,
      })
    }
  }, [open, track, userCount, dateRange])

  // Freeze/unfreeze GIF animations in preview based on export format
  useEffect(() => {
    if (!open) return

    const card = document.getElementById("leaderboard-share-card")
    if (!card) return

    const gifImages = card.querySelectorAll('img') as NodeListOf<HTMLImageElement>

    if (exportFormat === "image") {
      // Freeze GIFs by converting to static canvas snapshots
      gifImages.forEach((img) => {
        const isGif = img.src.toLowerCase().includes('.gif') || img.dataset.isGif === 'true'
        if (!isGif || img.dataset.frozenSrc) return

        img.dataset.originalAnimatedSrc = img.src

        const freezeImage = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth || img.width || 64
            canvas.height = img.naturalHeight || img.height || 64
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
              img.dataset.frozenSrc = 'true'
              img.src = canvas.toDataURL('image/png')
            }
          } catch (e) {
            // Ignore CORS errors for cross-origin images
          }
        }

        if (img.complete) freezeImage()
        else img.addEventListener('load', freezeImage, { once: true })
      })
    } else {
      // Restore original GIF animations
      gifImages.forEach((img) => {
        if (img.dataset.originalAnimatedSrc) {
          img.src = img.dataset.originalAnimatedSrc
          delete img.dataset.originalAnimatedSrc
          delete img.dataset.frozenSrc
        }
      })
    }
  }, [exportFormat, showEmojis, userCount, open])

  const getCardElement = useCallback((): HTMLElement | null => {
    return document.getElementById("leaderboard-share-card")
  }, [])

  // Convert static images to data URLs to avoid CORS issues during capture
  // GIF images are left as-is so they continue to animate naturally
  const convertImagesToDataUrls = useCallback(async (element: HTMLElement, preserveGifs: boolean = false): Promise<() => void> => {
    const images = element.querySelectorAll("img")
    const originalSrcs: Map<HTMLImageElement, string> = new Map()

    const conversionPromises = Array.from(images).map(async (img) => {
      // Skip if already a data URL or local image
      if (img.src.startsWith("data:") || img.src.startsWith("/logo")) {
        return
      }

      const originalSrc = img.src
      const isGif = img.dataset.isGif === "true" || originalSrc.toLowerCase().includes(".gif")

      // Mark GIF images and store original URL for frame extraction
      if (isGif) {
        img.dataset.isGif = "true"
        img.dataset.originalGifUrl = originalSrc  // Store for frame extraction later
      }

      // Skip converting GIFs if we want to preserve their animation
      if (preserveGifs && isGif) {
        originalSrcs.set(img, originalSrc)
        return
      }

      originalSrcs.set(img, originalSrc)

      try {
        // Wait for image to load
        if (!img.complete) {
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = () => reject(new Error("Image failed to load"))
          })
        }

        // Draw to canvas and convert to data URL
        const canvas = document.createElement("canvas")
        canvas.width = img.naturalWidth || img.width || 64
        canvas.height = img.naturalHeight || img.height || 64
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const dataUrl = canvas.toDataURL("image/png")
          img.src = dataUrl
        }
      } catch (error) {
      }
    })

    await Promise.all(conversionPromises)
    // Wait for re-render
    await new Promise(r => setTimeout(r, 100))

    // Return cleanup function to restore original URLs and remove data attributes
    return () => {
      originalSrcs.forEach((originalSrc, img) => {
        img.src = originalSrc
        delete img.dataset.isGif
        delete img.dataset.originalGifUrl
      })
    }
  }, [])

  // Generate a static GIF from an element (single frame, GIF format)
  const generateStaticGif = useCallback(async (element: HTMLElement): Promise<Blob> => {
    const { toCanvas } = await import("html-to-image")
    const { default: GIF } = await import("gif.js")
    const canvas = await toCanvas(element, { pixelRatio: 2, cacheBust: true })

    return new Promise((resolve, reject) => {
      try {
        const gif = new GIF({
          workers: 2,
          quality: 10,
          width: canvas.width,
          height: canvas.height,
          workerScript: "/gif.worker.js",
        })

        // Add single frame with long delay (static GIF)
        gif.addFrame(canvas, { delay: 1000, copy: true })

        gif.on("finished", (blob: Blob) => resolve(blob))
        gif.render()
      } catch (err) {
        reject(err)
      }
    })
  }, [])

  // Generate an animated GIF with actual GIF emoji frames
  const generateAnimatedGif = useCallback(async (element: HTMLElement): Promise<Blob> => {
    const { toCanvas } = await import("html-to-image")
    const { parseGIF, decompressFrames } = await import("gifuct-js")

    // Find all GIF emoji images
    const gifEmojiImages = Array.from(element.querySelectorAll('img[data-is-gif="true"]')) as HTMLImageElement[]

    // If no GIF emojis, create single-frame static GIF
    if (gifEmojiImages.length === 0) {
      return generateStaticGif(element)
    }

    const pixelRatio = 2
    const cardRect = element.getBoundingClientRect()

    // Calculate scale factor to compensate for CSS scale-[0.72] transform
    const naturalWidth = element.offsetWidth
    const naturalHeight = element.offsetHeight
    const scaleX = naturalWidth / cardRect.width
    const scaleY = naturalHeight / cardRect.height

    // Extract frames from all GIF emojis
    interface GifData {
      frames: HTMLCanvasElement[]
      delays: number[]
      x: number
      y: number
      width: number
      height: number
    }

    const gifDataPromises = gifEmojiImages.map(async (img): Promise<GifData | null> => {
      const rect = img.getBoundingClientRect()
      // Apply scale factor to get correct position relative to card
      const x = (rect.left - cardRect.left) * scaleX * pixelRatio
      const y = (rect.top - cardRect.top) * scaleY * pixelRatio
      const width = rect.width * scaleX * pixelRatio
      const height = rect.height * scaleY * pixelRatio

      // Use stored original URL (before conversion to data URL)
      const gifUrl = img.dataset.originalGifUrl || img.src

      try {
        const response = await fetch(gifUrl)
        const arrayBuffer = await response.arrayBuffer()

        const parsedGif = parseGIF(arrayBuffer)
        const rawFrames = decompressFrames(parsedGif, true)

        if (!rawFrames || rawFrames.length === 0) {
          return null
        }

        // Create canvas for each frame with proper disposal handling
        const frames: HTMLCanvasElement[] = []
        const delays: number[] = []

        // Create a persistent canvas for compositing frames
        const compositeCanvas = document.createElement("canvas")
        compositeCanvas.width = parsedGif.lsd.width
        compositeCanvas.height = parsedGif.lsd.height
        const compositeCtx = compositeCanvas.getContext("2d")!

        for (let i = 0; i < rawFrames.length; i++) {
          const frame = rawFrames[i]

          // Handle disposal method from previous frame
          if (i > 0) {
            const prevFrame = rawFrames[i - 1]
            const disposalType = prevFrame.disposalType

            if (disposalType === 2) {
              // Restore to background (clear the frame area)
              compositeCtx.clearRect(
                prevFrame.dims.left,
                prevFrame.dims.top,
                prevFrame.dims.width,
                prevFrame.dims.height
              )
            } else if (disposalType === 3) {
              // Restore to previous - we'd need to save/restore, simplify to background
              compositeCtx.clearRect(
                prevFrame.dims.left,
                prevFrame.dims.top,
                prevFrame.dims.width,
                prevFrame.dims.height
              )
            }
            // disposalType 0 or 1: do nothing (leave as-is)
          }

          // Create ImageData from frame patch
          const frameCanvas = document.createElement("canvas")
          frameCanvas.width = frame.dims.width
          frameCanvas.height = frame.dims.height
          const frameCtx = frameCanvas.getContext("2d")!

          const imageData = frameCtx.createImageData(frame.dims.width, frame.dims.height)
          imageData.data.set(frame.patch)
          frameCtx.putImageData(imageData, 0, 0)

          // Draw frame patch onto composite canvas
          compositeCtx.drawImage(frameCanvas, frame.dims.left, frame.dims.top)

          // Create output frame canvas at target size
          const outputCanvas = document.createElement("canvas")
          outputCanvas.width = width
          outputCanvas.height = height
          const outputCtx = outputCanvas.getContext("2d")!

          // Draw composite canvas scaled to output size
          outputCtx.drawImage(
            compositeCanvas,
            0, 0, compositeCanvas.width, compositeCanvas.height,
            0, 0, width, height
          )

          frames.push(outputCanvas)
          delays.push(frame.delay || 100)
        }

        return { frames, delays, x, y, width, height }
      } catch (error) {
        return null
      }
    })

    const allGifData = (await Promise.all(gifDataPromises)).filter((d): d is GifData => d !== null)

    // If frame extraction failed for all GIFs, fall back to static
    if (allGifData.length === 0) {
      return generateStaticGif(element)
    }

    // Capture base card as canvas (with static images)
    const baseCanvas = await toCanvas(element, { pixelRatio, cacheBust: true })

    // Speed up playback by 2x
    const speedMultiplier = 2
    const maxGifDuration = Math.max(...allGifData.map(g => g.delays.reduce((a, b) => a + b, 0)))
    const outputDuration = Math.min(maxGifDuration / speedMultiplier, 2000) // Cap at 2 seconds
    const frameDelay = 33 // 30 FPS
    const outputFrameCount = Math.ceil(outputDuration / frameDelay)

    const { default: GIF } = await import("gif.js")
    return new Promise((resolve, reject) => {
      try {
        const gif = new GIF({
          workers: 2,
          quality: 10,
          width: baseCanvas.width,
          height: baseCanvas.height,
          workerScript: "/gif.worker.js",
        })

        // Create output frames with animated emojis composited
        for (let frameIdx = 0; frameIdx < outputFrameCount; frameIdx++) {
          const frameCanvas = document.createElement("canvas")
          frameCanvas.width = baseCanvas.width
          frameCanvas.height = baseCanvas.height
          const frameCtx = frameCanvas.getContext("2d")!

          // Draw base card
          frameCtx.drawImage(baseCanvas, 0, 0)

          // Apply speed multiplier to determine which frame to show from each GIF
          const currentTime = frameIdx * frameDelay * speedMultiplier

          // Overlay animated GIF frames at correct positions
          for (const gifData of allGifData) {
            // Calculate which frame to show based on current time (looping)
            const totalGifDuration = gifData.delays.reduce((a, b) => a + b, 0)
            const gifTime = currentTime % totalGifDuration

            let accumulatedTime = 0
            let frameToShow = 0
            for (let i = 0; i < gifData.delays.length; i++) {
              accumulatedTime += gifData.delays[i]
              if (gifTime < accumulatedTime) {
                frameToShow = i
                break
              }
            }

            const gifFrame = gifData.frames[frameToShow]
            if (gifFrame) {
              frameCtx.drawImage(gifFrame, gifData.x, gifData.y, gifData.width, gifData.height)
            }
          }

          gif.addFrame(frameCanvas, { delay: frameDelay, copy: true })
        }

        gif.on("finished", (blob: Blob) => resolve(blob))
        gif.render()
      } catch (err) {
        reject(err)
      }
    })
  }, [generateStaticGif])

  const handleCopy = useCallback(async () => {
    // Check if clipboard is supported on this device before even trying
    if (!supportsClipboardWriteImage() && (isIOS() || isWebView())) {
      toast.error("Copying images isn't supported on this device. Use Share instead.", {
        duration: 4000,
      })
      return
    }

    const element = getCardElement()
    if (!element) return

    setIsGenerating(true)
    let restoreImages: (() => void) | null = null
    try {
      // Convert all images to data URLs to ensure correct images are captured
      restoreImages = await convertImagesToDataUrls(element)

      if (exportFormat === "gif") {
        // Generate animated GIF and download (clipboard doesn't support GIF)
        const gifBlob = await generateAnimatedGif(element)
        const baseFilename = `leaderboard-${workspaceName.toLowerCase().replace(/\s+/g, "-")}-${dateRange}`
        const downloadResult = await downloadGif(gifBlob, `${baseFilename}.gif`)

        // Also copy PNG to clipboard
        const pngBlob = await generateImage(element)
        const copyResult = await copyImageToClipboard(pngBlob)

        if (downloadResult.success && copyResult.success) {
          toast.success("GIF downloaded & image copied!")
        } else if (downloadResult.success) {
          toast.success(downloadResult.message)
        } else {
          toast.error(downloadResult.message, { duration: 4000 })
        }
      } else {
        const blob = await generateImage(element)
        const result = await copyImageToClipboard(blob)

        if (result.success) {
          toast.success(result.message)
        } else if (result.fallbackToShare) {
          toast.error(result.message, { duration: 4000 })
          return
        } else {
          toast.error(result.message)
          return
        }
      }

      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      track("leaderboard_share_copied", {
        user_count: userCount,
        background_style: backgroundStyle,
        date_range: dateRange,
        format: exportFormat,
        show_emojis: showEmojis,
      })
    } catch (error) {
      if (isIOS() || isWebView()) {
        toast.error("Copying failed on this device. Use Share instead.", { duration: 4000 })
      } else {
        toast.error("Failed to copy")
      }
    } finally {
      restoreImages?.()
      setIsGenerating(false)
    }
  }, [getCardElement, convertImagesToDataUrls, generateAnimatedGif, exportFormat, workspaceName, userCount, backgroundStyle, dateRange, showEmojis, track])

  const handleDownload = useCallback(async () => {
    const element = getCardElement()
    if (!element) return

    setIsGenerating(true)
    let restoreImages: (() => void) | null = null

    try {
      // Convert all images to data URLs to ensure correct images are captured
      restoreImages = await convertImagesToDataUrls(element)

      const baseFilename = `leaderboard-${workspaceName.toLowerCase().replace(/\s+/g, "-")}-${dateRange}`
      let downloadResult: DownloadResult

      if (exportFormat === "gif") {
        const gifBlob = await generateAnimatedGif(element)
        downloadResult = await downloadGif(gifBlob, `${baseFilename}.gif`)
      } else {
        const blob = await generateImage(element)
        downloadResult = await downloadImage(blob, `${baseFilename}.png`)
      }

      if (downloadResult.success) {
        if (downloadResult.method === "open") {
          // Special message for iOS fallback where image opens in new tab
          toast.success(downloadResult.message, { duration: 5000 })
        } else {
          toast.success(downloadResult.message)
        }

        track("leaderboard_share_downloaded", {
          user_count: userCount,
          background_style: backgroundStyle,
          date_range: dateRange,
          format: exportFormat,
          show_emojis: showEmojis,
          method: downloadResult.method,
        })
      } else {
        toast.error(downloadResult.message, { duration: 4000 })
      }
    } catch (error) {
      if (isIOS() || isWebView()) {
        toast.error("Download failed. Try using Share instead.", { duration: 4000 })
      } else {
        toast.error(`Failed to download ${exportFormat === "gif" ? "GIF" : "image"}`)
      }
    } finally {
      restoreImages?.()
      setIsGenerating(false)
    }
  }, [getCardElement, convertImagesToDataUrls, generateAnimatedGif, workspaceName, dateRange, exportFormat, userCount, backgroundStyle, showEmojis, track])

  const handleShare = useCallback(async () => {
    const element = getCardElement()
    if (!element) return

    setIsGenerating(true)
    let restoreImages: (() => void) | null = null

    try {
      // Convert all images to data URLs to ensure correct images are captured
      restoreImages = await convertImagesToDataUrls(element)

      let result: ShareResult
      if (exportFormat === "gif") {
        const gifBlob = await generateAnimatedGif(element)
        result = await shareGifWithResult(
          gifBlob,
          `${workspaceName} Emoji Leaderboard`,
          "Made with Emoji Studio: https://emojistudio.xyz"
        )
      } else {
        const blob = await generateImage(element)
        result = await shareImageWithResult(
          blob,
          `${workspaceName} Emoji Leaderboard`,
          "Made with Emoji Studio: https://emojistudio.xyz"
        )
      }

      if (result.success && !result.cancelled) {
        // Show appropriate message based on the method used
        if (result.method === "download") {
          toast.success(result.message, { duration: 4000 })
        } else {
          toast.success(result.message)
        }

        track("leaderboard_share_shared", {
          user_count: userCount,
          background_style: backgroundStyle,
          date_range: dateRange,
          format: exportFormat,
          show_emojis: showEmojis,
          method: result.method,
        })
      } else if (!result.success) {
        toast.error(result.message, { duration: 4000 })
      }
    } catch (error) {
      toast.error("Failed to share")
    } finally {
      restoreImages?.()
      setIsGenerating(false)
    }
  }, [getCardElement, convertImagesToDataUrls, generateAnimatedGif, exportFormat, workspaceName, userCount, backgroundStyle, dateRange, showEmojis, track])

  const handleLinkedInShare = useCallback(async () => {
    const element = getCardElement()
    if (!element) return

    setIsGenerating(true)
    let restoreImages: (() => void) | null = null

    try {
      // Convert all images to data URLs to ensure correct images are captured
      restoreImages = await convertImagesToDataUrls(element)

      // Generate PNG image (LinkedIn doesn't support GIF in clipboard paste)
      const blob = await generateImage(element)
      const baseFilename = `leaderboard-${workspaceName.toLowerCase().replace(/\s+/g, "-")}-${dateRange}`

      // Try to copy image to clipboard so user can paste directly into LinkedIn
      const copyResult = await copyImageToClipboard(blob)
      let successMessage = "Image copied! Paste (⌘V) in your LinkedIn post."

      if (!copyResult.success) {
        // Fallback: download the image if clipboard fails
        const downloadResult = await downloadImage(blob, `${baseFilename}.png`)

        if (downloadResult.success) {
          if (isIOS() || isWebView()) {
            successMessage = "Image saved! Upload it to your LinkedIn post."
          } else {
            successMessage = "Image downloaded! Upload it to your LinkedIn post."
          }
        }
      }

      // Open LinkedIn share dialog with promotional copy
      const linkedInText = encodeURIComponent(
        `Check out our team's emoji creation leaderboard! 🏆\n\nWe use Emoji Studio to create and manage custom Slack emojis. It's been a game-changer for our team culture! 🎨\n\nTry it out: https://emojistudio.xyz`
      )
      const linkedInUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${linkedInText}`
      window.open(linkedInUrl, "_blank", "noopener,noreferrer")

      toast.success(successMessage, { duration: 5000 })
      track("leaderboard_share_linkedin", {
        user_count: userCount,
        background_style: backgroundStyle,
        date_range: dateRange,
        format: exportFormat,
        show_emojis: showEmojis,
      })
    } catch (error) {
      toast.error("Failed to share to LinkedIn")
    } finally {
      restoreImages?.()
      setIsGenerating(false)
    }
  }, [getCardElement, convertImagesToDataUrls, exportFormat, workspaceName, dateRange, userCount, backgroundStyle, showEmojis, track])

  const content = (
    <div className="flex flex-col gap-3">
      {/* Format and emoji toggles row */}
      <div className="flex items-center justify-between gap-4">
        {/* Export format toggle */}
        <ToggleGroup
          type="single"
          value={exportFormat}
          onValueChange={(value) => value && setExportFormat(value as ExportFormat)}
          className="h-8"
        >
          <ToggleGroupItem value="image" aria-label="Image" className="h-8 px-3 gap-1.5">
            <Image className="w-3.5 h-3.5" />
            <span className="text-xs">Image</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="gif" aria-label="GIF" className="h-8 px-3 gap-1.5">
            <Film className="w-3.5 h-3.5" />
            <span className="text-xs">GIF</span>
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Show emojis toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="show-emojis"
            checked={showEmojis}
            onCheckedChange={setShowEmojis}
            className="scale-90"
          />
          <Label htmlFor="show-emojis" className="text-xs text-muted-foreground cursor-pointer">
            Show emojis
          </Label>
        </div>
      </div>

      {/* User count and time range row */}
      <div className="flex items-end gap-4">
        {/* User count picker */}
        <div className="space-y-1.5 flex-1">
          <label className="text-xs font-medium text-muted-foreground">Show top</label>
          <ToggleGroup
            type="single"
            value={String(userCount)}
            onValueChange={(value) => value && setUserCount(Number(value) as UserCount)}
            className="justify-start"
          >
            <ToggleGroupItem value="3" aria-label="Top 3" className="px-4">
              Top 3
            </ToggleGroupItem>
            <ToggleGroupItem value="5" aria-label="Top 5" className="px-4">
              Top 5
            </ToggleGroupItem>
            <ToggleGroupItem value="10" aria-label="Top 10" className="px-4">
              Top 10
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Time range picker */}
        {onDateRangeChange && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Time range</label>
            <Select value={dateRange} onValueChange={(value) => onDateRangeChange(value as DateRange)}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(DATE_RANGE_LABELS) as [DateRange, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Background color picker */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Background</label>
        <div className="flex gap-2">
          {(Object.entries(SHARE_BACKGROUNDS) as [ShareBackgroundStyle, typeof SHARE_BACKGROUNDS[ShareBackgroundStyle]][]).map(
            ([key, value]) => (
              <button
                key={key}
                onClick={() => setBackgroundStyle(key)}
                className={cn(
                  "relative w-8 h-8 rounded-md transition-all shrink-0",
                  "ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  backgroundStyle === key && "ring-2 ring-primary ring-offset-1"
                )}
                style={{ background: `linear-gradient(to bottom, ${value.from}, ${value.to})` }}
                title={value.label}
              >
                {backgroundStyle === key && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            )
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="relative flex justify-center py-1">
        <div
          className={cn(
            "transition-opacity duration-200",
            isGenerating && "opacity-50"
          )}
        >
          <div className="transform scale-[0.72] origin-center" ref={cardRef}>
            <LeaderboardShareCard
              users={users}
              timeRange={dateRange}
              userCount={userCount}
              workspaceName={workspaceName}
              backgroundStyle={backgroundStyle}
              showEmojis={showEmojis}
            />
          </div>
        </div>
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleCopy}
          disabled={isGenerating}
        >
          {copied ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          {copied ? "Copied!" : "Copy"}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleDownload}
          disabled={isGenerating}
        >
          <Download className="w-4 h-4 mr-2" />
          {exportFormat === "gif" ? "Download GIF" : "Download"}
        </Button>
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
      </div>

      {/* LinkedIn share button */}
      <Button
        variant="outline"
        className="w-full bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 border-[#0A66C2]/30 text-[#0A66C2] dark:text-[#5EA3E8]"
        onClick={handleLinkedInShare}
        disabled={isGenerating}
      >
        <svg
          className="w-4 h-4 mr-2"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
        Share to LinkedIn
      </Button>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Share Leaderboard</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">{content}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Leaderboard</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
