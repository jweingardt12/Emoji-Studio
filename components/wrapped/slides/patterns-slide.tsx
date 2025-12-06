"use client"

import { useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { WrappedStats, HourlyDistributionBucket } from "@/lib/services/wrapped-service"
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
  workspaceName: string
  year: number
  captureMode?: boolean
}

export function PatternsSlide({
  stats,
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

  // Prepare radar chart data
  const radarData = stats.hourlyDistribution.map((bucket) => ({
    label: bucket.label,
    count: bucket.count,
    fullMark: Math.max(...stats.hourlyDistribution.map((b) => b.count)),
  }))

  // Top 5 words for bar chart
  const topWords = stats.funStats.topWords.slice(0, 5)
  const maxWordCount = topWords[0]?.count || 1

  // Work pattern percentages
  const lateNightPercentage = Math.round(
    (stats.funStats.lateNightCount / stats.overview.totalEmojis) * 100
  )
  const weekendPercentage = stats.funStats.weekendPercentage

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
        className={`relative flex flex-col items-center pt-4 pb-4 px-4 sm:px-6 w-full max-w-[600px] ${
          captureMode ? "h-[600px]" : "h-auto min-h-[500px] sm:min-h-[600px]"
        } overflow-hidden`}
      >
        {/* Consistent header */}
        <SlideHeader year={year} />

        {/* Title */}
        {captureMode ? (
          <div className="mb-4">
            <h2 className="wrapped-headline text-white mb-1">Your Patterns</h2>
            <p className="wrapped-body">How you create emojis</p>
          </div>
        ) : (
          <BlurFade delay={0.1} className="mb-4">
            <h2 className="wrapped-headline mb-1">
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
            <p className="wrapped-body">How you create emojis</p>
          </BlurFade>
        )}

        {/* Two-column layout for charts */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mb-4">
          {/* Hour-of-Day Radar Chart */}
          <motion.div
            initial={captureMode ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: captureMode ? 0 : 0.3 }}
            className="flex-1 rounded-xl wrapped-glass p-4"
          >
            <h3 className="wrapped-label text-xs mb-2 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              Peak Hours
            </h3>
            <div className="h-[160px] w-full">
              {isClient && (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid
                      gridType="polygon"
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <PolarAngleAxis
                      dataKey="label"
                      tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 9 }}
                      tickLine={false}
                    />
                    <Radar
                      dataKey="count"
                      stroke="var(--wrapped-accent-purple)"
                      fill="var(--wrapped-accent-purple)"
                      fillOpacity={0.5}
                      strokeWidth={2}
                      animationDuration={captureMode || shouldReduceAnimations ? 0 : 1500}
                      animationBegin={captureMode || shouldReduceAnimations ? 0 : 500}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="text-[10px] text-[var(--wrapped-text-muted)] mt-1">
              {stats.peakHourOfDay.label} is your peak
            </p>
          </motion.div>

          {/* Top Words Bar Chart */}
          <motion.div
            initial={captureMode ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: captureMode ? 0 : 0.5 }}
            className="flex-1 rounded-xl wrapped-glass p-4"
          >
            <h3 className="wrapped-label text-xs mb-3 flex items-center justify-center gap-2">
              Popular Words
            </h3>
            <div className="space-y-2">
              {topWords.map((word, i) => (
                <motion.div
                  key={word.word}
                  className="flex items-center gap-2"
                  initial={captureMode || shouldReduceAnimations ? false : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: captureMode ? 0 : 0.7 + i * 0.1 }}
                >
                  <span className="text-xs text-[var(--wrapped-text-secondary)] w-16 text-right truncate">
                    {word.word}
                  </span>
                  <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: barColors[i] }}
                      initial={captureMode ? { width: `${(word.count / maxWordCount) * 100}%` } : { width: 0 }}
                      animate={{ width: `${(word.count / maxWordCount) * 100}%` }}
                      transition={{ delay: captureMode ? 0 : 0.8 + i * 0.1, duration: 0.5 }}
                    />
                  </div>
                  <span className="text-xs font-mono text-white w-8">{word.count}</span>
                </motion.div>
              ))}
            </div>
            {topWords.length === 0 && (
              <p className="text-xs text-[var(--wrapped-text-muted)]">
                No common words found
              </p>
            )}
          </motion.div>
        </div>

        {/* Work Pattern Stats */}
        <motion.div
          initial={captureMode ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: captureMode ? 0 : 0.9 }}
          className="w-full max-w-md rounded-xl wrapped-glass p-4"
        >
          <h3 className="wrapped-label text-xs mb-4">Work Patterns</h3>
          <div className="flex items-center justify-center gap-6">
            {/* Late Night Stat */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                <Moon className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="text-left">
                <p className="font-mono text-2xl font-bold text-white">
                  {lateNightPercentage}%
                </p>
                <p className="text-xs text-[var(--wrapped-text-muted)]">
                  after midnight
                </p>
              </div>
            </div>

            <div className="w-px h-12 bg-white/20" />

            {/* Weekend Stat */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-orange-400" />
              </div>
              <div className="text-left">
                <p className="font-mono text-2xl font-bold text-white">
                  {weekendPercentage}%
                </p>
                <p className="text-xs text-[var(--wrapped-text-muted)]">
                  on weekends
                </p>
              </div>
            </div>
          </div>

          {/* Playful insight */}
          <motion.p
            initial={captureMode ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: captureMode ? 0 : 1.2 }}
            className="text-center text-xs text-[var(--wrapped-accent-cyan)] mt-4"
          >
            {lateNightPercentage > 20
              ? "You're a true night owl!"
              : weekendPercentage > 40
                ? "Weekends are your creative time!"
                : "You're most creative during work hours"}
          </motion.p>
        </motion.div>

        {/* Branding */}
        <SlideBranding />
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
