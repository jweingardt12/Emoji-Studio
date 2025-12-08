"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { MilestoneEmoji } from "@/lib/services/wrapped-service"
import { proxyImageUrl, EMOJI_PLACEHOLDER, hasValidUrl } from "@/lib/utils/image-proxy"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import { Trophy, Sparkles, ChevronLeft, ChevronRight } from "lucide-react"

interface MilestonesSlideProps {
  milestones: MilestoneEmoji[]
  workspaceName: string
  year: number
  captureMode?: boolean
}

// Format milestone number with ordinal suffix (100th, 200th, etc.)
function formatMilestoneOrdinal(milestone: number): string {
  const suffix = getOrdinalSuffix(milestone)
  if (milestone >= 1000) {
    const k = milestone / 1000
    const num = k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`
    return `${num}${suffix}`
  }
  return `${milestone}${suffix}`
}

// Get ordinal suffix for a number
function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

// Get a fun label for the milestone
function getMilestoneLabel(milestone: number): string {
  if (milestone === 100) return "Century!"
  if (milestone === 500) return "Half K!"
  if (milestone === 1000) return "The Big One!"
  if (milestone === 5000) return "5K Club!"
  if (milestone === 10000) return "10K Legend!"
  if (milestone === 25000) return "25K Master!"
  if (milestone === 50000) return "50K Ultimate!"
  return `#${milestone.toLocaleString()}`
}

// Get accent color for milestone tier
function getMilestoneColor(milestone: number): string {
  if (milestone >= 10000) return "var(--wrapped-accent-orange)"
  if (milestone >= 5000) return "var(--wrapped-accent-purple)"
  if (milestone >= 1000) return "var(--wrapped-accent-cyan)"
  return "var(--wrapped-accent-purple)"
}

// Get tier name for grouping
function getMilestoneTier(milestone: number): "legendary" | "epic" | "rare" | "common" {
  if (milestone >= 10000) return "legendary"
  if (milestone >= 5000) return "epic"
  if (milestone >= 1000) return "rare"
  return "common"
}

// Milestone card component for better performance
function MilestoneCard({
  milestone,
  index,
  captureMode,
  shouldReduceAnimations,
  onImageError,
  hasFailed,
}: {
  milestone: MilestoneEmoji
  index: number
  captureMode: boolean
  shouldReduceAnimations: boolean
  onImageError: (key: string) => void
  hasFailed: boolean
}) {
  const key = `milestone-${milestone.milestone}`
  const color = getMilestoneColor(milestone.milestone)
  const tier = getMilestoneTier(milestone.milestone)

  return (
    <motion.div
      initial={captureMode ? false : { scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{
        delay: captureMode ? 0 : Math.min(0.1 + index * 0.05, 0.6),
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
      whileHover={shouldReduceAnimations ? undefined : { scale: 1.05, y: -4 }}
      whileTap={shouldReduceAnimations ? undefined : { scale: 0.98 }}
      className={`
        relative flex-shrink-0 wrapped-glass rounded-2xl p-3 sm:p-4
        border transition-all duration-300 cursor-default
        ${tier === "legendary" ? "border-[var(--wrapped-accent-orange)]/40" :
          tier === "epic" ? "border-[var(--wrapped-accent-purple)]/30" :
          tier === "rare" ? "border-[var(--wrapped-accent-cyan)]/25" :
          "border-white/10"}
        hover:border-white/30
        w-[140px] sm:w-[160px] md:w-[180px]
      `}
      style={{
        boxShadow: tier === "legendary"
          ? `0 0 30px ${color}30, 0 4px 20px rgba(0,0,0,0.3)`
          : tier === "epic"
            ? `0 0 20px ${color}20, 0 4px 16px rgba(0,0,0,0.2)`
            : `0 4px 12px rgba(0,0,0,0.15)`,
      }}
    >
      {/* Tier glow effect */}
      {(tier === "legendary" || tier === "epic") && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${color}15 0%, transparent 70%)`,
          }}
          animate={shouldReduceAnimations ? {} : {
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Milestone number badge */}
      <div className="absolute -top-2 -right-2 z-10">
        <motion.div
          initial={captureMode ? false : { scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: captureMode ? 0 : Math.min(0.2 + index * 0.05, 0.7),
            type: "spring",
            stiffness: 400,
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}dd)`,
            color: "white",
          }}
        >
          <Trophy className="w-3 h-3" />
          <span>{formatMilestoneOrdinal(milestone.milestone)}</span>
        </motion.div>
      </div>

      {/* Emoji */}
      <div className="relative mb-2 sm:mb-3">
        <motion.div
          className="relative mx-auto w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20"
          whileHover={shouldReduceAnimations ? {} : { rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.4 }}
        >
          <img
            src={hasFailed ? EMOJI_PLACEHOLDER : proxyImageUrl(milestone.emoji.url)}
            alt={milestone.emoji.name}
            className="w-full h-full object-contain rounded-xl bg-white/5 p-1.5 sm:p-2"
            onError={() => onImageError(key)}
            loading="lazy"
          />
          {/* Sparkle for legendary/epic */}
          {tier === "legendary" && !captureMode && (
            <motion.div
              className="absolute -top-1 -right-1"
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-4 h-4 text-[var(--wrapped-accent-orange)]" />
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Emoji name */}
      <p className="text-white font-semibold text-xs sm:text-sm truncate mb-0.5 sm:mb-1 text-center">
        :{milestone.emoji.name}:
      </p>

      {/* Creator info */}
      <p className="text-[var(--wrapped-text-muted)] text-[10px] sm:text-xs truncate text-center">
        by {milestone.creatorFirstNameLastInitial}
      </p>

      {/* Date */}
      <p className="text-[var(--wrapped-text-muted)] text-[10px] sm:text-xs opacity-60 mt-0.5 text-center">
        {milestone.date}
      </p>
    </motion.div>
  )
}

export function MilestonesSlide({
  milestones,
  workspaceName,
  year,
  captureMode = false,
}: MilestonesSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const shouldReduceAnimations = useShouldReduceAnimations()

  // Hydration tracking for WKWebView compatibility
  const [hydrated, setHydrated] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const shouldAnimate = hydrated && !captureMode && !shouldReduceAnimations

  const handleImageError = (key: string) => {
    setFailedImages((prev) => new Set(prev).add(key))
  }

  // Filter to milestones with valid emoji URLs
  const validMilestones = useMemo(() =>
    milestones.filter(m => hasValidUrl(m.emoji)),
    [milestones]
  )

  // Check scroll state
  const updateScrollState = () => {
    const container = scrollContainerRef.current
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 10)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    )
  }

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    updateScrollState()
    container.addEventListener("scroll", updateScrollState, { passive: true })
    window.addEventListener("resize", updateScrollState)

    return () => {
      container.removeEventListener("scroll", updateScrollState)
      window.removeEventListener("resize", updateScrollState)
    }
  }, [validMilestones])

  // Scroll handlers
  const scrollBy = (direction: "left" | "right") => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = container.clientWidth * 0.8
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  // If no milestones, don't render
  if (validMilestones.length === 0) {
    return null
  }

  // Get highest milestone for celebration message
  const highestMilestone = validMilestones[validMilestones.length - 1]
  const celebrationMessage = useMemo(() => {
    if (!highestMilestone) return "Just getting started!"
    const m = highestMilestone.milestone
    if (m >= 50000) return "Absolutely legendary! 50K emojis!"
    if (m >= 25000) return "A quarter of the way to 100K!"
    if (m >= 10000) return "10,000+ emojis and counting!"
    if (m >= 5000) return "5K milestone achieved!"
    if (m >= 1000) return "Welcome to the 1K club!"
    if (m >= 500) return "Halfway to a thousand!"
    return "Growing strong!"
  }, [highestMilestone])

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Noise texture overlay */}
      <div className="wrapped-noise absolute inset-0 pointer-events-none" />

      {/* Capturable content */}
      <div
        ref={slideRef}
        className={`relative w-full max-w-6xl ${captureMode ? "h-[600px] overflow-hidden" : "h-full max-h-full flex flex-col"}`}
      >
        <div className={`flex flex-col items-center pt-4 pb-4 px-2 sm:px-4 w-full ${captureMode ? "h-full justify-between" : "h-full"}`}>
          {/* Consistent header */}
          <SlideHeader year={year} />

          {/* Title */}
          <div className="flex-shrink-0">
            {captureMode ? (
              <div className="mb-4">
                <h2 className="wrapped-headline text-white mb-2 text-3xl sm:text-4xl md:text-5xl">Milestone Moments</h2>
                <p className="wrapped-body text-base sm:text-lg">The emojis that hit big all-time numbers</p>
              </div>
            ) : (
              <BlurFade delay={0.1} shouldAnimate={shouldAnimate} className="mb-4">
                <h2 className="wrapped-headline mb-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
                  <GradientText
                    colors={[
                      "var(--wrapped-accent-orange)",
                      "var(--wrapped-accent-purple)",
                      "var(--wrapped-accent-cyan)",
                      "var(--wrapped-accent-orange)",
                    ]}
                    animationSpeed={6}
                  >
                    Milestone Moments
                  </GradientText>
                </h2>
                <p className="wrapped-body text-base sm:text-lg md:text-xl">The emojis that hit big all-time numbers</p>
              </BlurFade>
            )}
          </div>

          {/* Milestones horizontal scroll area */}
          <div className="relative flex-1 w-full min-h-0 flex items-center">
            {/* Left scroll button */}
            {validMilestones.length > 3 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: canScrollLeft ? 1 : 0 }}
                className={`
                  absolute left-0 z-20 p-2 sm:p-3 rounded-full
                  bg-black/60 backdrop-blur-sm border border-white/20
                  text-white/80 hover:text-white hover:bg-black/80
                  transition-all duration-200 shadow-lg
                  ${canScrollLeft ? "pointer-events-auto" : "pointer-events-none"}
                `}
                onClick={() => scrollBy("left")}
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.button>
            )}

            {/* Scrollable container */}
            <div
              ref={scrollContainerRef}
              className="
                w-full h-full overflow-x-auto overflow-y-hidden
                scrollbar-hide scroll-smooth
                flex items-center
                px-8 sm:px-12 md:px-16
              "
              style={{
                scrollSnapType: "x mandatory",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <div className="flex gap-3 sm:gap-4 md:gap-5 py-4 mx-auto">
                {validMilestones.map((milestone, index) => (
                  <div
                    key={`milestone-${milestone.milestone}`}
                    style={{ scrollSnapAlign: "center" }}
                  >
                    <MilestoneCard
                      milestone={milestone}
                      index={index}
                      captureMode={captureMode}
                      shouldReduceAnimations={shouldReduceAnimations}
                      onImageError={handleImageError}
                      hasFailed={failedImages.has(`milestone-${milestone.milestone}`)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right scroll button */}
            {validMilestones.length > 3 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: canScrollRight ? 1 : 0 }}
                className={`
                  absolute right-0 z-20 p-2 sm:p-3 rounded-full
                  bg-black/60 backdrop-blur-sm border border-white/20
                  text-white/80 hover:text-white hover:bg-black/80
                  transition-all duration-200 shadow-lg
                  ${canScrollRight ? "pointer-events-auto" : "pointer-events-none"}
                `}
                onClick={() => scrollBy("right")}
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.button>
            )}

            {/* Scroll hint gradient overlays */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-black/40 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${canScrollLeft ? "opacity-100" : "opacity-0"}`}
            />
            <div
              className={`absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-black/40 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${canScrollRight ? "opacity-100" : "opacity-0"}`}
            />
          </div>

          {/* Count indicator and celebration message */}
          <motion.div
            initial={captureMode ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: captureMode ? 0 : 0.8 }}
            className="flex-shrink-0 mt-2 sm:mt-4 text-center space-y-1"
          >
            <p
              className="wrapped-body text-sm sm:text-base md:text-lg font-medium"
              style={{ color: getMilestoneColor(highestMilestone?.milestone || 100) }}
            >
              {celebrationMessage}
            </p>
            {validMilestones.length > 6 && (
              <p className="text-[var(--wrapped-text-muted)] text-xs sm:text-sm">
                Swipe to see all {validMilestones.length} milestones
              </p>
            )}
          </motion.div>

          {/* Branding */}
          <div className="flex-shrink-0">
            <SlideBranding />
          </div>
        </div>
      </div>
    </div>
  )
}
