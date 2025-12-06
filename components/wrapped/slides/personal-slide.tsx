"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { PersonalWrappedStats } from "@/lib/services/wrapped-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { EmojiHero } from "../emoji-hero"
import { EmojiOrbit } from "../emoji-orbit"
import { StatPill } from "../stat-card"
import { NumberTicker } from "@/components/ui/number-ticker"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import { Flame, Calendar, Film, Zap } from "lucide-react"

interface PersonalSlideProps {
  personalStats: PersonalWrappedStats
  workspaceName: string
  year: number
  captureMode?: boolean
}

// Mini bar chart for monthly activity
function MiniBarChart({
  monthlyBreakdown,
  captureMode,
}: {
  monthlyBreakdown: PersonalWrappedStats["monthlyBreakdown"]
  captureMode: boolean
}) {
  const maxCount = Math.max(...monthlyBreakdown.map((m) => m.count), 1)
  const shouldReduceAnimations = useShouldReduceAnimations()

  return (
    <motion.div
      initial={captureMode ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: captureMode ? 0 : 1 }}
      className="w-full rounded-xl wrapped-glass p-3"
    >
      <h3 className="wrapped-label text-xs mb-2">Your Activity</h3>
      <div className="flex items-end justify-between gap-1 h-12">
        {monthlyBreakdown.map((month, i) => {
          const heightPercent = Math.max((month.count / maxCount) * 100, 8)
          return (
            <motion.div
              key={month.month}
              className="flex-1 h-full flex flex-col justify-end"
              initial={captureMode || shouldReduceAnimations ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: captureMode ? 0 : 1.1 + i * 0.03 }}
            >
              <motion.div
                className="w-full rounded-t bg-gradient-to-t from-[var(--wrapped-accent-cyan)] to-[var(--wrapped-accent-purple)]"
                initial={captureMode ? { height: `${heightPercent}%` } : { height: 0 }}
                animate={{ height: `${heightPercent}%` }}
                transition={{ delay: captureMode ? 0 : 1.1 + i * 0.03, duration: 0.4 }}
              />
            </motion.div>
          )
        })}
      </div>
      <div className="flex justify-between text-[8px] text-[var(--wrapped-text-muted)] mt-1">
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
  captureMode = false,
}: PersonalSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const shouldReduceAnimations = useShouldReduceAnimations()
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
    if (rank === 1) return "Main character energy"
    if (rank <= 3) return "Top tier creator"
    if (rank <= 5) return "Rising star"
    if (comparedToAverage >= 200) return "Above and beyond"
    if (comparedToAverage >= 100) return "Carrying the team"
    return "Every emoji counts"
  }

  // Rank badge styling
  const getRankStyle = () => {
    if (rank === 1) return { emoji: "🥇", bg: "from-yellow-400/30 to-amber-600/20" }
    if (rank === 2) return { emoji: "🥈", bg: "from-gray-300/30 to-gray-500/20" }
    if (rank === 3) return { emoji: "🥉", bg: "from-amber-600/30 to-orange-700/20" }
    return { emoji: null, bg: "from-[var(--wrapped-accent-purple)]/30 to-[var(--wrapped-accent-cyan)]/20" }
  }

  const rankStyle = getRankStyle()

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
          <div className="mb-2">
            <h2 className="wrapped-headline text-white mb-1">Your Year</h2>
            <p className="wrapped-label">{displayName}</p>
          </div>
        ) : (
          <BlurFade delay={0.1} className="mb-2">
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
                Your Year
              </GradientText>
            </h2>
            <p className="wrapped-label">{displayName}</p>
          </BlurFade>
        )}

        {/* Emoji orbit with rank badge center */}
        <div className="relative my-4">
          {topEmojis.length > 1 ? (
            <EmojiOrbit
              emojis={topEmojis.slice(1, 11)}
              size="md"
              emojiSize="sm"
              orbitDuration={35}
              captureMode={captureMode}
              centerContent={
                <motion.div
                  className={`w-20 h-20 rounded-full bg-gradient-to-br ${rankStyle.bg} flex items-center justify-center border border-white/20`}
                  initial={captureMode ? false : { scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                >
                  {rankStyle.emoji ? (
                    <span className="text-4xl">{rankStyle.emoji}</span>
                  ) : (
                    <span className="text-2xl font-black text-white">#{rank}</span>
                  )}
                </motion.div>
              }
            />
          ) : (
            <motion.div
              className={`w-24 h-24 rounded-full bg-gradient-to-br ${rankStyle.bg} flex items-center justify-center border border-white/20`}
              initial={captureMode ? false : { scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            >
              {rankStyle.emoji ? (
                <span className="text-5xl">{rankStyle.emoji}</span>
              ) : (
                <span className="text-3xl font-black text-white">#{rank}</span>
              )}
            </motion.div>
          )}
        </div>

        {/* Rank label */}
        <motion.p
          initial={captureMode ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: captureMode ? 0 : 0.5 }}
          className="wrapped-label text-xs mb-2"
        >
          #{rank} of {totalCreators} creators
        </motion.p>

        {/* Big number - total emojis */}
        <motion.div
          initial={captureMode ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: captureMode ? 0 : 0.6, type: "spring", stiffness: 200 }}
          className="mb-2"
        >
          <div className="font-mono text-5xl sm:text-6xl font-black text-white">
            {captureMode ? (
              <span>{totalEmojis}</span>
            ) : (
              <NumberTicker
                value={totalEmojis}
                delay={0.8}
                className="font-mono text-5xl sm:text-6xl font-black text-white"
              />
            )}
          </div>
          <p className="wrapped-body text-sm">
            emojis • {percentageOfTotal}% of workspace
          </p>
          <p className="text-[var(--wrapped-accent-cyan)] text-sm font-medium mt-1">
            {getTagline()}
          </p>
        </motion.div>

        {/* Featured emoji hero */}
        {topEmojis[0] && (
          <motion.div
            initial={captureMode ? false : { opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: captureMode ? 0 : 0.9 }}
            className="mb-3"
          >
            <EmojiHero
              emoji={topEmojis[0]}
              size="sm"
              glow="cyan"
              animate={!captureMode}
              captureMode={captureMode}
            />
          </motion.div>
        )}

        {/* Mini monthly chart */}
        <div className="w-full max-w-xs mb-3">
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
            <StatPill
              value={personalStreak.days}
              label="day streak"
              icon={<Flame className="w-4 h-4 text-orange-400" />}
            />
          )}
          {favoriteDayOfWeek && (
            <StatPill
              value={favoriteDayOfWeek.day}
              label="peak day"
              icon={<Calendar className="w-4 h-4 text-purple-400" />}
            />
          )}
          <StatPill
            value={`${gifPercentage}%`}
            label="GIFs"
            icon={<Film className="w-4 h-4 text-cyan-400" />}
          />
          <StatPill
            value={`${comparedToAverage}%`}
            label="vs avg"
            icon={<Zap className="w-4 h-4 text-yellow-400" />}
          />
        </motion.div>

        {/* Branding */}
        <SlideBranding />
      </div>

      {/* Share button */}
      <SlideShareButton
        slideRef={slideRef}
        slideName="personal"
        workspaceName={workspaceName}
        year={year}
        backgroundColor="var(--wrapped-bg-start)"
      />
    </div>
  )
}
