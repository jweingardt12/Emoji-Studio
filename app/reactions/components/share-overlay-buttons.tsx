"use client"

import { useState } from "react"
import { Download, Copy, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { domToPng } from "modern-screenshot"
import { copyImageToClipboard, downloadImage } from "@/lib/utils/share-image"

interface ShareOverlayButtonsProps {
  contentRef: React.RefObject<HTMLDivElement | null>
  filename: string
  dateRange?: string
  showLabels?: boolean
}

const DATE_RANGE_LABELS: Record<string, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
}

export function ShareOverlayButtons({ contentRef, filename, dateRange, showLabels }: ShareOverlayButtonsProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  async function getBlob(): Promise<Blob | null> {
    if (!contentRef.current) return null
    const el = contentRef.current

    const isDark = document.documentElement.classList.contains("dark")
    const bgColor = isDark ? "#1c1c1c" : "#ffffff"
    const textColor = isDark ? "#e5e5e5" : "#1a1a1a"

    // Save and modify styles for full capture
    const origMaxHeight = el.style.maxHeight
    const origOverflow = el.style.overflow
    el.style.maxHeight = "none"
    el.style.overflow = "visible"

    // Hide share/close buttons and X button
    const buttonsContainer = el.querySelector("[data-share-buttons]") as HTMLElement | null
    if (buttonsContainer) buttonsContainer.style.display = "none"
    const closeBtn = el.querySelector("[data-close-button]") as HTMLElement | null
    if (closeBtn) closeBtn.style.display = "none"

    // Swap Slack CDN images to proxy before capture
    const images = el.querySelectorAll("img")
    const originalSrcs: string[] = []
    images.forEach((img) => {
      const src = img.getAttribute("src") || ""
      originalSrcs.push(src)
      if (src.includes("slack-edge.com") || src.includes("slack.com")) {
        img.setAttribute("src", `/api/image-proxy?url=${encodeURIComponent(src)}`)
      }
    })

    // Wait for proxied images to load
    await Promise.all(
      Array.from(el.querySelectorAll("img")).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve()
            img.onload = () => resolve()
            img.onerror = () => resolve()
            setTimeout(resolve, 3000)
          })
      )
    )

    // Add subtle borders to section headings for the capture
    const sectionBorder = isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)"
    const sectionBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"
    const sections = el.querySelectorAll("[data-share-section]")
    sections.forEach((section) => {
      const s = section as HTMLElement
      s.style.border = sectionBorder
      s.style.borderRadius = "8px"
      s.style.padding = "12px 16px"
      s.style.backgroundColor = sectionBg
    })

    // Add branding
    const branding = document.createElement("div")
    const timeLabel = dateRange ? DATE_RANGE_LABELS[dateRange] || dateRange : ""

    branding.setAttribute("data-branding", "true")
    branding.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:12px 20px 0;`
    branding.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <img src="/logo.png" width="24" height="24" style="border-radius:6px;" />
        <span style="font-weight:600;font-size:14px;color:${textColor}">Emoji Studio</span>
      </div>
      ${timeLabel ? `<span style="font-size:12px;opacity:0.5;color:${textColor}">${timeLabel}</span>` : ""}
    `
    el.insertBefore(branding, el.firstChild)

    const footer = document.createElement("div")
    footer.setAttribute("data-branding", "true")
    const footerBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
    footer.style.cssText = `padding:14px 20px 18px;text-align:center;border-top:1px solid ${footerBorder};margin-top:8px;`
    footer.innerHTML = `
      <span style="font-size:13px;font-weight:500;color:${textColor};opacity:0.6;">Made with</span>
      <span style="font-size:13px;font-weight:700;color:${textColor};opacity:0.8;"> Emoji Studio</span>
      <span style="font-size:11px;color:${textColor};opacity:0.4;display:block;margin-top:2px;">emojistudio.xyz</span>
    `
    el.appendChild(footer)

    try {
      const dataUrl = await domToPng(el, {
        scale: 2,
        backgroundColor: bgColor,
        filter: (node: Node) => {
          if (node instanceof HTMLElement) {
            if (node.getAttribute("data-radix-popper-content-wrapper") !== null) return false
            if (node.getAttribute("role") === "tooltip") return false
          }
          return true
        },
      })

      const response = await fetch(dataUrl)
      return await response.blob()
    } finally {
      // Restore everything
      el.style.maxHeight = origMaxHeight
      el.style.overflow = origOverflow
      el.querySelectorAll("[data-branding]").forEach((n) => n.remove())
      if (buttonsContainer) buttonsContainer.style.display = ""
      if (closeBtn) closeBtn.style.display = ""
      // Restore image srcs
      images.forEach((img, i) => img.setAttribute("src", originalSrcs[i]))
      // Remove section styles
      sections.forEach((section) => {
        const s = section as HTMLElement
        s.style.border = ""
        s.style.borderRadius = ""
        s.style.padding = ""
        s.style.backgroundColor = ""
      })
    }
  }

  async function handleDownload() {
    setIsGenerating(true)
    try {
      const blob = await getBlob()
      if (!blob) {
        toast.error("Failed to generate image")
        return
      }
      const result = await downloadImage(blob, filename)
      if (result.success) {
        toast.success("Image downloaded!")
      } else {
        toast.error(result.message || "Download failed")
      }
    } catch {
      toast.error("Failed to download image")
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleCopy() {
    setIsGenerating(true)
    try {
      const blob = await getBlob()
      if (!blob) {
        toast.error("Failed to generate image")
        return
      }
      const result = await copyImageToClipboard(blob)
      if (result.success) {
        setCopied(true)
        toast.success("Copied to clipboard!")
        setTimeout(() => setCopied(false), 2000)
      } else {
        toast.error(result.message || "Copy failed — try Download instead")
      }
    } catch {
      toast.error("Copy failed — try Download instead")
    } finally {
      setIsGenerating(false)
    }
  }

  if (showLabels) {
    return (
      <div className="flex items-center gap-2" data-share-buttons>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleDownload}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Download PNG
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleCopy}
          disabled={isGenerating}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied!" : "Copy to Clipboard"}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1" data-share-buttons>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="z-[10000]">Download PNG</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopy}
            disabled={isGenerating}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="z-[10000]">{copied ? "Copied!" : "Copy to clipboard"}</TooltipContent>
      </Tooltip>
    </div>
  )
}
