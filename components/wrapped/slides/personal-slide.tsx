"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { WrappedStats, PersonalWrappedStats } from "@/lib/services/wrapped-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { EmojiHero } from "../emoji-hero"
import { NumberTicker } from "@/components/ui/number-ticker"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import {
  Flame, Calendar, Film, Zap, Trophy, Medal, Award,
  Palette, Sparkles, Moon, Sunrise, Music, Star, Lightbulb,
  Crown, Rocket, Shield, TrendingUp
} from "lucide-react"
import {
  detectEdgeCases,
  getEarnedBadges,
  EdgeCaseFlags,
  BadgeInfo
} from "@/lib/utils/wrapped-edge-cases"

interface PersonalSlideProps {
  stats: WrappedStats
  personalStats: PersonalWrappedStats
  workspaceName: string
  year: number
  captureMode?: boolean
}

// Icon mapping for badges
const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy, Medal, Award, Palette, Sparkles, Moon, Sunrise, Music,
  Star, Lightbulb, Crown, Rocket, Shield, TrendingUp, Flame, Zap
}

// Compact badge component for display
function BadgeDisplay({ badge, delay, captureMode }: { badge: BadgeInfo; delay: number; captureMode: boolean }) {
  const IconComponent = BADGE_ICONS[badge.icon] || Star

  return (
    <motion.div
      initial={captureMode ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: captureMode ? 0 : delay }}
      className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10"
      title={badge.description}
    >
      <IconComponent className={`w-3 h-3 sm:w-4 sm:h-4 ${badge.color}`} />
      <span className="text-[10px] sm:text-xs text-white/80 whitespace-nowrap">{badge.label}</span>
    </motion.div>
  )
}

// Badges row component
function BadgesRow({ badges, captureMode }: { badges: BadgeInfo[]; captureMode: boolean }) {
  if (badges.length === 0) return null

  // Show max 4 badges to prevent overflow
  const displayBadges = badges.slice(0, 4)

  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
      {displayBadges.map((badge, i) => (
        <BadgeDisplay
          key={badge.type}
          badge={badge}
          delay={0.9 + i * 0.1}
          captureMode={captureMode}
        />
      ))}
      {badges.length > 4 && (
        <motion.div
          initial={captureMode ? false : { opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: captureMode ? 0 : 1.3 }}
          className="text-xs text-white/50"
        >
          +{badges.length - 4} more
        </motion.div>
      )}
    </div>
  )
}

// Mini bar chart for monthly activity (Bento Version - Full Width)
function BentoActivityChart({
  monthlyBreakdown,
  captureMode,
}: {
  monthlyBreakdown: PersonalWrappedStats["monthlyBreakdown"]
  captureMode: boolean
}) {
  const maxCount = Math.max(...monthlyBreakdown.map((m) => m.count), 1)
  const shouldReduceAnimations = useShouldReduceAnimations()

  return (
    <div className="w-full h-full flex flex-col justify-end">
      <h3 className="wrapped-label text-sm sm:text-base mb-2 sm:mb-3">Monthly Activity</h3>
      <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-16 sm:h-20 md:h-24">
        {monthlyBreakdown.map((month, i) => {
          const heightPercent = Math.max((month.count / maxCount) * 100, 10)
          return (
            <motion.div
              key={month.month}
              className="flex-1 h-full flex flex-col justify-end group relative"
              initial={captureMode || shouldReduceAnimations ? false : { opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ delay: captureMode ? 0 : 1.2 + i * 0.05, duration: 0.4 }}
            >
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none">
                {month.month}: {month.count}
              </div>
              <motion.div
                className="w-full rounded-t-sm bg-linear-to-t from-(--wrapped-accent-cyan) to-(--wrapped-accent-purple) opacity-80 group-hover:opacity-100 transition-opacity"
                style={{ height: `${heightPercent}%` }}
              />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// Rank Detail Card
function RankCard({ rank, totalCreators, captureMode, isSoloLegend }: { rank: number; totalCreators: number; captureMode: boolean; isSoloLegend?: boolean }) {
  const getRankData = () => {
    // Special case for solo creators
    if (isSoloLegend) {
      return {
        icon: <Star className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />,
        color: "from-yellow-500/30 to-amber-500/20",
        border: "border-yellow-500/50",
        label: "Solo Legend"
      }
    }
    if (rank === 1) return {
      icon: <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />,
      color: "from-yellow-500/20 to-amber-500/10",
      border: "border-yellow-500/30",
      label: `Ranked in top ${Math.max(1, Math.round((rank / totalCreators) * 100))}%`
    }
    if (rank === 2) return {
      icon: <Medal className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300" />,
      color: "from-gray-400/20 to-slate-500/10",
      border: "border-gray-400/30",
      label: `Ranked in top ${Math.max(1, Math.round((rank / totalCreators) * 100))}%`
    }
    if (rank === 3) return {
      icon: <Award className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600" />,
      color: "from-amber-600/20 to-orange-700/10",
      border: "border-amber-600/30",
      label: `Ranked in top ${Math.max(1, Math.round((rank / totalCreators) * 100))}%`
    }
    return {
      icon: <span className="text-xl sm:text-2xl font-bold">#{rank}</span>,
      color: "from-(--wrapped-accent-purple)/20 to-(--wrapped-accent-cyan)/10",
      border: "border-white/10",
      label: `Ranked in top ${Math.max(1, Math.round((rank / totalCreators) * 100))}%`
    }
  }
  const style = getRankData()

  return (
    <motion.div
      initial={captureMode ? false : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: captureMode ? 0 : 0.4 }}
      className={`relative overflow-hidden rounded-2xl wrapped-glass border ${style.border} p-4 sm:p-5 flex flex-col items-center justify-center h-full bg-linear-to-br ${style.color}`}
    >
      <div className="mb-1 sm:mb-2">{style.icon}</div>
      <div className="text-sm text-(--wrapped-text-muted) text-center leading-tight">
        {style.label}
      </div>
    </motion.div>
  )
}


export function PersonalSlide({
  stats,
  personalStats,
  workspaceName,
  year,
  captureMode = false,
}: PersonalSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const shouldReduceAnimations = useShouldReduceAnimations()

  // Hydration tracking for WKWebView compatibility
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  const shouldAnimate = hydrated && !captureMode && !shouldReduceAnimations

  // Detect edge cases and get badges
  const edgeCases = useMemo(() => detectEdgeCases(stats, personalStats), [stats, personalStats])
  const badges = useMemo(() => getEarnedBadges(stats, personalStats, edgeCases), [stats, personalStats, edgeCases])

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

  // Hero tagline - enhanced with edge case recognition
  const getTagline = () => {
    if (edgeCases.isSoloLegend) return "Solo Legend"
    if (edgeCases.isStreakDemon) return "Streak Demon"
    if (edgeCases.isMemeGod) return "Animation God"
    if (edgeCases.isPuristExtreme) return "The Purist"
    if (edgeCases.isNightOwl) return "Night Owl"
    if (rank === 1) return "Main Character Energy"
    if (rank <= 3) return "Emoji Royalty"
    if (rank <= 10) return "Top Tier Creator"
    if (comparedToAverage >= 100) return "Carrying the Team"
    if (edgeCases.isNewJoiner) return "Rising Star"
    return "The Creative Spark"
  }

  // Get special border class for top 3
  const getHeroCardClass = () => {
    if (rank === 1) return "ring-2 ring-yellow-400/50"
    if (rank === 2) return "ring-2 ring-gray-300/50"
    if (rank === 3) return "ring-2 ring-amber-600/50"
    return ""
  }

  // Get GIF tile content based on edge cases
  const getGifTileContent = () => {
    if (edgeCases.isStaticPurist || edgeCases.isPuristExtreme) {
      return {
        icon: <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 mb-1" />,
        value: "100%",
        label: "Static Art",
        gradient: "from-slate-500/10 to-transparent"
      }
    }
    if (edgeCases.isAllAnimation || edgeCases.isMemeGod) {
      return {
        icon: <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 mb-1" />,
        value: "100%",
        label: "Animated",
        gradient: "from-purple-500/10 to-transparent"
      }
    }
    return {
      icon: <Film className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 mb-1" />,
      value: `${gifPercentage}%`,
      label: "Motion Emojis",
      gradient: "from-cyan-500/10 to-transparent"
    }
  }

  // Get streak tile content based on edge cases
  const getStreakTileContent = () => {
    if (edgeCases.hasNoStreak) {
      return {
        icon: <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300 mb-1" />,
        value: "Spontaneous",
        label: "Creator Style",
        gradient: "from-yellow-500/10 to-transparent"
      }
    }
    if (edgeCases.isStreakDemon) {
      return {
        icon: <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 mb-1 animate-pulse" />,
        value: `${personalStreak.days} Days`,
        label: "Epic Streak 🔥",
        gradient: "from-orange-500/20 to-red-500/10"
      }
    }
    return {
      icon: <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 mb-1" />,
      value: `${personalStreak.days} Days`,
      label: "Longest Streak",
      gradient: "from-orange-500/10 to-transparent"
    }
  }

  const gifTile = getGifTileContent()
  const streakTile = getStreakTileContent()

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Noise texture */}
      <div className="wrapped-noise absolute inset-0 pointer-events-none" />

      {/* Main Container */}
      <div
        ref={slideRef}
        className={`relative w-full max-w-[800px] ${captureMode ? "h-full overflow-hidden p-6" : "h-full max-h-full overflow-y-auto scrollbar-hide"}`}
      >
        <div className={`flex flex-col w-full ${captureMode ? "h-full" : "min-h-full p-4 sm:p-6"}`}>
          {/* Header - Fixed Height */}
          <div className="shrink-0 mb-4 sm:mb-6">
            <SlideHeader year={year} />
          </div>

          {/* Bento Grid Layout - min-h ensures cells don't crush on mobile */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 grid-rows-[auto_minmax(80px,1fr)_minmax(80px,1fr)_auto] sm:grid-rows-4 gap-3 sm:gap-5 w-full h-full min-h-0">

            {/* 1. HERO CARD (Identity) - Spans 2x2 - Premium Glass Effect */}
            <motion.div
              className={`col-span-2 row-span-1 sm:row-span-2 rounded-3xl wrapped-glass-premium p-5 sm:p-6 md:p-8 flex flex-col items-start justify-between relative overflow-hidden group ${getHeroCardClass()}`}
              initial={captureMode ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: captureMode ? 0 : 0.1, duration: 0.5 }}
            >
              {/* Background glow based on top emoji */}
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-(--wrapped-accent-purple)/40 blur-3xl rounded-full pointer-events-none" />
              <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-(--wrapped-accent-cyan)/20 blur-3xl rounded-full pointer-events-none" />

              <div className="relative z-10 text-left">
                <BlurFade delay={0.2} shouldAnimate={shouldAnimate}>
                  <p className="wrapped-label text-xs mb-1">Your Year As</p>
                  <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-1">{displayName}</h2>
                  <GradientText className="text-sm font-medium opacity-90" colors={["#a855f7", "#22d3ee", "#a855f7"]}>
                    {getTagline()}
                  </GradientText>
                </BlurFade>
              </div>

              <div className="relative z-10 w-full flex justify-end mt-2 sm:mt-0">
                {topEmojis[0] && (
                  <div className="relative">
                    <EmojiHero
                      emoji={topEmojis[0]}
                      size="md"
                      glow="purple"
                      animate={!captureMode}
                      captureMode={captureMode}
                    />
                    <motion.div
                      className="absolute -bottom-2 -right-2 bg-black/50 backdrop-blur-md rounded-full px-2 py-0.5 border border-white/10"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <span className="text-xs text-white/80">Top Vibe</span>
                    </motion.div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* 2. STAT TILES (Grid of 4 small items) on Desktop, 2x2 on Mobile */}

            {/* Rank Tile */}
            <div className="col-span-1 sm:col-span-1 row-span-1">
              <RankCard rank={rank} totalCreators={totalCreators} captureMode={captureMode} isSoloLegend={edgeCases.isSoloLegend} />
            </div>

            {/* Total Count Tile */}
            <motion.div
              className="col-span-1 sm:col-span-1 row-span-1 rounded-2xl wrapped-glass p-4 sm:p-5 flex flex-col justify-center items-center"
              initial={captureMode ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: captureMode ? 0 : 0.5 }}
            >
              <p className="wrapped-label text-sm mb-1">Total Created</p>
              <div className="font-mono text-2xl sm:text-3xl md:text-4xl font-black text-white">
                {captureMode ? <span>{totalEmojis}</span> : <NumberTicker value={totalEmojis} delay={0.6} />}
              </div>
              <p className="text-sm text-(--wrapped-accent-cyan)">+{percentageOfTotal}% of workspace</p>
            </motion.div>

            {/* Streak Tile */}
            <motion.div
              className={`col-span-1 sm:col-span-1 row-span-1 rounded-2xl wrapped-glass p-4 sm:p-5 flex flex-col justify-center items-center bg-linear-to-br ${streakTile.gradient}`}
              initial={captureMode ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: captureMode ? 0 : 0.6 }}
            >
              {streakTile.icon}
              <div className="font-mono text-xl sm:text-2xl md:text-3xl font-bold text-white">{streakTile.value}</div>
              <p className="text-sm text-white/60">{streakTile.label}</p>
            </motion.div>

            {/* GIF % Tile */}
            <motion.div
              className={`col-span-1 sm:col-span-1 row-span-1 rounded-2xl wrapped-glass p-4 sm:p-5 flex flex-col justify-center items-center bg-linear-to-br ${gifTile.gradient}`}
              initial={captureMode ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: captureMode ? 0 : 0.7 }}
            >
              {gifTile.icon}
              <div className="font-mono text-xl sm:text-2xl md:text-3xl font-bold text-white">{gifTile.value}</div>
              <p className="text-sm text-white/60">{gifTile.label}</p>
            </motion.div>

            {/* 3. ACTIVITY CHART - Spans Full Width Bottom Row (Col span 2 on mobile, 4 on desktop) */}
            <motion.div
              className="col-span-2 sm:col-span-4 row-span-1 rounded-3xl wrapped-glass p-4 sm:p-5 relative overflow-hidden"
              initial={captureMode ? false : { opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: captureMode ? 0 : 0.8 }}
            >
              <div className="absolute inset-0 bg-linear-to-t from-(--wrapped-accent-purple)/5 to-transparent pointer-events-none" />
              <BentoActivityChart monthlyBreakdown={monthlyBreakdown} captureMode={captureMode} />
            </motion.div>

          </div>

          {/* Badges Row - Show earned achievements */}
          {badges.length > 0 && (
            <div className="shrink-0 mt-3 sm:mt-4 w-full">
              <BadgesRow badges={badges} captureMode={captureMode} />
            </div>
          )}

          {/* Footer Branding - Fixed at bottom */}
          <div className="shrink-0 mt-4 sm:mt-6 w-full">
            <SlideBranding />
          </div>
        </div>
      </div>

    </div>
  )
}
