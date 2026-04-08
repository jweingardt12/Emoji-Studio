"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Download, Copy, Share2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { AggregatedReaction, ReactionStats } from "@/lib/services/reaction-service"

interface ShareCardGeneratorProps {
  stats: ReactionStats
  topReactions: AggregatedReaction[]
  customEmojiUrls: Map<string, string>
  channelNames: string[]
  dateRange: string
  onDownload?: () => void
  onCopy?: () => void
}

const CARD_W = 1200
const CARD_H = 630

const BAR_COLORS = [
  "#a855f7",
  "#ec4899",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#f43f5e",
  "#7c3aed",
  "#c026d3",
  "#e879f9",
  "#a21caf",
]

function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function getEmojiImageUrl(emojiName: string, customEmojiUrls: Map<string, string>): string | null {
  const custom = customEmojiUrls.get(emojiName)
  if (custom) return custom

  // Standard unicode emoji via Twemoji CDN
  // Map common emoji names to code points
  const codePoint = EMOJI_NAME_TO_CODEPOINT[emojiName]
  if (codePoint) {
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codePoint}.png`
  }

  return null
}

// A small mapping of frequently used reaction emoji names to Twemoji code points
const EMOJI_NAME_TO_CODEPOINT: Record<string, string> = {
  thumbsup: "1f44d",
  "+1": "1f44d",
  thumbsdown: "1f44e",
  "-1": "1f44e",
  heart: "2764",
  fire: "1f525",
  tada: "1f389",
  rocket: "1f680",
  eyes: "1f440",
  wave: "1f44b",
  clap: "1f44f",
  raised_hands: "1f64c",
  pray: "1f64f",
  muscle: "1f4aa",
  100: "1f4af",
  white_check_mark: "2705",
  x: "274c",
  warning: "26a0",
  star: "2b50",
  star2: "1f31f",
  sparkles: "2728",
  zap: "26a1",
  boom: "1f4a5",
  bulb: "1f4a1",
  trophy: "1f3c6",
  medal_sports: "1f3c5",
  crown: "1f451",
  gem: "1f48e",
  moneybag: "1f4b0",
  robot: "1f916",
  brain: "1f9e0",
  magic_wand: "1fa84",
  partying_face: "1f973",
  joy: "1f602",
  sob: "1f62d",
  thinking_face: "1f914",
  exploding_head: "1f92f",
  smiling_face_with_3_hearts: "1f970",
  slightly_smiling_face: "1f642",
  smile: "1f604",
  laughing: "1f606",
  wink: "1f609",
  sunglasses: "1f60e",
  innocent: "1f607",
  sweat_smile: "1f605",
  raised_hand: "270b",
  point_up: "261d",
  point_right: "1f449",
  point_left: "1f448",
  ok_hand: "1f44c",
  v: "270c",
  mega: "1f4e3",
  loudspeaker: "1f4e2",
  question: "2753",
  exclamation: "2757",
  checkered_flag: "1f3c1",
  dart: "1f3af",
  bell: "1f514",
  no_bell: "1f515",
  poop: "1f4a9",
  unicorn: "1f984",
  rainbow: "1f308",
  sunny: "2600",
  snowflake: "2744",
  coffee: "2615",
  pizza: "1f355",
  hamburger: "1f354",
  tada_balloon: "1f388",
  gift: "1f381",
  balloon: "1f388",
  confetti_ball: "1f38a",
}

async function generateCanvas(
  stats: ReactionStats,
  topReactions: AggregatedReaction[],
  customEmojiUrls: Map<string, string>,
  channelNames: string[],
  dateRange: string
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas")
  canvas.width = CARD_W
  canvas.height = CARD_H

  const ctx = canvas.getContext("2d")!

  // --- Background ---
  const bgGrad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H)
  bgGrad.addColorStop(0, "#0f172a")
  bgGrad.addColorStop(0.5, "#1a0a2e")
  bgGrad.addColorStop(1, "#0f172a")
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Subtle radial purple glow
  const radial = ctx.createRadialGradient(CARD_W * 0.15, CARD_H * 0.2, 0, CARD_W * 0.15, CARD_H * 0.2, 480)
  radial.addColorStop(0, "rgba(168, 85, 247, 0.18)")
  radial.addColorStop(1, "rgba(168, 85, 247, 0)")
  ctx.fillStyle = radial
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  const radial2 = ctx.createRadialGradient(CARD_W * 0.85, CARD_H * 0.8, 0, CARD_W * 0.85, CARD_H * 0.8, 380)
  radial2.addColorStop(0, "rgba(236, 72, 153, 0.15)")
  radial2.addColorStop(1, "rgba(236, 72, 153, 0)")
  ctx.fillStyle = radial2
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // --- Left column header ---
  const leftX = 60
  const rightX = CARD_W / 2 + 20

  // Title
  ctx.font = "bold 52px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  ctx.fillStyle = "#ffffff"
  ctx.fillText("Top Reactions", leftX, 90)

  // Subtitle: channels + date range
  const channelLabel =
    channelNames.length === 0
      ? ""
      : channelNames.length <= 3
        ? channelNames.map(n => `#${n}`).join(", ")
        : `#${channelNames[0]}, #${channelNames[1]} +${channelNames.length - 2} more`
  const dateLabel = dateRange === "7d" ? "Last 7 days" : "Last 30 days"
  const subtitleParts = [channelLabel, dateLabel].filter(Boolean)

  ctx.font = "22px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  ctx.fillStyle = "rgba(148, 163, 184, 0.9)"
  ctx.fillText(subtitleParts.join("  ·  "), leftX, 130)

  // Divider
  ctx.strokeStyle = "rgba(148, 163, 184, 0.15)"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(leftX, 148)
  ctx.lineTo(CARD_W - leftX, 148)
  ctx.stroke()

  // --- Reaction list ---
  const top10 = topReactions.slice(0, 10)
  const maxCount = top10[0]?.total_count ?? 1

  const listStartY = 170
  const rowH = 44
  const barMaxWidth = 340
  const emojiSize = 28
  const rankW = 32
  const emojiCol = leftX + rankW + 8
  const nameCol = emojiCol + emojiSize + 10
  const barCol = nameCol + 170
  const countCol = barCol + barMaxWidth + 12

  // Left column: items 1-5 | Right column: items 6-10
  const colDefs = [
    { startIdx: 0, endIdx: 5, xOff: 0 },
    { startIdx: 5, endIdx: 10, xOff: CARD_W / 2 - leftX + 20 },
  ]

  for (const col of colDefs) {
    for (let i = col.startIdx; i < Math.min(col.endIdx, top10.length); i++) {
      const reaction = top10[i]
      const rowY = listStartY + (i - col.startIdx) * rowH
      const xBase = col.xOff

      // Rank number
      ctx.font = `bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
      ctx.fillStyle = i < 3 ? BAR_COLORS[i] : "rgba(148, 163, 184, 0.6)"
      ctx.textAlign = "right"
      ctx.fillText(String(i + 1), leftX + xBase + rankW, rowY + 22)
      ctx.textAlign = "left"

      // Emoji image
      const emojiUrl = getEmojiImageUrl(reaction.emoji_name, customEmojiUrls)
      if (emojiUrl) {
        const img = await loadImageSafe(emojiUrl)
        if (img) {
          ctx.drawImage(img, leftX + xBase + emojiCol - leftX, rowY, emojiSize, emojiSize)
        } else {
          // Fallback: colored circle
          ctx.fillStyle = BAR_COLORS[i % BAR_COLORS.length]
          ctx.beginPath()
          ctx.arc(leftX + xBase + emojiCol - leftX + emojiSize / 2, rowY + emojiSize / 2, emojiSize / 2 - 1, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        ctx.fillStyle = BAR_COLORS[i % BAR_COLORS.length]
        ctx.beginPath()
        ctx.arc(leftX + xBase + emojiCol - leftX + emojiSize / 2, rowY + emojiSize / 2, emojiSize / 2 - 1, 0, Math.PI * 2)
        ctx.fill()
      }

      // Emoji name
      ctx.font = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      ctx.fillStyle = "rgba(226, 232, 240, 0.9)"
      const displayName = `:${reaction.emoji_name}:`
      const truncName = displayName.length > 18 ? displayName.slice(0, 15) + "…:" : displayName
      ctx.fillText(truncName, leftX + xBase + nameCol - leftX, rowY + 20)

      // Bar
      const barW = Math.max(4, Math.round((reaction.total_count / maxCount) * barMaxWidth))
      const barY = rowY + 27
      const barH = 8
      const barRadius = 4

      // Bar background track
      ctx.fillStyle = "rgba(148, 163, 184, 0.08)"
      ctx.beginPath()
      ctx.roundRect(leftX + xBase + barCol - leftX, barY, barMaxWidth, barH, barRadius)
      ctx.fill()

      // Bar fill
      const barGrad = ctx.createLinearGradient(
        leftX + xBase + barCol - leftX, 0,
        leftX + xBase + barCol - leftX + barW, 0
      )
      barGrad.addColorStop(0, BAR_COLORS[i % BAR_COLORS.length])
      barGrad.addColorStop(1, BAR_COLORS[(i + 2) % BAR_COLORS.length])
      ctx.fillStyle = barGrad
      ctx.beginPath()
      ctx.roundRect(leftX + xBase + barCol - leftX, barY, barW, barH, barRadius)
      ctx.fill()

      // Count
      ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      ctx.fillStyle = "rgba(226, 232, 240, 0.8)"
      ctx.fillText(
        reaction.total_count.toLocaleString(),
        leftX + xBase + countCol - leftX,
        rowY + 20
      )
    }
  }

  // --- Footer ---
  const footerY = CARD_H - 52

  // Footer divider
  ctx.strokeStyle = "rgba(148, 163, 184, 0.12)"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(leftX, footerY - 12)
  ctx.lineTo(CARD_W - leftX, footerY - 12)
  ctx.stroke()

  // Footer stats
  ctx.font = "18px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  ctx.fillStyle = "rgba(148, 163, 184, 0.75)"
  ctx.textAlign = "left"
  ctx.fillText(
    `${stats.total_reactions.toLocaleString()} total reactions  ·  ${stats.unique_emojis} unique emojis`,
    leftX,
    footerY + 16
  )

  // Branding
  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  ctx.fillStyle = "rgba(168, 85, 247, 0.85)"
  ctx.textAlign = "right"
  ctx.fillText("Made with Emoji Studio", CARD_W - leftX, footerY + 16)

  ctx.textAlign = "left"

  return canvas
}

export function ShareCardGenerator({
  stats,
  topReactions,
  customEmojiUrls,
  channelNames,
  dateRange,
  onDownload,
  onCopy,
}: ShareCardGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  if (stats.total_reactions === 0) return null

  async function getBlob(): Promise<Blob | null> {
    const canvas = await generateCanvas(stats, topReactions, customEmojiUrls, channelNames, dateRange)
    return new Promise(resolve => canvas.toBlob(blob => {
      canvas.width = 0  // release GPU backing store
      resolve(blob)
    }, "image/png"))
  }

  async function handleDownload() {
    setIsGenerating(true)
    try {
      const blob = await getBlob()
      if (!blob) {
        toast.error("Failed to generate card")
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "reaction-stats.png"
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Card downloaded!")
      onDownload?.()
    } catch (err) {
      console.error("Download error:", err)
      toast.error("Failed to generate card")
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleCopy() {
    setIsGenerating(true)
    try {
      const blob = await getBlob()
      if (!blob) {
        toast.error("Failed to generate card")
        return
      }
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ])
      setCopied(true)
      toast.success("Card copied to clipboard!")
      onCopy?.()
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Copy error:", err)
      toast.error("Copy failed — try Download instead")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="h-4 w-4 text-purple-500" />
          Share Your Stats
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Generate a shareable 1200×630 PNG card with your top reactions. Share it in Slack, Twitter, or anywhere.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="default"
            onClick={handleDownload}
            disabled={isGenerating}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isGenerating ? "Generating…" : "Download PNG"}
          </Button>
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={isGenerating}
            className="gap-2"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy to Clipboard"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
