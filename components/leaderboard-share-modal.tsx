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
  shareImage,
  canShare,
  downloadGif,
  shareGif,
} from "@/lib/utils/share-image"
import GIF from "gif.js"
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
  const [canShareFiles, setCanShareFiles] = useState(false)

  // Check Web Share API support on mount
  useEffect(() => {
    setCanShareFiles(canShare())
  }, [])

  // Track modal opened
  useEffect(() => {
    if (open) {
      track("leaderboard_share_opened", {
        user_count: userCount,
        date_range: dateRange,
      })
    }
  }, [open, track, userCount, dateRange])

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
      const isGif = originalSrc.toLowerCase().includes(".gif")

      // Mark GIF images
      if (isGif) {
        img.dataset.isGif = "true"
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
        console.warn("Failed to convert image to data URL:", img.src, error)
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
      })
    }
  }, [])

  // Generate a static GIF from an element (single frame, GIF format)
  const generateStaticGif = useCallback(async (element: HTMLElement): Promise<Blob> => {
    const { toCanvas } = await import("html-to-image")
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

  const handleCopy = useCallback(async () => {
    const element = getCardElement()
    if (!element) return

    setIsGenerating(true)
    let restoreImages: (() => void) | null = null
    try {
      // Convert all images to data URLs to ensure correct images are captured
      restoreImages = await convertImagesToDataUrls(element)

      if (exportFormat === "gif") {
        // Generate GIF and download (clipboard doesn't support GIF)
        const gifBlob = await generateStaticGif(element)
        const baseFilename = `leaderboard-${workspaceName.toLowerCase().replace(/\s+/g, "-")}-${dateRange}`
        downloadGif(gifBlob, `${baseFilename}.gif`)

        // Also copy PNG to clipboard
        const pngBlob = await generateImage(element)
        await copyImageToClipboard(pngBlob)
        toast.success("GIF downloaded & image copied!")
      } else {
        const blob = await generateImage(element)
        await copyImageToClipboard(blob)
        toast.success("Copied to clipboard!")
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
      toast.error("Failed to copy")
      console.error(error)
    } finally {
      restoreImages?.()
      setIsGenerating(false)
    }
  }, [getCardElement, convertImagesToDataUrls, generateStaticGif, exportFormat, workspaceName, userCount, backgroundStyle, dateRange, showEmojis, track])

  const handleDownload = useCallback(async () => {
    const element = getCardElement()
    if (!element) return

    setIsGenerating(true)
    let restoreImages: (() => void) | null = null

    try {
      // Convert all images to data URLs to ensure correct images are captured
      restoreImages = await convertImagesToDataUrls(element)

      const baseFilename = `leaderboard-${workspaceName.toLowerCase().replace(/\s+/g, "-")}-${dateRange}`

      if (exportFormat === "gif") {
        const gifBlob = await generateStaticGif(element)
        downloadGif(gifBlob, `${baseFilename}.gif`)
        toast.success("GIF downloaded!")
      } else {
        const blob = await generateImage(element)
        downloadImage(blob, `${baseFilename}.png`)
        toast.success("Image downloaded!")
      }

      track("leaderboard_share_downloaded", {
        user_count: userCount,
        background_style: backgroundStyle,
        date_range: dateRange,
        format: exportFormat,
        show_emojis: showEmojis,
      })
    } catch (error) {
      toast.error(`Failed to download ${exportFormat === "gif" ? "GIF" : "image"}`)
      console.error(error)
    } finally {
      restoreImages?.()
      setIsGenerating(false)
    }
  }, [getCardElement, convertImagesToDataUrls, generateStaticGif, workspaceName, dateRange, exportFormat, userCount, backgroundStyle, showEmojis, track])

  const handleShare = useCallback(async () => {
    const element = getCardElement()
    if (!element) return

    setIsGenerating(true)
    let restoreImages: (() => void) | null = null

    try {
      // Convert all images to data URLs to ensure correct images are captured
      restoreImages = await convertImagesToDataUrls(element)

      let success = false
      if (exportFormat === "gif") {
        const gifBlob = await generateStaticGif(element)
        success = await shareGif(
          gifBlob,
          `${workspaceName} Emoji Leaderboard`,
          "Made with Emoji Studio: https://emojistudio.xyz"
        )
      } else {
        const blob = await generateImage(element)
        success = await shareImage(
          blob,
          `${workspaceName} Emoji Leaderboard`,
          "Made with Emoji Studio: https://emojistudio.xyz"
        )
      }

      if (success) {
        track("leaderboard_share_shared", {
          user_count: userCount,
          background_style: backgroundStyle,
          date_range: dateRange,
          format: exportFormat,
          show_emojis: showEmojis,
        })
      }
    } catch (error) {
      toast.error("Failed to share")
      console.error(error)
    } finally {
      restoreImages?.()
      setIsGenerating(false)
    }
  }, [getCardElement, convertImagesToDataUrls, generateStaticGif, exportFormat, workspaceName, userCount, backgroundStyle, dateRange, showEmojis, track])

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

      // Copy image to clipboard so user can paste directly into LinkedIn
      try {
        await copyImageToClipboard(blob)
      } catch (clipboardError) {
        // Fallback: download the image if clipboard fails
        const baseFilename = `leaderboard-${workspaceName.toLowerCase().replace(/\s+/g, "-")}-${dateRange}`
        downloadImage(blob, `${baseFilename}.png`)
        console.warn("Clipboard copy failed, downloaded instead:", clipboardError)
      }

      // Open LinkedIn share dialog with promotional copy
      const linkedInText = encodeURIComponent(
        `Check out our team's emoji creation leaderboard! 🏆\n\nWe use Emoji Studio to create and manage custom Slack emojis. It's been a game-changer for our team culture! 🎨\n\nTry it out: https://emojistudio.xyz`
      )
      const linkedInUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${linkedInText}`
      window.open(linkedInUrl, "_blank", "noopener,noreferrer")

      toast.success("Image copied! Paste (⌘V) in your LinkedIn post.", { duration: 5000 })
      track("leaderboard_share_linkedin", {
        user_count: userCount,
        background_style: backgroundStyle,
        date_range: dateRange,
        format: exportFormat,
        show_emojis: showEmojis,
      })
    } catch (error) {
      toast.error("Failed to share to LinkedIn")
      console.error(error)
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
                  "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
        {canShareFiles && (
          <Button
            className="flex-1"
            onClick={handleShare}
            disabled={isGenerating}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        )}
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
