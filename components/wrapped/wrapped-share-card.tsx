"use client"

import { WrappedStats, TopCreator } from "@/lib/services/wrapped-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { cn } from "@/lib/utils"

// CSS for shimmer animation (for GIF export)
const shimmerStyles = `
@keyframes shimmer {
  0% {
    transform: translateX(-100%) rotate(15deg);
  }
  100% {
    transform: translateX(200%) rotate(15deg);
  }
}
.wrapped-shimmer {
  animation: shimmer 3s ease-in-out infinite;
}
`

// Easing functions for smooth animations
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

// Calculate animated value with easing
function animateValue(progress: number, start: number, end: number, startProgress: number, endProgress: number): number {
  if (progress < startProgress) return start
  if (progress >= endProgress) return end
  const t = (progress - startProgress) / (endProgress - startProgress)
  return start + (end - start) * easeOutCubic(t)
}

// Calculate opacity for fade-in effect
function fadeIn(progress: number, startProgress: number, duration: number = 0.1): number {
  if (progress < startProgress) return 0
  if (progress >= startProgress + duration) return 1
  return (progress - startProgress) / duration
}

// Vibrant gradient backgrounds for Wrapped - enhanced with richer colors
export type WrappedBackgroundStyle =
  | "purple"   // Electric Purple
  | "pink"     // Hot Pink
  | "blue"     // Electric Blue
  | "sunset"   // Vibrant Sunset
  | "teal"     // Neon Teal
  | "violet"   // Deep Violet
  | "fire"     // Fire Orange
  | "aurora"   // Northern Lights

export const WRAPPED_BACKGROUNDS: Record<WrappedBackgroundStyle, { gradient: string; label: string }> = {
  purple: {
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 25%, #D946EF 50%, #EC4899 100%)",
    label: "Electric Purple",
  },
  pink: {
    gradient: "linear-gradient(135deg, #FF0080 0%, #FF4D94 30%, #F472B6 60%, #FB7185 100%)",
    label: "Hot Pink",
  },
  blue: {
    gradient: "linear-gradient(135deg, #0EA5E9 0%, #06B6D4 35%, #22D3EE 70%, #67E8F9 100%)",
    label: "Electric Blue",
  },
  sunset: {
    gradient: "linear-gradient(135deg, #F97316 0%, #FB923C 25%, #FBBF24 50%, #FDE047 100%)",
    label: "Vibrant Sunset",
  },
  teal: {
    gradient: "linear-gradient(135deg, #14B8A6 0%, #2DD4BF 30%, #5EEAD4 60%, #99F6E4 100%)",
    label: "Neon Teal",
  },
  violet: {
    gradient: "linear-gradient(135deg, #7C3AED 0%, #8B5CF6 30%, #A78BFA 60%, #C4B5FD 100%)",
    label: "Deep Violet",
  },
  fire: {
    gradient: "linear-gradient(135deg, #DC2626 0%, #EA580C 30%, #F97316 60%, #FBBF24 100%)",
    label: "Fire Orange",
  },
  aurora: {
    gradient: "linear-gradient(135deg, #06B6D4 0%, #8B5CF6 35%, #D946EF 65%, #F472B6 100%)",
    label: "Aurora",
  },
}

export type WrappedCardSize = "square" | "story" | "wide"

export const WRAPPED_SIZES: Record<WrappedCardSize, { width: number; height: number; label: string }> = {
  square: { width: 1080, height: 1080, label: "Square (1080x1080)" },
  story: { width: 1080, height: 1920, label: "Story (1080x1920)" },
  wide: { width: 1200, height: 630, label: "Wide (1200x630)" },
}

// Preview sizes (scaled down for display)
const PREVIEW_SCALE = 0.35

interface WrappedShareCardProps {
  stats: WrappedStats
  workspaceName: string
  backgroundStyle: WrappedBackgroundStyle
  size: WrappedCardSize
}

const MEDAL_EMOJIS = ["🥇", "🥈", "🥉"]

function formatName(name: string): string {
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

// Collect emojis from creators for background decoration
function collectBackgroundEmojis(stats: WrappedStats): { url: string; name: string }[] {
  const emojis: { url: string; name: string }[] = []

  // Get emojis from top creators
  stats.topCreators.forEach(creator => {
    creator.topEmojis.forEach(emoji => {
      if (emoji.url && emojis.length < 12) {
        emojis.push({ url: proxyImageUrl(emoji.url), name: emoji.name })
      }
    })
  })

  // Add busiest day emojis if available
  if (stats.busiestDay?.emojis) {
    stats.busiestDay.emojis.forEach(emoji => {
      if (emoji.url && emojis.length < 12) {
        emojis.push({ url: proxyImageUrl(emoji.url), name: emoji.name })
      }
    })
  }

  return emojis.slice(0, 10) // Limit to 10 emojis
}

// Fixed positions for floating emojis to ensure consistent placement
const EMOJI_POSITIONS = [
  { top: '8%', left: '5%', size: 1.2, rotate: -15 },
  { top: '15%', right: '8%', size: 1.0, rotate: 20 },
  { top: '35%', left: '3%', size: 0.9, rotate: 10 },
  { top: '45%', right: '5%', size: 1.1, rotate: -10 },
  { top: '65%', left: '6%', size: 1.0, rotate: 25 },
  { top: '70%', right: '4%', size: 0.8, rotate: -20 },
  { top: '85%', left: '10%', size: 0.9, rotate: 15 },
  { top: '88%', right: '12%', size: 1.0, rotate: -5 },
  { top: '25%', left: '85%', size: 0.7, rotate: 30 },
  { top: '55%', left: '90%', size: 0.8, rotate: -25 },
]

export function WrappedShareCard({
  stats,
  workspaceName,
  backgroundStyle,
  size,
}: WrappedShareCardProps) {
  const bg = WRAPPED_BACKGROUNDS[backgroundStyle]
  const dimensions = WRAPPED_SIZES[size]
  const isStory = size === "story"
  const isWide = size === "wide"

  // Scale for preview
  const previewWidth = dimensions.width * PREVIEW_SCALE
  const previewHeight = dimensions.height * PREVIEW_SCALE

  // Get top 3 creators
  const top3 = stats.topCreators.slice(0, 3)

  // Collect emojis for background
  const backgroundEmojis = collectBackgroundEmojis(stats)

  return (
    <div
      id="wrapped-share-card"
      className="relative overflow-hidden"
      style={{
        width: previewWidth,
        height: previewHeight,
        borderRadius: 16,
        background: bg.gradient,
      }}
    >
      {/* Floating emoji decorations */}
      {backgroundEmojis.map((emoji, index) => {
        const pos = EMOJI_POSITIONS[index % EMOJI_POSITIONS.length]
        const baseSize = isStory ? 24 : isWide ? 20 : 22
        const emojiSize = baseSize * (pos.size || 1)
        return (
          <img
            key={`${emoji.name}-${index}`}
            src={emoji.url}
            alt=""
            className="absolute pointer-events-none"
            style={{
              top: pos.top,
              left: pos.left,
              right: pos.right,
              width: emojiSize,
              height: emojiSize,
              transform: `rotate(${pos.rotate}deg)`,
              opacity: 0.4,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            }}
          />
        )
      })}

      {/* Highlight overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.3) 0%, transparent 50%),
            linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 30%, transparent 60%, rgba(0,0,0,0.2) 100%)
          `,
        }}
      />

      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Content */}
      <div className={cn(
        "relative flex flex-col h-full",
        isStory ? "p-4 py-6" : isWide ? "p-3 flex-row items-center" : "p-3"
      )}>
        {/* Header */}
        <div className={cn(
          "text-center",
          isWide ? "flex-1 text-left pr-4" : "mb-auto"
        )}>
          <p className={cn(
            "font-bold text-white/90",
            isStory ? "text-base" : isWide ? "text-lg" : "text-sm"
          )} style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
            {workspaceName}
          </p>
          <h1 className={cn(
            "font-black text-white",
            isStory ? "text-4xl" : isWide ? "text-3xl" : "text-2xl"
          )} style={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
            {stats.year} Emoji Wrapped
          </h1>
        </div>

        {/* Main stats section */}
        <div className={cn(
          "flex-1 flex flex-col justify-center",
          isWide && "flex-none"
        )}>
          {/* Total emojis - big number */}
          <div className={cn(
            "text-center",
            isStory ? "mb-6" : "mb-3"
          )}>
            <div className={cn(
              "font-black text-white tabular-nums",
              isStory ? "text-6xl" : isWide ? "text-5xl" : "text-4xl"
            )} style={{ textShadow: "0 4px 8px rgba(0,0,0,0.3)" }}>
              {stats.overview.totalEmojis.toLocaleString()}
            </div>
            <p className={cn(
              "text-white/80 font-medium",
              isStory ? "text-lg" : "text-sm"
            )}>
              custom emojis created
            </p>
          </div>

          {/* Top creators with their emojis */}
          <div className={cn(
            "flex justify-center gap-2",
            isStory ? "gap-3" : ""
          )}>
            {top3.map((creator, index) => {
              const topEmoji = creator.topEmojis[0]
              return (
                <div
                  key={creator.userId}
                  className={cn(
                    "flex flex-col items-center rounded-lg bg-white/20 backdrop-blur-sm border border-white/10",
                    isStory ? "px-3 py-2" : "px-2 py-1.5"
                  )}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={isStory ? "text-lg" : "text-sm"}>
                      {MEDAL_EMOJIS[index]}
                    </span>
                    {topEmoji && (
                      <img
                        src={proxyImageUrl(topEmoji.url)}
                        alt=""
                        className={cn(
                          "rounded",
                          isStory ? "w-5 h-5" : "w-4 h-4"
                        )}
                      />
                    )}
                  </div>
                  <span className={cn(
                    "text-white font-semibold truncate max-w-[60px]",
                    isStory ? "text-sm" : "text-xs"
                  )}>
                    {formatName(creator.displayName)}
                  </span>
                  <span className={cn(
                    "text-white/80 font-bold tabular-nums",
                    isStory ? "text-xs" : "text-[10px]"
                  )}>
                    {creator.emojiCount}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Quick stats row */}
          <div className={cn(
            "flex justify-center gap-4 mt-3",
            isStory ? "mt-6 gap-6" : ""
          )}>
            <div className="text-center">
              <div className={cn(
                "font-bold text-white",
                isStory ? "text-xl" : "text-base"
              )}>
                {stats.overview.totalCreators}
              </div>
              <div className={cn(
                "text-white/60",
                isStory ? "text-xs" : "text-[10px]"
              )}>creators</div>
            </div>
            <div className="text-center">
              <div className={cn(
                "font-bold text-white",
                isStory ? "text-xl" : "text-base"
              )}>
                {stats.overview.gifPercentage}%
              </div>
              <div className={cn(
                "text-white/60",
                isStory ? "text-xs" : "text-[10px]"
              )}>GIFs</div>
            </div>
            <div className="text-center">
              <div className={cn(
                "font-bold text-white",
                isStory ? "text-xl" : "text-base"
              )}>
                {stats.funStats.longestStreak.days}
              </div>
              <div className={cn(
                "text-white/60",
                isStory ? "text-xs" : "text-[10px]"
              )}>day streak</div>
            </div>
          </div>
        </div>

        {/* Footer branding */}
        <div className={cn(
          "flex items-center justify-center gap-1.5 mt-auto pt-2",
          isWide && "absolute bottom-2 right-3"
        )}>
          <img
            src="/logo.png"
            alt="Emoji Studio"
            className={cn(
              "rounded",
              isStory ? "w-5 h-5" : "w-4 h-4"
            )}
          />
          <span className={cn(
            "text-white/50 font-medium",
            isStory ? "text-xs" : "text-[10px]"
          )}>
            emojistudio.xyz
          </span>
        </div>
      </div>
    </div>
  )
}

// Fixed positions for floating emojis (full export version - scaled up)
const EMOJI_POSITIONS_FULL = [
  { top: '8%', left: '5%', size: 1.2, rotate: -15 },
  { top: '15%', right: '8%', size: 1.0, rotate: 20 },
  { top: '35%', left: '3%', size: 0.9, rotate: 10 },
  { top: '45%', right: '5%', size: 1.1, rotate: -10 },
  { top: '65%', left: '6%', size: 1.0, rotate: 25 },
  { top: '70%', right: '4%', size: 0.8, rotate: -20 },
  { top: '85%', left: '10%', size: 0.9, rotate: 15 },
  { top: '88%', right: '12%', size: 1.0, rotate: -5 },
  { top: '25%', left: '88%', size: 0.7, rotate: 30 },
  { top: '55%', left: '92%', size: 0.8, rotate: -25 },
]

// Export version without preview scaling (for actual image generation)
export function WrappedShareCardFull({
  stats,
  workspaceName,
  backgroundStyle,
  size,
}: WrappedShareCardProps) {
  const bg = WRAPPED_BACKGROUNDS[backgroundStyle]
  const dimensions = WRAPPED_SIZES[size]
  const isStory = size === "story"
  const isWide = size === "wide"

  const top3 = stats.topCreators.slice(0, 3)

  // Scale factors based on size
  const scale = dimensions.width / 1080

  // Collect emojis for background
  const backgroundEmojis = collectBackgroundEmojis(stats)

  return (
    <div
      id="wrapped-share-card-full"
      className="relative overflow-hidden"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: 48 * scale,
        background: bg.gradient,
      }}
    >
      {/* Inject shimmer animation styles */}
      <style dangerouslySetInnerHTML={{ __html: shimmerStyles }} />

      {/* Floating emoji decorations */}
      {backgroundEmojis.map((emoji, index) => {
        const pos = EMOJI_POSITIONS_FULL[index % EMOJI_POSITIONS_FULL.length]
        const baseSize = isStory ? 64 : isWide ? 48 : 56
        const emojiSize = baseSize * (pos.size || 1)
        return (
          <img
            key={`bg-emoji-${emoji.name}-${index}`}
            src={emoji.url}
            alt=""
            className="absolute pointer-events-none"
            style={{
              top: pos.top,
              left: pos.left,
              right: pos.right,
              width: emojiSize,
              height: emojiSize,
              transform: `rotate(${pos.rotate}deg)`,
              opacity: 0.35,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
            }}
          />
        )
      })}

      {/* Animated shimmer overlay for GIF export */}
      <div
        className="wrapped-shimmer absolute pointer-events-none"
        style={{
          top: 0,
          left: 0,
          width: "50%",
          height: "200%",
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
        }}
      />

      {/* Highlight overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.25) 0%, transparent 50%),
            linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 30%, transparent 60%, rgba(0,0,0,0.3) 100%)
          `,
        }}
      />

      {/* Grain texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: `${128 * scale}px ${128 * scale}px`,
        }}
      />

      {/* Content */}
      <div
        className="relative flex flex-col h-full"
        style={{
          padding: isStory ? 60 : isWide ? 40 : 50,
        }}
      >
        {/* Header */}
        <div className="text-center mb-auto">
          <p
            className="font-bold text-white/90"
            style={{
              fontSize: isStory ? 36 : isWide ? 32 : 28,
              textShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            {workspaceName}
          </p>
          <h1
            className="font-black text-white"
            style={{
              fontSize: isStory ? 96 : isWide ? 72 : 64,
              textShadow: "0 4px 8px rgba(0,0,0,0.3)",
            }}
          >
            {stats.year} Emoji Wrapped
          </h1>
        </div>

        {/* Main stats */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Big number */}
          <div className="text-center" style={{ marginBottom: isStory ? 60 : 40 }}>
            <div
              className="font-black text-white tabular-nums"
              style={{
                fontSize: isStory ? 180 : isWide ? 140 : 120,
                textShadow: "0 8px 16px rgba(0,0,0,0.3)",
              }}
            >
              {stats.overview.totalEmojis.toLocaleString()}
            </div>
            <p
              className="text-white/80 font-medium"
              style={{ fontSize: isStory ? 40 : 32 }}
            >
              custom emojis created
            </p>
          </div>

          {/* Top creators with their emojis */}
          <div
            className="flex justify-center"
            style={{ gap: isStory ? 30 : 20 }}
          >
            {top3.map((creator, index) => {
              const topEmoji = creator.topEmojis[0]
              return (
                <div
                  key={creator.userId}
                  className="flex flex-col items-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/10"
                  style={{
                    padding: isStory ? "20px 30px" : "15px 25px",
                  }}
                >
                  <div className="flex items-center" style={{ gap: isStory ? 8 : 6, marginBottom: isStory ? 4 : 2 }}>
                    <span style={{ fontSize: isStory ? 48 : 36 }}>
                      {MEDAL_EMOJIS[index]}
                    </span>
                    {topEmoji && (
                      <img
                        src={proxyImageUrl(topEmoji.url)}
                        alt=""
                        className="rounded"
                        style={{ width: isStory ? 32 : 24, height: isStory ? 32 : 24 }}
                      />
                    )}
                  </div>
                  <span
                    className="text-white font-semibold"
                    style={{ fontSize: isStory ? 28 : 22 }}
                  >
                    {formatName(creator.displayName)}
                  </span>
                  <span
                    className="text-white/70 font-medium"
                    style={{ fontSize: isStory ? 22 : 18 }}
                  >
                    {creator.emojiCount} emojis
                  </span>
                </div>
              )
            })}
          </div>

          {/* Quick stats */}
          <div
            className="flex justify-center"
            style={{ gap: isStory ? 80 : 60, marginTop: isStory ? 60 : 40 }}
          >
            {[
              { value: stats.overview.totalCreators, label: "creators" },
              { value: `${stats.overview.gifPercentage}%`, label: "GIFs" },
              { value: stats.funStats.longestStreak.days, label: "day streak" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  className="font-bold text-white"
                  style={{ fontSize: isStory ? 56 : 44 }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-white/60"
                  style={{ fontSize: isStory ? 24 : 20 }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Branding */}
        <div
          className="flex items-center justify-center mt-auto"
          style={{ gap: 12, paddingTop: 20 }}
        >
          <img
            src="/logo.png"
            alt="Emoji Studio"
            className="rounded-lg"
            style={{ width: isStory ? 40 : 32, height: isStory ? 40 : 32 }}
          />
          <span
            className="text-white/50 font-medium"
            style={{ fontSize: isStory ? 24 : 20 }}
          >
            emojistudio.xyz
          </span>
        </div>
      </div>
    </div>
  )
}

// Animated version for video/GIF export
// animationProgress: 0-1 value representing the animation timeline
// Animation timeline:
//   0.00-0.15: Title and workspace name fade in
//   0.15-0.45: Big number counts up from 0
//   0.45-0.65: Top creators slide in from bottom
//   0.65-0.85: Stats fade in one by one
//   0.85-1.00: Everything visible, slight shimmer
interface WrappedShareCardAnimatedProps extends WrappedShareCardProps {
  animationProgress: number // 0-1
}

export function WrappedShareCardAnimated({
  stats,
  workspaceName,
  backgroundStyle,
  size,
  animationProgress,
}: WrappedShareCardAnimatedProps) {
  const bg = WRAPPED_BACKGROUNDS[backgroundStyle]
  const dimensions = WRAPPED_SIZES[size]
  const isStory = size === "story"
  const isWide = size === "wide"

  const top3 = stats.topCreators.slice(0, 3)
  const scale = dimensions.width / 1080
  const p = animationProgress // shorthand

  // Collect emojis for background
  const backgroundEmojis = collectBackgroundEmojis(stats)

  // Animation calculations
  const titleOpacity = fadeIn(p, 0, 0.15)
  const titleScale = animateValue(p, 0.8, 1, 0, 0.15)

  const countValue = Math.round(animateValue(p, 0, stats.overview.totalEmojis, 0.15, 0.45))
  const countOpacity = fadeIn(p, 0.15, 0.1)
  const countScale = animateValue(p, 0.5, 1, 0.15, 0.35)

  const creatorsOpacity = fadeIn(p, 0.45, 0.1)
  const creatorsY = animateValue(p, 50, 0, 0.45, 0.65)

  const statsData = [
    { value: stats.overview.totalCreators, label: "creators", startP: 0.65 },
    { value: `${stats.overview.gifPercentage}%`, label: "GIFs", startP: 0.72 },
    { value: stats.funStats.longestStreak.days, label: "day streak", startP: 0.79 },
  ]

  // Shimmer position for the final phase
  const shimmerX = p >= 0.85 ? animateValue(p, -100, 200, 0.85, 1.0) : -200

  // Emoji fade-in animation (fade in with main content)
  const emojiOpacity = fadeIn(p, 0.1, 0.2)

  return (
    <div
      id="wrapped-share-card-animated"
      className="relative overflow-hidden"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: 48 * scale,
        background: bg.gradient,
      }}
    >
      {/* Floating emoji decorations - fade in with animation */}
      {backgroundEmojis.map((emoji, index) => {
        const pos = EMOJI_POSITIONS_FULL[index % EMOJI_POSITIONS_FULL.length]
        const baseSize = isStory ? 64 : isWide ? 48 : 56
        const emojiSize = baseSize * (pos.size || 1)
        return (
          <img
            key={`bg-emoji-${emoji.name}-${index}`}
            src={emoji.url}
            alt=""
            className="absolute pointer-events-none"
            style={{
              top: pos.top,
              left: pos.left,
              right: pos.right,
              width: emojiSize,
              height: emojiSize,
              transform: `rotate(${pos.rotate}deg)`,
              opacity: 0.35 * emojiOpacity,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
            }}
          />
        )
      })}

      {/* Shimmer overlay */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0,
          left: 0,
          width: "50%",
          height: "200%",
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
          transform: `translateX(${shimmerX}%) rotate(15deg)`,
        }}
      />

      {/* Highlight overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.25) 0%, transparent 50%),
            linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 30%, transparent 60%, rgba(0,0,0,0.3) 100%)
          `,
        }}
      />

      {/* Grain texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: `${128 * scale}px ${128 * scale}px`,
        }}
      />

      {/* Content */}
      <div
        className="relative flex flex-col h-full"
        style={{ padding: isStory ? 60 : isWide ? 40 : 50 }}
      >
        {/* Header - Title */}
        <div
          className="text-center mb-auto"
          style={{
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
          }}
        >
          <p
            className="font-bold text-white/90"
            style={{
              fontSize: isStory ? 36 : isWide ? 32 : 28,
              textShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            {workspaceName}
          </p>
          <h1
            className="font-black text-white"
            style={{
              fontSize: isStory ? 96 : isWide ? 72 : 64,
              textShadow: "0 4px 8px rgba(0,0,0,0.3)",
            }}
          >
            {stats.year} Emoji Wrapped
          </h1>
        </div>

        {/* Main stats */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Big number - counts up */}
          <div
            className="text-center"
            style={{
              marginBottom: isStory ? 60 : 40,
              opacity: countOpacity,
              transform: `scale(${countScale})`,
            }}
          >
            <div
              className="font-black text-white tabular-nums"
              style={{
                fontSize: isStory ? 180 : isWide ? 140 : 120,
                textShadow: "0 8px 16px rgba(0,0,0,0.3)",
              }}
            >
              {countValue.toLocaleString()}
            </div>
            <p
              className="text-white/80 font-medium"
              style={{ fontSize: isStory ? 40 : 32 }}
            >
              custom emojis created
            </p>
          </div>

          {/* Top creators with emojis - slide in */}
          <div
            className="flex justify-center"
            style={{
              gap: isStory ? 30 : 20,
              opacity: creatorsOpacity,
              transform: `translateY(${creatorsY}px)`,
            }}
          >
            {top3.map((creator, index) => {
              const topEmoji = creator.topEmojis[0]
              return (
                <div
                  key={creator.userId}
                  className="flex flex-col items-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/10"
                  style={{ padding: isStory ? "20px 30px" : "15px 25px" }}
                >
                  <div className="flex items-center" style={{ gap: isStory ? 8 : 6, marginBottom: isStory ? 4 : 2 }}>
                    <span style={{ fontSize: isStory ? 48 : 36 }}>
                      {MEDAL_EMOJIS[index]}
                    </span>
                    {topEmoji && (
                      <img
                        src={proxyImageUrl(topEmoji.url)}
                        alt=""
                        className="rounded"
                        style={{ width: isStory ? 32 : 24, height: isStory ? 32 : 24 }}
                      />
                    )}
                  </div>
                  <span
                    className="text-white font-semibold"
                    style={{ fontSize: isStory ? 28 : 22 }}
                  >
                    {formatName(creator.displayName)}
                  </span>
                  <span
                    className="text-white/70 font-medium"
                    style={{ fontSize: isStory ? 22 : 18 }}
                  >
                    {creator.emojiCount} emojis
                  </span>
                </div>
              )
            })}
          </div>

          {/* Quick stats - fade in sequentially */}
          <div
            className="flex justify-center"
            style={{ gap: isStory ? 80 : 60, marginTop: isStory ? 60 : 40 }}
          >
            {statsData.map((stat) => {
              const opacity = fadeIn(p, stat.startP, 0.07)
              const translateY = animateValue(p, 20, 0, stat.startP, stat.startP + 0.1)
              return (
                <div
                  key={stat.label}
                  className="text-center"
                  style={{
                    opacity,
                    transform: `translateY(${translateY}px)`,
                  }}
                >
                  <div
                    className="font-bold text-white"
                    style={{ fontSize: isStory ? 56 : 44 }}
                  >
                    {stat.value}
                  </div>
                  <div
                    className="text-white/60"
                    style={{ fontSize: isStory ? 24 : 20 }}
                  >
                    {stat.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Branding - fade in at end */}
        <div
          className="flex items-center justify-center mt-auto"
          style={{
            gap: 12,
            paddingTop: 20,
            opacity: fadeIn(p, 0.8, 0.1),
          }}
        >
          <img
            src="/logo.png"
            alt="Emoji Studio"
            className="rounded-lg"
            style={{ width: isStory ? 40 : 32, height: isStory ? 40 : 32 }}
          />
          <span
            className="text-white/50 font-medium"
            style={{ fontSize: isStory ? 24 : 20 }}
          >
            emojistudio.xyz
          </span>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// MY EMOJIS SHARE CARD - Shows all user's emojis in a grid
// =============================================================================

import { Emoji } from "@/lib/services/emoji-service"

export interface MyEmojisShareCardProps {
  emojis: Emoji[]
  workspaceName: string
  backgroundStyle: WrappedBackgroundStyle
  size: WrappedCardSize
  year: number
  creatorName?: string
}

// Calculate grid dimensions based on emoji count and card size
function calculateGridLayout(emojiCount: number, size: WrappedCardSize): { cols: number; rows: number; maxEmojis: number } {
  // Different grid configurations based on card aspect ratio
  const configs: Record<WrappedCardSize, { cols: number; rows: number }> = {
    square: { cols: 8, rows: 8 },   // 64 emojis max
    story: { cols: 6, rows: 10 },   // 60 emojis max (taller)
    wide: { cols: 12, rows: 4 },    // 48 emojis max (wider)
  }

  const config = configs[size]
  return {
    cols: config.cols,
    rows: config.rows,
    maxEmojis: config.cols * config.rows,
  }
}

// Preview version of My Emojis card
export function MyEmojisShareCard({
  emojis,
  workspaceName,
  backgroundStyle,
  size,
  year,
  creatorName,
}: MyEmojisShareCardProps) {
  const bg = WRAPPED_BACKGROUNDS[backgroundStyle]
  const dimensions = WRAPPED_SIZES[size]
  const isStory = size === "story"
  const isWide = size === "wide"

  // Scale for preview
  const previewWidth = dimensions.width * PREVIEW_SCALE
  const previewHeight = dimensions.height * PREVIEW_SCALE

  const { cols, rows, maxEmojis } = calculateGridLayout(emojis.length, size)
  const displayEmojis = emojis.slice(0, maxEmojis)

  // Calculate emoji size based on available space
  const gridPadding = isStory ? 16 : 12
  const headerSpace = isStory ? 80 : isWide ? 50 : 60
  const footerSpace = isStory ? 60 : 50
  const availableWidth = previewWidth - (gridPadding * 2)
  const availableHeight = previewHeight - headerSpace - footerSpace - (gridPadding * 2)
  const emojiSize = Math.min(
    Math.floor(availableWidth / cols) - 2,
    Math.floor(availableHeight / rows) - 2
  )

  return (
    <div
      id="my-emojis-share-card"
      className="relative overflow-hidden"
      style={{
        width: previewWidth,
        height: previewHeight,
        borderRadius: 16,
        background: bg.gradient,
      }}
    >
      {/* Highlight overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.3) 0%, transparent 50%),
            linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 30%, transparent 60%, rgba(0,0,0,0.2) 100%)
          `,
        }}
      />

      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Content */}
      <div className={cn(
        "relative flex flex-col h-full",
        isStory ? "p-4 py-5" : isWide ? "p-3" : "p-3"
      )}>
        {/* Header */}
        <div className={cn(
          "text-center",
          isWide ? "mb-2" : "mb-3"
        )}>
          <h1 className={cn(
            "font-black text-white",
            isStory ? "text-2xl" : isWide ? "text-xl" : "text-lg"
          )} style={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
            {creatorName ? `${creatorName}'s` : "My"} {year} Emojis
          </h1>
          <p className={cn(
            "text-white/80 font-medium",
            isStory ? "text-sm" : "text-xs"
          )}>
            {emojis.length} custom emoji{emojis.length !== 1 ? "s" : ""} created
          </p>
        </div>

        {/* Emoji Grid */}
        <div
          className="flex-1 flex items-center justify-center"
          style={{ padding: gridPadding }}
        >
          <div
            className="grid gap-0.5"
            style={{
              gridTemplateColumns: `repeat(${cols}, ${emojiSize}px)`,
              gridTemplateRows: `repeat(${rows}, ${emojiSize}px)`,
            }}
          >
            {displayEmojis.map((emoji, index) => (
              <div
                key={`${emoji.name}-${index}`}
                className="flex items-center justify-center"
                style={{ width: emojiSize, height: emojiSize }}
              >
                <img
                  src={proxyImageUrl(emoji.url)}
                  alt={emoji.name}
                  className="object-contain rounded-sm"
                  style={{
                    width: emojiSize - 2,
                    height: emojiSize - 2,
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                  }}
                />
              </div>
            ))}
            {/* Fill remaining cells with empty placeholders for alignment */}
            {Array.from({ length: Math.max(0, maxEmojis - displayEmojis.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center opacity-20"
                style={{ width: emojiSize, height: emojiSize }}
              >
                <div
                  className="rounded-sm bg-white/10"
                  style={{ width: emojiSize - 4, height: emojiSize - 4 }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer branding with capybara */}
        <div className={cn(
          "flex items-center justify-center gap-1.5 mt-auto pt-2",
          isWide && "pt-1"
        )}>
          <img
            src="/logo.png"
            alt="Emoji Studio"
            className={cn(
              "rounded",
              isStory ? "w-4 h-4" : "w-3 h-3"
            )}
          />
          <span className={cn(
            "text-white/60 font-medium",
            isStory ? "text-[10px]" : "text-[8px]"
          )}>
            generated with Emoji Studio
          </span>
        </div>
      </div>
    </div>
  )
}

// Full export version of My Emojis card
export function MyEmojisShareCardFull({
  emojis,
  workspaceName,
  backgroundStyle,
  size,
  year,
  creatorName,
}: MyEmojisShareCardProps) {
  const bg = WRAPPED_BACKGROUNDS[backgroundStyle]
  const dimensions = WRAPPED_SIZES[size]
  const isStory = size === "story"
  const isWide = size === "wide"

  const scale = dimensions.width / 1080
  const { cols, rows, maxEmojis } = calculateGridLayout(emojis.length, size)
  const displayEmojis = emojis.slice(0, maxEmojis)

  // Calculate emoji size based on available space (full size)
  const gridPadding = isStory ? 50 : 40
  const headerSpace = isStory ? 200 : isWide ? 140 : 160
  const footerSpace = isStory ? 120 : 100
  const availableWidth = dimensions.width - (gridPadding * 2)
  const availableHeight = dimensions.height - headerSpace - footerSpace - (gridPadding * 2)
  const emojiSize = Math.min(
    Math.floor(availableWidth / cols) - 8,
    Math.floor(availableHeight / rows) - 8
  )

  return (
    <div
      id="my-emojis-share-card-full"
      className="relative overflow-hidden"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: 48 * scale,
        background: bg.gradient,
      }}
    >
      {/* Highlight overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.25) 0%, transparent 50%),
            linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 30%, transparent 60%, rgba(0,0,0,0.3) 100%)
          `,
        }}
      />

      {/* Grain texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: `${128 * scale}px ${128 * scale}px`,
        }}
      />

      {/* Content */}
      <div
        className="relative flex flex-col h-full"
        style={{
          padding: isStory ? 50 : isWide ? 40 : 45,
        }}
      >
        {/* Header */}
        <div className="text-center" style={{ marginBottom: isStory ? 30 : 20 }}>
          <h1
            className="font-black text-white"
            style={{
              fontSize: isStory ? 72 : isWide ? 56 : 64,
              textShadow: "0 4px 8px rgba(0,0,0,0.3)",
            }}
          >
            {creatorName ? `${creatorName}'s` : "My"} {year} Emojis
          </h1>
          <p
            className="text-white/80 font-medium"
            style={{ fontSize: isStory ? 32 : 28 }}
          >
            {emojis.length} custom emoji{emojis.length !== 1 ? "s" : ""} created
          </p>
        </div>

        {/* Emoji Grid */}
        <div
          className="flex-1 flex items-center justify-center"
          style={{ padding: gridPadding }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, ${emojiSize}px)`,
              gridTemplateRows: `repeat(${rows}, ${emojiSize}px)`,
              gap: 8,
            }}
          >
            {displayEmojis.map((emoji, index) => (
              <div
                key={`${emoji.name}-${index}`}
                className="flex items-center justify-center"
                style={{ width: emojiSize, height: emojiSize }}
              >
                <img
                  src={proxyImageUrl(emoji.url)}
                  alt={emoji.name}
                  className="object-contain rounded"
                  style={{
                    width: emojiSize - 4,
                    height: emojiSize - 4,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
                  }}
                />
              </div>
            ))}
            {/* Fill remaining cells */}
            {Array.from({ length: Math.max(0, maxEmojis - displayEmojis.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center opacity-15"
                style={{ width: emojiSize, height: emojiSize }}
              >
                <div
                  className="rounded bg-white/10"
                  style={{ width: emojiSize - 8, height: emojiSize - 8 }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer branding with capybara */}
        <div
          className="flex items-center justify-center mt-auto"
          style={{ gap: 16, paddingTop: 20 }}
        >
          <img
            src="/logo.png"
            alt="Emoji Studio"
            className="rounded-lg"
            style={{ width: isStory ? 48 : 40, height: isStory ? 48 : 40 }}
          />
          <span
            className="text-white/60 font-semibold"
            style={{ fontSize: isStory ? 28 : 24 }}
          >
            generated with Emoji Studio
          </span>
        </div>
      </div>
    </div>
  )
}

// Animated version of My Emojis card (emojis cascade in)
interface MyEmojisShareCardAnimatedProps extends MyEmojisShareCardProps {
  animationProgress: number // 0-1
}

export function MyEmojisShareCardAnimated({
  emojis,
  workspaceName,
  backgroundStyle,
  size,
  year,
  creatorName,
  animationProgress,
}: MyEmojisShareCardAnimatedProps) {
  const bg = WRAPPED_BACKGROUNDS[backgroundStyle]
  const dimensions = WRAPPED_SIZES[size]
  const isStory = size === "story"
  const isWide = size === "wide"

  const scale = dimensions.width / 1080
  const p = animationProgress
  const { cols, rows, maxEmojis } = calculateGridLayout(emojis.length, size)
  const displayEmojis = emojis.slice(0, maxEmojis)

  // Animation calculations
  const titleOpacity = fadeIn(p, 0, 0.1)
  const titleScale = animateValue(p, 0.9, 1, 0, 0.1)
  const countValue = Math.round(animateValue(p, 0, emojis.length, 0.1, 0.3))

  // Emojis cascade in over time
  const emojiRevealProgress = animateValue(p, 0, 1, 0.15, 0.85)
  const emojisToShow = Math.round(displayEmojis.length * emojiRevealProgress)

  const brandingOpacity = fadeIn(p, 0.85, 0.1)

  // Shimmer position
  const shimmerX = p >= 0.9 ? animateValue(p, -100, 200, 0.9, 1.0) : -200

  // Calculate emoji size
  const gridPadding = isStory ? 50 : 40
  const headerSpace = isStory ? 200 : isWide ? 140 : 160
  const footerSpace = isStory ? 120 : 100
  const availableWidth = dimensions.width - (gridPadding * 2)
  const availableHeight = dimensions.height - headerSpace - footerSpace - (gridPadding * 2)
  const emojiSize = Math.min(
    Math.floor(availableWidth / cols) - 8,
    Math.floor(availableHeight / rows) - 8
  )

  return (
    <div
      id="my-emojis-share-card-animated"
      className="relative overflow-hidden"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: 48 * scale,
        background: bg.gradient,
      }}
    >
      {/* Shimmer overlay */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0,
          left: 0,
          width: "50%",
          height: "200%",
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
          transform: `translateX(${shimmerX}%) rotate(15deg)`,
        }}
      />

      {/* Highlight overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.25) 0%, transparent 50%),
            linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 30%, transparent 60%, rgba(0,0,0,0.3) 100%)
          `,
        }}
      />

      {/* Grain texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: `${128 * scale}px ${128 * scale}px`,
        }}
      />

      {/* Content */}
      <div
        className="relative flex flex-col h-full"
        style={{
          padding: isStory ? 50 : isWide ? 40 : 45,
        }}
      >
        {/* Header - animated */}
        <div
          className="text-center"
          style={{
            marginBottom: isStory ? 30 : 20,
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
          }}
        >
          <h1
            className="font-black text-white"
            style={{
              fontSize: isStory ? 72 : isWide ? 56 : 64,
              textShadow: "0 4px 8px rgba(0,0,0,0.3)",
            }}
          >
            {creatorName ? `${creatorName}'s` : "My"} {year} Emojis
          </h1>
          <p
            className="text-white/80 font-medium tabular-nums"
            style={{ fontSize: isStory ? 32 : 28 }}
          >
            {countValue} custom emoji{countValue !== 1 ? "s" : ""} created
          </p>
        </div>

        {/* Emoji Grid - cascade animation */}
        <div
          className="flex-1 flex items-center justify-center"
          style={{ padding: gridPadding }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, ${emojiSize}px)`,
              gridTemplateRows: `repeat(${rows}, ${emojiSize}px)`,
              gap: 8,
            }}
          >
            {displayEmojis.map((emoji, index) => {
              const isVisible = index < emojisToShow
              const individualProgress = isVisible
                ? Math.min(1, (emojisToShow - index) / 3) // Fade in over 3 emoji reveals
                : 0

              return (
                <div
                  key={`${emoji.name}-${index}`}
                  className="flex items-center justify-center"
                  style={{
                    width: emojiSize,
                    height: emojiSize,
                    opacity: individualProgress,
                    transform: `scale(${0.5 + individualProgress * 0.5})`,
                  }}
                >
                  <img
                    src={proxyImageUrl(emoji.url)}
                    alt={emoji.name}
                    className="object-contain rounded"
                    style={{
                      width: emojiSize - 4,
                      height: emojiSize - 4,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
                    }}
                  />
                </div>
              )
            })}
            {/* Empty placeholders */}
            {Array.from({ length: Math.max(0, maxEmojis - displayEmojis.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center opacity-15"
                style={{ width: emojiSize, height: emojiSize }}
              >
                <div
                  className="rounded bg-white/10"
                  style={{ width: emojiSize - 8, height: emojiSize - 8 }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer branding - fade in at end */}
        <div
          className="flex items-center justify-center mt-auto"
          style={{
            gap: 16,
            paddingTop: 20,
            opacity: brandingOpacity,
          }}
        >
          <img
            src="/logo.png"
            alt="Emoji Studio"
            className="rounded-lg"
            style={{ width: isStory ? 48 : 40, height: isStory ? 48 : 40 }}
          />
          <span
            className="text-white/60 font-semibold"
            style={{ fontSize: isStory ? 28 : 24 }}
          >
            generated with Emoji Studio
          </span>
        </div>
      </div>
    </div>
  )
}
