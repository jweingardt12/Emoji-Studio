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
    <div className="w-full px-4 py-3 rounded-xl wrapped-glass flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--wrapped-accent-purple)]/30 to-[var(--wrapped-accent-cyan)]/30 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 text-left text-[var(--wrapped-text-secondary)] text-sm">
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
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
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
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white font-bold text-xl">{percentage}%</span>
          <span className="text-[var(--wrapped-text-muted)] text-[10px]">GIFs</span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--wrapped-accent-cyan)]" />
          <span className="text-[var(--wrapped-text-secondary)]">GIFs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--wrapped-accent-purple)]" />
          <span className="text-[var(--wrapped-text-secondary)]">Static</span>
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
        className={`relative flex flex-col items-center pt-4 pb-4 px-4 sm:px-6 w-full max-w-[600px] ${
          captureMode ? "h-[600px]" : "h-auto min-h-[500px] sm:min-h-[600px]"
        } overflow-hidden`}
      >
        {/* Consistent header */}
        <SlideHeader year={year} />

        {/* Title */}
        {captureMode ? (
          <div className="mb-4">
            <h2 className="wrapped-headline text-white mb-1">The Deep Dive</h2>
            <p className="wrapped-body">Insights from {workspaceName}'s emoji journey</p>
          </div>
        ) : (
          <BlurFade delay={0.1} className="mb-4">
            <h2 className="wrapped-headline mb-1">
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
            <p className="wrapped-body">Insights from {workspaceName}'s emoji journey</p>
          </BlurFade>
        )}

        {/* Main content row */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 w-full max-w-xs sm:max-w-md mb-4">
          {/* GIF vs Static Donut */}
          <motion.div
            initial={captureMode ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-shrink-0 rounded-xl wrapped-glass p-4"
          >
            <DonutChart percentage={overview.gifPercentage} captureMode={captureMode} />
          </motion.div>

          {/* Fun facts with AnimatedList */}
          <div className="flex-1 space-y-2 w-full">
            {captureMode ? (
              // Static version for capture
              funFacts.slice(0, 4).map((fact, i) => (
                <FunFact key={i} {...fact} />
              ))
            ) : (
              // Animated version for live experience
              <AnimatedList delay={500} className="gap-2">
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
            className="px-5 py-3 rounded-xl wrapped-glass border border-[var(--wrapped-accent-purple)]/30 flex items-center gap-3"
          >
            <MessageSquare className="w-5 h-5 text-[var(--wrapped-accent-purple)]" />
            <span className="text-[var(--wrapped-text-secondary)]">Favorite word: </span>
            <span className="text-white font-bold text-lg">"{funStats.mostCommonWord.word}"</span>
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
            className="mt-4 flex flex-col items-center gap-3"
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
            className="mt-4 flex flex-wrap justify-center gap-2 max-w-[280px] sm:max-w-[360px]"
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

        {/* Branding */}
        <SlideBranding />
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
