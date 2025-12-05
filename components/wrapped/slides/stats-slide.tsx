"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { WrappedFunStats, WrappedOverviewStats, WrappedGrowthStats } from "@/lib/services/wrapped-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { AnimatedList } from "@/components/ui/animated-list"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Emoji } from "@/lib/services/emoji-service"
import { DotPattern } from "@/components/ui/dot-pattern"
import { ShootingStars } from "@/components/ui/shooting-stars"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"

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
  highlight?: string
}

function FunFact({ icon, text, highlight }: FunFactProps) {
  return (
    <div className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 text-left text-white/80 text-sm">
        {text}
      </div>
      {highlight && (
        <div className="text-right">
          <span className="text-white font-bold text-lg">{highlight}</span>
        </div>
      )}
    </div>
  )
}

// SVG Donut Chart component for GIF vs Static visualization
function DonutChart({ percentage, captureMode }: { percentage: number; captureMode: boolean }) {
  const radius = 35
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius
  const gifDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
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
            stroke="#a855f7"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={captureMode ? { strokeDashoffset: 0 } : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
          />
          {/* GIF (teal) segment */}
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#14b8a6"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={captureMode ? { strokeDashoffset: gifDashoffset } : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: gifDashoffset }}
            transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white font-bold text-lg">{percentage}%</span>
          <span className="text-white/50 text-[10px]">GIFs</span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex gap-3 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-teal-500" />
          <span className="text-white/60">GIFs</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-white/60">Static</span>
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

  // Get sample emojis for showcase
  const showcaseEmojis = customEmojis.slice(0, 10)

  // Build fun facts list with playful copy
  const funFacts: FunFactProps[] = []

  // Streak
  if (funStats.longestStreak.days >= 2) {
    funFacts.push({
      icon: <span className="text-xl">🔥</span>,
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
      icon: <span className="text-xl">🌙</span>,
      text: (
        <span>
          <span className="text-white font-semibold">{funStats.lateNightCount}</span> emojis made after midnight {funStats.lateNightCount >= 20 ? "(night owl!)" : ""}
        </span>
      ),
    })
  }

  // Weekly average
  funFacts.push({
    icon: <span className="text-xl">📊</span>,
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
      icon: <span className="text-xl">{isUp ? "📈" : growth.growthTrend === "down" ? "📉" : "➡️"}</span>,
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
      icon: <span className="text-xl">✨</span>,
      text: <span className="text-white font-semibold">First year on record! 🎉</span>,
    })
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center px-4">
      {/* Background effects */}
      <DotPattern
        className="absolute inset-0 opacity-15"
        dotColor="rgba(236, 72, 153, 0.5)"
        dotOpacity={0.3}
        width={22}
        height={22}
        cr={1}
      />
      {!captureMode && (
        <>
          <ShootingStars
            starColor="#ec4899"
            trailColor="#a855f7"
            minSpeed={10}
            maxSpeed={25}
            minDelay={2500}
            maxDelay={5500}
          />
        </>
      )}

      {/* Capturable content - fixed square size for share images, flexible for live view */}
      <div ref={slideRef} className={`relative flex flex-col items-center pt-4 pb-4 px-6 w-[600px] ${captureMode ? 'h-[600px]' : 'h-auto min-h-[600px]'} overflow-hidden`}>
        {/* Consistent header for share images */}
        <SlideHeader year={year} />

        {/* Title with GradientText */}
        {captureMode ? (
          <div className="mb-3">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">The Tea</h2>
            <p className="text-white/60 text-sm">on {workspaceName}'s emoji game</p>
          </div>
        ) : (
          <BlurFade delay={0.1} className="mb-3">
            <h2 className="text-2xl md:text-3xl font-bold mb-1">
              <GradientText colors={["#ec4899", "#f472b6", "#a855f7", "#ec4899"]} animationSpeed={6}>
                The Tea
              </GradientText>
            </h2>
            <p className="text-white/60 text-sm">on {workspaceName}'s emoji game</p>
          </BlurFade>
        )}

        {/* Main content row */}
        <div className="flex items-start gap-6 w-full max-w-lg mb-4">
          {/* GIF vs Static Donut */}
          <motion.div
            initial={captureMode ? false : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-shrink-0 rounded-xl bg-white/5 border border-white/10 p-4"
          >
            <DonutChart percentage={overview.gifPercentage} captureMode={captureMode} />
          </motion.div>

          {/* Fun facts with AnimatedList */}
          <div className="flex-1 space-y-2">
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
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/30"
          >
            <span className="text-white/70">Favorite word: </span>
            <span className="text-white font-bold text-xl">"{funStats.mostCommonWord.word}"</span>
            <span className="text-white/50 ml-2">
              ({captureMode ? funStats.mostCommonWord.count : (
                <NumberTicker
                  value={funStats.mostCommonWord.count}
                  delay={2.7}
                  className="text-white/50"
                />
              )}x)
            </span>
          </motion.div>
        )}

        {/* Longest name - LARGER emoji */}
        {funStats.longestName && (
          <motion.div
            initial={captureMode ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: captureMode ? 0 : 3 }}
            className="mt-3 flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 max-w-md"
          >
            <img
              src={proxyImageUrl(funStats.longestName.emoji.url)}
              alt={funStats.longestName.emoji.name}
              className="w-12 h-12 rounded-lg flex-shrink-0 object-contain"
            />
            <div className="text-left min-w-0">
              <p className="text-white/60 text-xs mb-1">Longest name ({funStats.longestName.length} chars)</p>
              <p className="text-white font-medium text-sm break-all">:{funStats.longestName.emoji.name}:</p>
            </div>
          </motion.div>
        )}

        {/* Emoji showcase - PROMINENT */}
        {showcaseEmojis.length > 0 && (
          <motion.div
            initial={captureMode ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: captureMode ? 0 : 3.3 }}
            className="mt-4 flex flex-wrap justify-center gap-2 max-w-[400px]"
          >
            {showcaseEmojis.map((emoji, i) => (
              <motion.img
                key={emoji.url}
                src={proxyImageUrl(emoji.url)}
                alt={emoji.name}
                className="w-11 h-11 md:w-12 md:h-12 object-contain rounded-lg shadow-md"
                initial={captureMode ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: captureMode ? 0 : 3.4 + i * 0.05 }}
              />
            ))}
          </motion.div>
        )}

        {/* Branding */}
        <SlideBranding />
      </div>

      {/* Share button - outside capturable area */}
      <SlideShareButton
        slideRef={slideRef}
        slideName="stats"
        workspaceName={workspaceName}
        year={year}
        backgroundColor="#831843"
      />
    </div>
  )
}
