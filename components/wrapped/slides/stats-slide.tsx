"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { WrappedFunStats, WrappedOverviewStats, WrappedGrowthStats } from "@/lib/services/wrapped-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"

interface StatsSlideProps {
  funStats: WrappedFunStats
  overview: WrappedOverviewStats
  growth: WrappedGrowthStats
  workspaceName: string
  year: number
}

interface StatCardProps {
  icon: string
  title: string
  value: string | number
  subtitle?: string
  delay: number
  highlight?: boolean
}

function StatCard({ icon, title, value, subtitle, delay, highlight }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
      className={`rounded-xl p-4 backdrop-blur-sm ${
        highlight
          ? "bg-gradient-to-br from-pink-500/20 to-rose-500/20 border-pink-500/30"
          : "bg-white/10 border-white/20"
      } border`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-white/60 text-xs uppercase tracking-wide mb-1">{title}</p>
      <p className="text-white font-bold text-xl">{value}</p>
      {subtitle && <p className="text-white/50 text-xs mt-1">{subtitle}</p>}
    </motion.div>
  )
}

// SVG Donut Chart component for GIF vs Static visualization
function DonutChart({ percentage, delay }: { percentage: number; delay: number }) {
  const radius = 40
  const strokeWidth = 10
  const circumference = 2 * Math.PI * radius
  // GIF segment: starts at 0, fills percentage amount
  const gifDashoffset = circumference - (percentage / 100) * circumference

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
      className="flex flex-col items-center"
    >
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
            stroke="#a855f7"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ delay: delay + 0.2, duration: 1, ease: "easeOut" }}
          />
          {/* GIF (teal) segment - drawn on top, covers the GIF percentage */}
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#14b8a6"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: gifDashoffset }}
            transition={{ delay: delay + 0.4, duration: 1, ease: "easeOut" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white font-bold text-lg">{percentage}%</span>
          <span className="text-white/50 text-[10px]">GIFs</span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
          <span className="text-white/70">GIFs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span className="text-white/70">Static</span>
        </div>
      </div>
    </motion.div>
  )
}

export function StatsSlide({ funStats, overview, growth, workspaceName, year }: StatsSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  // Smaller set of stats for cleaner layout with donut chart
  const stats = [
    {
      icon: "🔥",
      title: "Longest Streak",
      value: `${funStats.longestStreak.days} days`,
      subtitle: "consecutive days",
      highlight: funStats.longestStreak.days >= 7,
    },
    {
      icon: "📊",
      title: "Weekly Average",
      value: overview.averagePerWeek,
      subtitle: "emojis per week",
    },
    {
      icon: "🌙",
      title: "Late Night",
      value: funStats.lateNightCount,
      subtitle: "after midnight",
      highlight: funStats.lateNightCount >= 20,
    },
    {
      icon: growth.growthTrend === "up" ? "📈" : growth.growthTrend === "down" ? "📉" : "➡️",
      title: "YoY Growth",
      value: growth.hasYoYData
        ? `${growth.growthPercentage > 0 ? "+" : ""}${growth.growthPercentage}%`
        : "First Year!",
      subtitle: growth.hasYoYData ? "vs last year" : undefined,
      highlight: growth.growthTrend === "up" && growth.growthPercentage > 50,
    },
  ]

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center px-4">
      {/* Capturable content - fixed square size for consistent share images */}
      <div ref={slideRef} className="relative flex flex-col items-center justify-center p-6 w-[600px] h-[600px] overflow-hidden">
        {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Fun Facts</h2>
        <p className="text-white/60">The quirky side of your emojis</p>
      </motion.div>

      {/* Main content: Donut chart + stats grid */}
      <div className="flex flex-col md:flex-row items-center gap-6 w-full max-w-2xl">
        {/* GIF vs Static Donut Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-shrink-0 rounded-xl bg-white/5 border border-white/10 p-4"
        >
          <h3 className="text-xs text-white/50 mb-2 font-medium text-center">Emoji Types</h3>
          <DonutChart percentage={overview.gifPercentage} delay={0.3} />
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 flex-1">
          {stats.map((stat, i) => (
            <StatCard
              key={stat.title}
              {...stat}
              delay={0.4 + i * 0.1}
            />
          ))}
        </div>
      </div>

      {/* Most common word */}
      {funStats.mostCommonWord && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-6 px-4 py-3 rounded-xl bg-white/10 border border-white/20"
        >
          <span className="text-white/60">Most popular word: </span>
          <span className="text-white font-bold text-lg">"{funStats.mostCommonWord.word}"</span>
          <span className="text-white/50 ml-2">({funStats.mostCommonWord.count}x)</span>
        </motion.div>
      )}

      {/* Longest name */}
      {funStats.longestName && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-4 flex items-center gap-3"
        >
          <img
            src={proxyImageUrl(funStats.longestName.emoji.url)}
            alt={funStats.longestName.emoji.name}
            className="w-8 h-8 rounded"
          />
          <span className="text-white/60 text-sm">
            Longest name: <span className="text-white font-medium">:{funStats.longestName.emoji.name}:</span>
            <span className="text-white/40 ml-1">({funStats.longestName.length} chars)</span>
          </span>
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
