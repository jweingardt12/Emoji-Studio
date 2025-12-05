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

// Vibrant gradient backgrounds for Wrapped
export type WrappedBackgroundStyle =
  | "purple"   // Purple dream
  | "pink"     // Pink punch
  | "blue"     // Ocean blue
  | "sunset"   // Pink to yellow
  | "teal"     // Fresh teal
  | "violet"   // Deep violet

export const WRAPPED_BACKGROUNDS: Record<WrappedBackgroundStyle, { gradient: string; label: string }> = {
  purple: {
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    label: "Purple Dream",
  },
  pink: {
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    label: "Pink Punch",
  },
  blue: {
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    label: "Ocean Blue",
  },
  sunset: {
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    label: "Sunset",
  },
  teal: {
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    label: "Fresh Teal",
  },
  violet: {
    gradient: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
    label: "Deep Violet",
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

      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
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

          {/* Top creators */}
          <div className={cn(
            "flex justify-center gap-2",
            isStory ? "gap-3" : ""
          )}>
            {top3.map((creator, index) => (
              <div
                key={creator.userId}
                className={cn(
                  "flex flex-col items-center rounded-lg bg-white/15 backdrop-blur-sm",
                  isStory ? "px-3 py-2" : "px-2 py-1.5"
                )}
              >
                <span className={isStory ? "text-xl" : "text-base"}>
                  {MEDAL_EMOJIS[index]}
                </span>
                <span className={cn(
                  "text-white font-semibold truncate max-w-[60px]",
                  isStory ? "text-sm" : "text-xs"
                )}>
                  {formatName(creator.displayName)}
                </span>
                <span className={cn(
                  "text-white/70 font-medium",
                  isStory ? "text-xs" : "text-[10px]"
                )}>
                  {creator.emojiCount}
                </span>
              </div>
            ))}
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

          {/* Top creators */}
          <div
            className="flex justify-center"
            style={{ gap: isStory ? 30 : 20 }}
          >
            {top3.map((creator, index) => (
              <div
                key={creator.userId}
                className="flex flex-col items-center rounded-2xl bg-white/15 backdrop-blur-sm"
                style={{
                  padding: isStory ? "20px 30px" : "15px 25px",
                }}
              >
                <span style={{ fontSize: isStory ? 48 : 36 }}>
                  {MEDAL_EMOJIS[index]}
                </span>
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
            ))}
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

          {/* Top creators - slide in */}
          <div
            className="flex justify-center"
            style={{
              gap: isStory ? 30 : 20,
              opacity: creatorsOpacity,
              transform: `translateY(${creatorsY}px)`,
            }}
          >
            {top3.map((creator, index) => (
              <div
                key={creator.userId}
                className="flex flex-col items-center rounded-2xl bg-white/15 backdrop-blur-sm"
                style={{ padding: isStory ? "20px 30px" : "15px 25px" }}
              >
                <span style={{ fontSize: isStory ? 48 : 36 }}>
                  {MEDAL_EMOJIS[index]}
                </span>
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
            ))}
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
