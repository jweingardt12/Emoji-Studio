"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { PersonalWrappedStats } from "@/lib/services/wrapped-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { NumberTicker } from "@/components/ui/number-ticker"
import { GridBackground } from "@/components/ui/grid-background"
import { Meteors } from "@/components/ui/meteors"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"

interface PersonalSlideProps {
  personalStats: PersonalWrappedStats
  workspaceName: string
  year: number
  captureMode?: boolean
}

// Rank badge component
function RankBadge({ rank, totalCreators, captureMode }: { rank: number; totalCreators: number; captureMode: boolean }) {
  const getMedalStyle = () => {
    if (rank === 1) return { emoji: "🥇", bg: "from-yellow-400 to-amber-600", label: "Legend" }
    if (rank === 2) return { emoji: "🥈", bg: "from-gray-300 to-gray-500", label: "Elite" }
    if (rank === 3) return { emoji: "🥉", bg: "from-amber-600 to-orange-700", label: "Star" }
    if (rank <= 5) return { emoji: null, bg: "from-indigo-500 to-purple-600", label: "Rising Star" }
    if (rank <= 10) return { emoji: null, bg: "from-blue-500 to-cyan-500", label: "Contributor" }
    return { emoji: null, bg: "from-slate-500 to-slate-600", label: "Quality over quantity" }
  }

  const medal = getMedalStyle()

  return (
    <motion.div
      initial={captureMode ? false : { scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: captureMode ? 0 : 0.3, type: "spring", stiffness: 200 }}
      className="text-center"
    >
      <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${medal.bg} flex items-center justify-center shadow-lg mx-auto`}>
        {medal.emoji ? (
          <span className="text-5xl">{medal.emoji}</span>
        ) : (
          <div className="text-center">
            <span className="text-3xl font-black text-white">#{rank}</span>
          </div>
        )}
      </div>
      <motion.p
        initial={captureMode ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: captureMode ? 0 : 0.5 }}
        className="text-white/70 mt-2 text-sm"
      >
        {medal.label} • #{rank} of {totalCreators}
      </motion.p>
    </motion.div>
  )
}

// Mini bar chart for monthly activity
function MiniBarChart({ monthlyBreakdown, captureMode }: { monthlyBreakdown: PersonalWrappedStats["monthlyBreakdown"]; captureMode: boolean }) {
  const maxCount = Math.max(...monthlyBreakdown.map((m) => m.count), 1)

  return (
    <motion.div
      initial={captureMode ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: captureMode ? 0 : 1 }}
      className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
    >
      <h3 className="text-xs text-white/50 mb-2 font-medium">Your Activity</h3>
      <div className="flex items-end justify-between gap-1 h-12">
        {monthlyBreakdown.map((month, i) => {
          const heightPercent = Math.max((month.count / maxCount) * 100, 8)
          return (
            <motion.div
              key={month.month}
              className="flex-1 h-full flex flex-col justify-end"
              initial={captureMode ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: captureMode ? 0 : 1.1 + i * 0.03 }}
            >
              <motion.div
                className="w-full rounded-t bg-gradient-to-t from-cyan-500 to-cyan-400"
                initial={captureMode ? { height: `${heightPercent}%` } : { height: 0 }}
                animate={{ height: `${heightPercent}%` }}
                transition={{ delay: captureMode ? 0 : 1.1 + i * 0.03, duration: 0.4 }}
              />
            </motion.div>
          )
        })}
      </div>
      <div className="flex justify-between text-[8px] text-white/30 mt-1">
        {monthlyBreakdown.map((month) => (
          <span key={month.month} className="flex-1 text-center">
            {month.month.slice(0, 1)}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

export function PersonalSlide({
  personalStats,
  workspaceName,
  year,
  captureMode = false
}: PersonalSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const {
    displayName,
    totalEmojis,
    rank,
    totalCreators,
    percentageOfTotal,
    topEmojis,
    gifPercentage,
    favoriteDayOfWeek,
    personalStreak,
    monthlyBreakdown,
    comparedToAverage,
  } = personalStats

  // Playful tagline based on performance
  const getTagline = () => {
    if (rank === 1) return "Main character energy 👑"
    if (rank <= 3) return "Top tier creator 🏆"
    if (rank <= 5) return "Rising star alert ⭐"
    if (comparedToAverage >= 200) return "Above and beyond 🚀"
    if (comparedToAverage >= 100) return "Pulling your weight 💪"
    return "Every emoji counts 🎨"
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center px-4">
      {/* Background effects */}
      <GridBackground
        gridSize={30}
        gridColor="rgba(255, 255, 255, 0.04)"
        showGlow={true}
        glowColor="rgba(147, 51, 234, 0.2)"
        glowPosition="center"
      />
      {!captureMode && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Meteors number={8} className="opacity-60" />
        </div>
      )}

      {/* Capturable content - fixed square size for share images, flexible for live view */}
      <div ref={slideRef} className={`relative flex flex-col items-center pt-4 pb-4 px-4 w-[600px] ${captureMode ? 'h-[600px]' : 'h-auto min-h-[600px]'} overflow-hidden`}>
        {/* Consistent header for share images */}
        <SlideHeader year={year} />

        {/* Title with GradientText */}
        {captureMode ? (
          <div className="mb-1">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Your Year</h2>
            <p className="text-white/60 text-sm">{displayName}</p>
          </div>
        ) : (
          <BlurFade delay={0.1} className="mb-1">
            <h2 className="text-xl md:text-2xl font-bold mb-1">
              <GradientText colors={["#06b6d4", "#8b5cf6", "#06b6d4"]} animationSpeed={6}>
                Your Year
              </GradientText>
            </h2>
            <p className="text-white/60 text-sm">{displayName}</p>
          </BlurFade>
        )}

        {/* Rank badge */}
        <RankBadge rank={rank} totalCreators={totalCreators} captureMode={captureMode} />

        {/* Big number - total emojis */}
        <motion.div
          initial={captureMode ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: captureMode ? 0 : 0.6, type: "spring", stiffness: 200 }}
          className="my-2"
        >
          <div className="text-5xl md:text-6xl font-black text-white">
            {captureMode ? (
              <span>{totalEmojis}</span>
            ) : (
              <NumberTicker
                value={totalEmojis}
                delay={0.8}
                className="text-5xl md:text-6xl font-black text-white"
              />
            )}
          </div>
          <p className="text-white/60 text-sm">emojis • {percentageOfTotal}% of workspace</p>
          <p className="text-cyan-400 text-sm font-medium mt-1">{getTagline()}</p>
        </motion.div>

        {/* Top emojis row - LARGER and more emojis */}
        {topEmojis.length > 0 && (
          <motion.div
            initial={captureMode ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: captureMode ? 0 : 0.9 }}
            className="flex flex-wrap justify-center gap-2 mb-2 max-w-[350px]"
          >
            {topEmojis.slice(0, 8).map((emoji, i) => (
              <motion.img
                key={emoji.name}
                src={proxyImageUrl(emoji.url)}
                alt={emoji.name}
                className="w-12 h-12 md:w-14 md:h-14 rounded-lg shadow-lg object-contain"
                initial={captureMode ? false : { scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: captureMode ? 0 : 1 + i * 0.08, type: "spring" }}
              />
            ))}
          </motion.div>
        )}

        {/* Mini monthly chart */}
        <div className="w-full max-w-xs mb-2">
          <MiniBarChart monthlyBreakdown={monthlyBreakdown} captureMode={captureMode} />
        </div>

        {/* Stat pills */}
        <motion.div
          initial={captureMode ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: captureMode ? 0 : 1.3 }}
          className="flex flex-wrap justify-center gap-2"
        >
          {personalStreak.days > 1 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 border border-white/20">
              <span className="text-lg">🔥</span>
              <span className="text-white text-sm font-medium">{personalStreak.days} day streak</span>
            </div>
          )}
          {favoriteDayOfWeek && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 border border-white/20">
              <span className="text-lg">📅</span>
              <span className="text-white text-sm font-medium">{favoriteDayOfWeek.day}s</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 border border-white/20">
            <span className="text-lg">🎬</span>
            <span className="text-white text-sm font-medium">{gifPercentage}% GIFs</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 border border-white/20">
            <span className="text-lg">{comparedToAverage >= 100 ? "⚡" : "📊"}</span>
            <span className="text-white text-sm font-medium">{comparedToAverage}% vs avg</span>
          </div>
        </motion.div>

        {/* Branding */}
        <SlideBranding />
      </div>

      {/* Share button - outside capturable area */}
      <SlideShareButton
        slideRef={slideRef}
        slideName="personal"
        workspaceName={workspaceName}
        year={year}
        backgroundColor="#164e63"
      />
    </div>
  )
}
