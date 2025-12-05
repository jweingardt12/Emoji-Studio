"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { PersonalWrappedStats } from "@/lib/services/wrapped-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"

interface PersonalSlideProps {
  personalStats: PersonalWrappedStats
  workspaceName: string
  year: number
}

// Rank badge component
function RankBadge({ rank, totalCreators }: { rank: number; totalCreators: number }) {
  const getMedal = () => {
    if (rank === 1) return { emoji: "🥇", color: "from-yellow-400 to-amber-600" }
    if (rank === 2) return { emoji: "🥈", color: "from-gray-300 to-gray-500" }
    if (rank === 3) return { emoji: "🥉", color: "from-amber-600 to-orange-700" }
    return { emoji: null, color: "from-indigo-500 to-purple-600" }
  }

  const medal = getMedal()

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
      className={`w-20 h-20 rounded-full bg-gradient-to-br ${medal.color} flex items-center justify-center shadow-lg`}
    >
      {medal.emoji ? (
        <span className="text-4xl">{medal.emoji}</span>
      ) : (
        <div className="text-center">
          <span className="text-2xl font-black text-white">#{rank}</span>
        </div>
      )}
    </motion.div>
  )
}

// Mini bar chart for monthly activity
function MiniBarChart({ monthlyBreakdown, delay }: { monthlyBreakdown: PersonalWrappedStats["monthlyBreakdown"]; delay: number }) {
  const maxCount = Math.max(...monthlyBreakdown.map((m) => m.count), 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
    >
      <h3 className="text-xs text-white/50 mb-2 font-medium">Your Monthly Activity</h3>
      <div className="flex items-end justify-between gap-1 h-12">
        {monthlyBreakdown.map((month, i) => {
          const heightPercent = Math.max((month.count / maxCount) * 100, 8)
          return (
            <motion.div
              key={month.month}
              className="flex-1 h-full flex flex-col justify-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.1 + i * 0.03 }}
            >
              <motion.div
                className="w-full rounded-t bg-gradient-to-t from-cyan-500 to-cyan-400"
                initial={{ height: 0 }}
                animate={{ height: `${heightPercent}%` }}
                transition={{ delay: delay + 0.1 + i * 0.03, duration: 0.4 }}
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

// Stat pill component
function StatPill({ icon, label, value, delay }: { icon: string; label: string; value: string | number; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
      className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 border border-white/20"
    >
      <span className="text-lg">{icon}</span>
      <div className="text-left">
        <p className="text-white/50 text-[10px] leading-tight">{label}</p>
        <p className="text-white font-semibold text-sm leading-tight">{value}</p>
      </div>
    </motion.div>
  )
}

export function PersonalSlide({ personalStats, workspaceName, year }: PersonalSlideProps) {
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

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center px-4">
      {/* Capturable content - fixed square size for consistent share images */}
      <div ref={slideRef} className="relative flex flex-col items-center justify-center p-6 w-[600px] h-[600px] overflow-hidden">
        {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">Your Year in Emojis</h2>
        <p className="text-white/60 text-lg">{displayName}</p>
      </motion.div>

      {/* Rank badge */}
      <RankBadge rank={rank} totalCreators={totalCreators} />

      {/* Rank subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-white/70 mt-3 mb-4"
      >
        #{rank} of {totalCreators} creators
      </motion.p>

      {/* Big number - total emojis */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
        className="mb-4"
      >
        <p className="text-5xl md:text-6xl font-black text-white">{totalEmojis}</p>
        <p className="text-white/60 text-sm">emojis created ({percentageOfTotal}% of workspace)</p>
      </motion.div>

      {/* Top emojis row */}
      {topEmojis.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center gap-2 mb-4"
        >
          {topEmojis.map((emoji, i) => (
            <motion.img
              key={emoji.name}
              src={proxyImageUrl(emoji.url)}
              alt={emoji.name}
              className="w-10 h-10 md:w-12 md:h-12 rounded-lg shadow-lg"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.9 + i * 0.1, type: "spring" }}
            />
          ))}
        </motion.div>
      )}

      {/* Mini monthly chart */}
      <div className="w-full max-w-xs mb-4">
        <MiniBarChart monthlyBreakdown={monthlyBreakdown} delay={1.1} />
      </div>

      {/* Stat pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {personalStreak.days > 1 && (
          <StatPill
            icon="🔥"
            label="Best streak"
            value={`${personalStreak.days} days`}
            delay={1.3}
          />
        )}
        {favoriteDayOfWeek && (
          <StatPill
            icon="📅"
            label="Favorite day"
            value={favoriteDayOfWeek.day}
            delay={1.4}
          />
        )}
        <StatPill
          icon="🎬"
          label="GIF rate"
          value={`${gifPercentage}%`}
          delay={1.5}
        />
          <StatPill
            icon={comparedToAverage >= 100 ? "⚡" : "📊"}
            label="vs avg"
            value={`${comparedToAverage}%`}
            delay={1.6}
          />
        </div>

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
