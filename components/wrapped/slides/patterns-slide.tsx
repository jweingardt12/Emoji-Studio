"use client"

import { useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { WrappedStats, PersonalWrappedStats, HourlyDistributionBucket } from "@/lib/services/wrapped-service"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import { Moon, CalendarDays, Clock } from "lucide-react"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts"

interface PatternsSlideProps {
  stats: WrappedStats
  personalStats?: PersonalWrappedStats | null
  workspaceName: string
  year: number
  captureMode?: boolean
}

export function PatternsSlide({
  stats,
  personalStats,
  workspaceName,
  year,
  captureMode = false,
}: PatternsSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const shouldReduceAnimations = useShouldReduceAnimations()
  const [isClient, setIsClient] = useState(false)

  // Avoid SSR issues with Recharts
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Hydration-safe animation flag for WKWebView compatibility
  const shouldAnimate = isClient && !captureMode && !shouldReduceAnimations

  // Use personal stats if available, otherwise global stats
  const dataSource = personalStats || stats

  // Prepare radar chart data
  const radarData = dataSource.hourlyDistribution.map((bucket: HourlyDistributionBucket) => ({
    label: bucket.label,
    count: bucket.count,
    fullMark: Math.max(...dataSource.hourlyDistribution.map((b: HourlyDistributionBucket) => b.count)),
  }))

  // Top 5 words for bar chart
  const topWords = (personalStats ? personalStats.topWords : stats.funStats.topWords).slice(0, 5)
  const maxWordCount = topWords[0]?.count || 1

  // Work pattern percentages
  // For personal stats, these are top-level properties. For global, they are in funStats.
  // We need to handle the structure difference safely.

  let lateNightPercentage = 0
  let weekendPercentage = 0
  let peakHourLabel = ""

  if (personalStats) {
    // Only calculate using personal data if we confirmed it's personal stats
    // Note: totalEmojis in PersonalStats is strictly user's count
    lateNightPercentage = Math.round((personalStats.lateNightCount / personalStats.totalEmojis) * 100)
    weekendPercentage = personalStats.weekendPercentage
    peakHourLabel = personalStats.favoriteHour?.label || "Unknown"
  } else {
    // Global stats fallback
    lateNightPercentage = Math.round(
      (stats.funStats.lateNightCount / stats.overview.totalEmojis) * 100
    )
    weekendPercentage = stats.funStats.weekendPercentage
    peakHourLabel = stats.peakHourOfDay.label
  }

  // Colors for word bars
  const barColors = [
    "var(--wrapped-accent-purple)",
    "var(--wrapped-accent-cyan)",
    "var(--wrapped-accent-orange)",
    "var(--wrapped-accent-purple)",
    "var(--wrapped-accent-cyan)",
  ]

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
              <h2 className="wrapped-headline text-white mb-2 text-4xl sm:text-5xl">Your Patterns</h2>
              <p className="wrapped-body text-lg sm:text-xl">How you create emojis</p>
            </div>
          ) : (
            <BlurFade delay={0.1} shouldAnimate={shouldAnimate} className="mb-6">
              <h2 className="wrapped-headline mb-2 text-4xl sm:text-5xl md:text-6xl">
                <GradientText
                  colors={[
                    "var(--wrapped-accent-purple)",
                    "var(--wrapped-accent-cyan)",
                    "var(--wrapped-accent-orange)",
                    "var(--wrapped-accent-purple)",
                  ]}
                  animationSpeed={6}
                >
                  Your Patterns
                </GradientText>
              </h2>
              <p className="wrapped-body text-lg sm:text-xl md:text-2xl">How you create emojis</p>
            </BlurFade>
          )}

          {/* Two-column layout for charts - WIDER and RESPONSIVE */}
          <div className="flex flex-col md:flex-row gap-4 sm:gap-6 w-full max-w-3xl mb-4 sm:mb-6 flex-1 min-h-0">
            {/* Hour-of-Day Radar Chart */}
            <motion.div
              initial={captureMode ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: captureMode ? 0 : 0.3 }}
              className="flex-1 rounded-3xl wrapped-glass p-6 sm:p-8 flex flex-col"
            >
              <h3 className="wrapped-label text-base sm:text-lg mb-4 flex items-center justify-center gap-2">
                <Clock className="w-5 h-5" />
                Peak Hours
              </h3>
              <div className="flex-1 w-full min-h-[200px]">
                {isClient && (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid
                        gridType="polygon"
                        stroke="rgba(255,255,255,0.15)"
                      />
                      <PolarAngleAxis
                        dataKey="label"
                        tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500 }}
                        tickLine={false}
                      />
                      <Radar
                        dataKey="count"
                        stroke="var(--wrapped-accent-purple)"
                        fill="var(--wrapped-accent-purple)"
                        fillOpacity={0.6}
                        strokeWidth={3}
                        animationDuration={captureMode || shouldReduceAnimations ? 0 : 1500}
                        animationBegin={captureMode || shouldReduceAnimations ? 0 : 500}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <p className="text-sm sm:text-base text-[var(--wrapped-text-muted)] mt-2 font-medium">
                {peakHourLabel} is your peak
              </p>
            </motion.div>

            {/* Top Words Bar Chart */}
            <motion.div
              initial={captureMode ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: captureMode ? 0 : 0.5 }}
              className="flex-1 rounded-3xl wrapped-glass p-6 sm:p-8 flex flex-col justify-center"
            >
              <h3 className="wrapped-label text-base sm:text-lg mb-6 flex items-center justify-center gap-2">
                Popular Words
              </h3>
              <div className="space-y-4 w-full">
                {topWords.map((word, i) => (
                  <motion.div
                    key={word.word}
                    className="flex items-center gap-2 sm:gap-3"
                    initial={captureMode || shouldReduceAnimations ? false : { opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: captureMode ? 0 : 0.7 + i * 0.1 }}
                  >
                    <span className="text-xs sm:text-sm md:text-base text-[var(--wrapped-text-secondary)] w-16 sm:w-20 md:w-24 text-right truncate font-medium">
                      {word.word}
                    </span>
                    <div className="flex-1 h-4 sm:h-5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                        style={{ backgroundColor: barColors[i] }}
                        initial={captureMode ? { width: `${(word.count / maxWordCount) * 100}%` } : { width: 0 }}
                        animate={{ width: `${(word.count / maxWordCount) * 100}%` }}
                        transition={{ delay: captureMode ? 0 : 0.8 + i * 0.1, duration: 0.5 }}
                      />
                    </div>
                    <span className="text-xs sm:text-sm md:text-base font-mono text-white w-8 sm:w-10 font-bold">{word.count}</span>
                  </motion.div>
                ))}
              </div>
              {topWords.length === 0 && (
                <p className="text-sm text-[var(--wrapped-text-muted)]">
                  No common words found
                </p>
              )}
            </motion.div>
          </div>

          {/* Work Pattern Stats - Premium Glass */}
          <motion.div
            initial={captureMode ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: captureMode ? 0 : 0.9 }}
            className="w-full max-w-3xl rounded-3xl wrapped-glass-premium p-6 sm:p-8 mt-2 relative overflow-hidden"
          >
            {/* Subtle ambient glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-orange-500/5 pointer-events-none" />
            <h3 className="wrapped-label text-base sm:text-lg mb-6">Work Patterns</h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-16">
              {/* Late Night Stat */}
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                  <Moon className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400" />
                </div>
                <div className="text-left">
                  <p className="font-mono text-4xl sm:text-5xl font-bold text-white">
                    {lateNightPercentage}%
                  </p>
                  <p className="text-sm sm:text-base text-[var(--wrapped-text-muted)]">
                    after midnight
                  </p>
                </div>
              </div>

              <div className="hidden sm:block w-px h-16 bg-white/20" />

              {/* Weekend Stat */}
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                  <CalendarDays className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400" />
                </div>
                <div className="text-left">
                  <p className="font-mono text-4xl sm:text-5xl font-bold text-white">
                    {weekendPercentage}%
                  </p>
                  <p className="text-sm sm:text-base text-[var(--wrapped-text-muted)]">
                    on weekends
                  </p>
                </div>
              </div>
            </div>

            {/* Playful absurdist insight */}
            <motion.p
              initial={captureMode ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: captureMode ? 0 : 1.2 }}
              className="text-center text-base sm:text-lg md:text-xl text-[var(--wrapped-accent-cyan)] mt-6 font-medium"
            >
              {lateNightPercentage > 20
                ? `${lateNightPercentage}% after midnight? We're concerned but impressed.`
                : weekendPercentage > 40
                  ? "Weekends are for creating emojis, apparently."
                  : "Your work hours are suspiciously productive."}
            </motion.p>
          </motion.div>

          {/* Branding */}
          <SlideBranding />
        </div>
      </div>

      {/* Share button */}
      <SlideShareButton
        slideRef={slideRef}
        slideName="patterns"
        workspaceName={workspaceName}
        year={year}
        backgroundColor="var(--wrapped-bg-start)"
      />
    </div>
  )
}
