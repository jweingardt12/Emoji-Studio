"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { WrappedFunStats, WrappedOverviewStats, WrappedGrowthStats } from "@/lib/services/wrapped-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { EmojiHero } from "../emoji-hero"
import { AnimatedList } from "@/components/ui/animated-list"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Emoji } from "@/lib/services/emoji-service"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import { Flame, Moon, TrendingUp, BarChart3, MessageSquare, Sparkles } from "lucide-react"

interface StatsSlideProps {
  funStats: WrappedFunStats
  overview: WrappedOverviewStats
  growth: WrappedGrowthStats
  workspaceName: string
  year: number
  captureMode?: boolean
  customEmojis?: Emoji[]
}

interface FunFactProps {
  icon: React.ReactNode
  text: React.ReactNode
}

function FunFact({ icon, text }: FunFactProps) {
  return (
    <div className="w-full px-4 py-3 sm:px-5 sm:py-4 md:px-6 md:py-5 rounded-2xl wrapped-glass border-white/10 flex items-center gap-3 sm:gap-4 group cursor-default transition-transform hover:scale-[1.02]">
      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-[var(--wrapped-accent-purple)]/20 to-[var(--wrapped-accent-cyan)]/20 flex items-center justify-center flex-shrink-0 border border-white/10 shadow-[0_0_15px_-5px_var(--wrapped-accent-purple)]">
        <div className="scale-110 sm:scale-125">{icon}</div>
      </div>
      <div className="flex-1 text-left text-[var(--wrapped-text-secondary)] text-sm sm:text-base md:text-lg leading-snug">
        {text}
      </div>
    </div>
  )
}

// SVG Donut Chart component for GIF vs Static visualization
function DonutChart({ percentage, captureMode }: { percentage: number; captureMode: boolean }) {
  const radius = 40
  const strokeWidth = 10
  const circumference = 2 * Math.PI * radius
  const gifDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32 md:w-40 md:h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* ... svg content ... */}
          {/* Background circle (faint) */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Static (purple) - full circle as background */}
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--wrapped-accent-purple)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={captureMode ? { strokeDashoffset: 0 } : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
          />
          {/* GIF (cyan) segment */}
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--wrapped-accent-cyan)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={captureMode ? { strokeDashoffset: gifDashoffset } : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: gifDashoffset }}
            transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
            style={{ filter: "drop-shadow(0 0 6px var(--wrapped-accent-cyan))" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white font-bold text-2xl md:text-3xl">{percentage}%</span>
          <span className="text-[var(--wrapped-text-muted)] text-xs md:text-sm uppercase tracking-wider">GIFs</span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex gap-6 mt-4 text-sm md:text-base">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[var(--wrapped-accent-cyan)]" />
          <span className="text-[var(--wrapped-text-secondary)] font-medium">GIFs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[var(--wrapped-accent-purple)]" />
          <span className="text-[var(--wrapped-text-secondary)] font-medium">Static</span>
        </div>
      </div>
    </div>
  )
}

export function StatsSlide({
  funStats,
  overview,
  growth,
  workspaceName,
  year,
  captureMode = false,
  customEmojis = []
}: StatsSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const shouldReduceAnimations = useShouldReduceAnimations()

  // Get sample emojis for showcase
  const showcaseEmojis = customEmojis.slice(0, 8)

  // Build fun facts list with playful copy
  const funFacts: FunFactProps[] = []

  // Streak
  if (funStats.longestStreak.days >= 2) {
    funFacts.push({
      icon: <Flame className="w-4 h-4 text-orange-400" />,
      text: (
        <span>
          Longest streak: <span className="text-white font-semibold">{funStats.longestStreak.days} days</span> of pure creativity
        </span>
      ),
    })
  }

  // Late night
  if (funStats.lateNightCount > 0) {
    funFacts.push({
      icon: <Moon className="w-4 h-4 text-purple-400" />,
      text: (
        <span>
          <span className="text-white font-semibold">{funStats.lateNightCount}</span> emojis made after midnight {funStats.lateNightCount >= 20 ? "(night owl!)" : ""}
        </span>
      ),
    })
  }

  // Weekly average
  funFacts.push({
    icon: <BarChart3 className="w-4 h-4 text-cyan-400" />,
    text: (
      <span>
        Averaged <span className="text-white font-semibold">{overview.averagePerWeek}</span> emojis per week
      </span>
    ),
  })

  // Growth
  if (growth.hasYoYData) {
    const isUp = growth.growthTrend === "up"
    funFacts.push({
      icon: <TrendingUp className={`w-4 h-4 ${isUp ? "text-green-400" : growth.growthTrend === "down" ? "text-red-400" : "text-gray-400"}`} />,
      text: (
        <span>
          {isUp ? "Up" : growth.growthTrend === "down" ? "Down" : "Flat"}{" "}
          <span className="text-white font-semibold">
            {growth.growthPercentage > 0 ? "+" : ""}{growth.growthPercentage}%
          </span>{" "}
          from last year {isUp && growth.growthPercentage > 50 ? "🚀" : ""}
        </span>
      ),
    })
  } else {
    funFacts.push({
      icon: <Sparkles className="w-4 h-4 text-yellow-400" />,
      text: <span className="text-white font-semibold">First year on record! 🎉</span>,
    })
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Noise texture overlay */}
      <div className="wrapped-noise absolute inset-0 pointer-events-none" />

      {/* Capturable content */}
      <div
        ref={slideRef}
        className={`relative w-full max-w-2xl md:max-w-4xl ${captureMode ? "h-[600px] overflow-hidden" : "h-full max-h-full overflow-y-auto scrollbar-hide"}`}
      >
        <div className={`flex flex-col items-center pt-4 pb-4 px-4 sm:px-6 w-full ${captureMode ? "h-full justify-between" : "min-h-full justify-between"}`}>

          {/* Top Section: Header & Title */}
          <div className="w-full flex flex-col items-center flex-shrink-0">
            <div className="mb-4">
              <SlideHeader year={year} />
            </div>

            {/* Title */}
            {captureMode ? (
              <div className="mb-6">
                <h2 className="wrapped-headline text-white mb-2 text-4xl sm:text-5xl">The Deep Dive</h2>
                <p className="wrapped-body text-lg sm:text-xl">Insights from {workspaceName}'s emoji journey</p>
              </div>
            ) : (
              <BlurFade delay={0.1} className="mb-6 w-full max-w-3xl">
                <h2 className="wrapped-headline mb-2 text-4xl sm:text-5xl md:text-6xl">
                  <GradientText
                    colors={[
                      "var(--wrapped-accent-cyan)",
                      "var(--wrapped-accent-purple)",
                      "var(--wrapped-accent-orange)",
                      "var(--wrapped-accent-cyan)",
                    ]}
                    animationSpeed={6}
                  >
                    The Deep Dive
                  </GradientText>
                </h2>
                <p className="wrapped-body text-lg sm:text-xl md:text-2xl">Insights from {workspaceName}'s emoji journey</p>
              </BlurFade>
            )}
          </div>

          {/* Middle Section: Main Content */}
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            {/* Main content row */}
            <div className="flex flex-col md:flex-row items-center md:items-stretch gap-4 md:gap-8 w-full max-w-3xl mb-4 sm:mb-8">
              {/* GIF vs Static Donut */}
              <motion.div
                initial={captureMode ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex-shrink-0 w-full md:w-auto flex justify-center"
              >
                <div className="rounded-3xl wrapped-glass p-6 md:p-8 flex flex-col items-center justify-center h-full">
                  <DonutChart percentage={overview.gifPercentage} captureMode={captureMode} />
                </div>
              </motion.div>

              {/* Fun facts with AnimatedList */}
              <div className="flex-1 space-y-3 w-full">
                {captureMode ? (
                  // Static version for capture
                  funFacts.slice(0, 4).map((fact, i) => (
                    <FunFact key={i} {...fact} />
                  ))
                ) : (
                  // Animated version for live experience
                  <AnimatedList delay={500} className="gap-3">
                    {funFacts.slice(0, 4).map((fact, i) => (
                      <FunFact key={i} {...fact} />
                    ))}
                  </AnimatedList>
                )}
              </div>
            </div>

            {/* Most common word callout */}
            {funStats.mostCommonWord && (
              <motion.div
                initial={captureMode ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: captureMode ? 0 : 2.5 }}
                className="px-4 py-2 sm:px-5 sm:py-3 rounded-2xl wrapped-glass border border-[var(--wrapped-accent-purple)]/30 flex items-center gap-2 sm:gap-3 mb-4"
              >
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--wrapped-accent-purple)]" />
                <span className="text-[var(--wrapped-text-secondary)] text-sm sm:text-base">Favorite word: </span>
                <span className="text-white font-bold text-base sm:text-lg">"{funStats.mostCommonWord.word}"</span>
                <span className="text-[var(--wrapped-text-muted)]">
                  ({captureMode ? funStats.mostCommonWord.count : (
                    <NumberTicker
                      value={funStats.mostCommonWord.count}
                      delay={2.7}
                      className="text-[var(--wrapped-text-muted)]"
                    />
                  )}x)
                </span>
              </motion.div>
            )}

            {/* Longest name - Hero emoji treatment */}
            {funStats.longestName && (
              <motion.div
                initial={captureMode ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: captureMode ? 0 : 3 }}
                className="flex flex-col items-center gap-3 mb-4"
              >
                <p className="wrapped-label text-xs">
                  Longest name ({funStats.longestName.length} characters)
                </p>
                <EmojiHero
                  emoji={funStats.longestName.emoji}
                  size="md"
                  glow="purple"
                  animate={!captureMode}
                  captureMode={captureMode}
                  delay={3.2}
                />
                <p className="text-white font-medium text-sm font-mono bg-white/10 px-3 py-1 rounded-full">
                  :{funStats.longestName.emoji.name}:
                </p>
              </motion.div>
            )}

            {/* Emoji showcase row */}
            {showcaseEmojis.length > 0 && (
              <motion.div
                initial={captureMode ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: captureMode ? 0 : 3.5 }}
                className="flex flex-wrap justify-center gap-2 max-w-[280px] sm:max-w-[360px] mb-6"
              >
                {showcaseEmojis.map((emoji, i) => (
                  <motion.img
                    key={emoji.url}
                    src={proxyImageUrl(emoji.url)}
                    alt={emoji.name}
                    className="w-10 h-10 object-contain rounded-lg shadow-md"
                    initial={captureMode || shouldReduceAnimations ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: captureMode ? 0 : 3.6 + i * 0.05 }}
                  />
                ))}
              </motion.div>
            )}
          </div>

          {/* Bottom Section: Branding */}
          <div className="flex-shrink-0 mb-safe">
            <SlideBranding />
          </div>
        </div>
      </div>

      {/* Share button */}
      <SlideShareButton
        slideRef={slideRef}
        slideName="stats"
        workspaceName={workspaceName}
        year={year}
        backgroundColor="var(--wrapped-bg-start)"
      />
    </div>
  )
}
