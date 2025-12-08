"use client"

import { useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { MilestoneEmoji } from "@/lib/services/wrapped-service"
import { proxyImageUrl, EMOJI_PLACEHOLDER, hasValidUrl } from "@/lib/utils/image-proxy"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import { Trophy, Sparkles } from "lucide-react"

interface MilestonesSlideProps {
  milestones: MilestoneEmoji[]
  workspaceName: string
  year: number
  captureMode?: boolean
}

// Get a fun label for the milestone
function getMilestoneLabel(milestone: number): string {
  if (milestone === 100) return "Century!"
  if (milestone === 500) return "Half a thousand!"
  if (milestone === 1000) return "The Big One!"
  if (milestone === 2000) return "Double trouble!"
  if (milestone === 3000) return "Triple threat!"
  return `#${milestone.toLocaleString()}`
}

// Get accent color for milestone tier
function getMilestoneColor(milestone: number): string {
  if (milestone >= 1000) return "var(--wrapped-accent-orange)"
  if (milestone >= 500) return "var(--wrapped-accent-purple)"
  return "var(--wrapped-accent-cyan)"
}

export function MilestonesSlide({
  milestones,
  workspaceName,
  year,
  captureMode = false,
}: MilestonesSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const shouldReduceAnimations = useShouldReduceAnimations()

  // Hydration tracking for WKWebView compatibility
  const [hydrated, setHydrated] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  useEffect(() => {
    setHydrated(true)
  }, [])
  const shouldAnimate = hydrated && !captureMode && !shouldReduceAnimations

  const handleImageError = (key: string) => {
    setFailedImages((prev) => new Set(prev).add(key))
  }

  // Filter to milestones with valid emoji URLs
  const validMilestones = milestones.filter(m => hasValidUrl(m.emoji))

  // If no milestones, don't render
  if (validMilestones.length === 0) {
    return null
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Noise texture overlay */}
      <div className="wrapped-noise absolute inset-0 pointer-events-none" />

      {/* Capturable content */}
      <div
        ref={slideRef}
        className={`relative w-full max-w-4xl ${captureMode ? "h-[600px] overflow-hidden" : "h-full max-h-full overflow-y-auto scrollbar-hide"}`}
      >
        <div className={`flex flex-col items-center pt-4 pb-4 px-4 sm:px-6 w-full ${captureMode ? "h-full justify-between" : "min-h-full justify-between"}`}>
          {/* Consistent header */}
          <SlideHeader year={year} />

          {/* Title */}
          {captureMode ? (
            <div className="mb-6">
              <h2 className="wrapped-headline text-white mb-2 text-4xl sm:text-5xl">Milestone Moments</h2>
              <p className="wrapped-body text-lg sm:text-xl">The emojis that marked big numbers</p>
            </div>
          ) : (
            <BlurFade delay={0.1} shouldAnimate={shouldAnimate} className="mb-6">
              <h2 className="wrapped-headline mb-2 text-4xl sm:text-5xl md:text-6xl">
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
              <p className="wrapped-body text-lg sm:text-xl md:text-2xl">The emojis that marked big numbers</p>
            </BlurFade>
          )}

          {/* Milestones grid */}
          <div className="w-full max-w-3xl flex-1 flex items-center justify-center">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 w-full">
              {validMilestones.slice(0, 6).map((milestone, index) => {
                const key = `milestone-${milestone.milestone}`
                const hasFailed = failedImages.has(key)
                const color = getMilestoneColor(milestone.milestone)

                return (
                  <motion.div
                    key={key}
                    initial={captureMode ? false : { scale: 0, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{
                      delay: captureMode ? 0 : 0.2 + index * 0.1,
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                    }}
                    className="relative wrapped-glass rounded-2xl p-4 sm:p-5 border border-white/10 hover:border-white/20 transition-colors group"
                    style={{
                      boxShadow: `0 0 20px ${color}20`,
                    }}
                  >
                    {/* Glow effect on hover */}
                    <div
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at center, ${color}15 0%, transparent 70%)`,
                      }}
                    />

                    {/* Milestone number badge */}
                    <div className="absolute -top-2 -right-2 z-10">
                      <motion.div
                        initial={captureMode ? false : { scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: captureMode ? 0 : 0.4 + index * 0.1, type: "spring" }}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
                        style={{
                          background: color,
                          color: "white",
                        }}
                      >
                        <Trophy className="w-3 h-3" />
                        {milestone.milestone >= 1000
                          ? `${(milestone.milestone / 1000).toFixed(milestone.milestone % 1000 === 0 ? 0 : 1)}k`
                          : milestone.milestone}
                      </motion.div>
                    </div>

                    {/* Emoji */}
                    <div className="relative mb-3">
                      <motion.img
                        src={hasFailed ? EMOJI_PLACEHOLDER : proxyImageUrl(milestone.emoji.url)}
                        alt={milestone.emoji.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 mx-auto object-contain rounded-xl bg-white/5 p-2"
                        initial={captureMode || shouldReduceAnimations ? false : { rotate: -10 }}
                        animate={{ rotate: 0 }}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        onError={() => handleImageError(key)}
                      />
                      {/* Sparkle effect */}
                      {!captureMode && (
                        <motion.div
                          className="absolute -top-1 -right-1"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                        >
                          <Sparkles className="w-4 h-4" style={{ color }} />
                        </motion.div>
                      )}
                    </div>

                    {/* Emoji name */}
                    <p className="text-white font-semibold text-sm sm:text-base truncate mb-1">
                      :{milestone.emoji.name}:
                    </p>

                    {/* Creator info */}
                    <p className="text-[var(--wrapped-text-muted)] text-xs sm:text-sm truncate">
                      by {milestone.creatorFirstNameLastInitial}
                    </p>

                    {/* Date */}
                    <p className="text-[var(--wrapped-text-muted)] text-xs opacity-70 mt-1">
                      {milestone.date}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Fun message */}
          {validMilestones.length > 0 && (
            <motion.div
              initial={captureMode ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: captureMode ? 0 : 1 }}
              className="mt-6 text-center"
            >
              <p className="wrapped-body text-base sm:text-lg" style={{ color: getMilestoneColor(validMilestones[validMilestones.length - 1].milestone) }}>
                {validMilestones.length >= 5 ? "That's a lot of milestones!" : validMilestones.length >= 3 ? "Growing strong!" : "Just getting started!"}
              </p>
            </motion.div>
          )}

          {/* Branding */}
          <SlideBranding />
        </div>
      </div>
    </div>
  )
}
