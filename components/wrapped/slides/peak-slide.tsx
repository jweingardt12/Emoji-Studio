"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { BusiestPeriod, DayOfWeekStat, MonthlyCount } from "@/lib/services/wrapped-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { StatPill } from "../stat-card"
import { NumberTicker } from "@/components/ui/number-ticker"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import { Calendar, TrendingUp } from "lucide-react"

interface PeakSlideProps {
  busiestDay: BusiestPeriod
  peakDayOfWeek: DayOfWeekStat
  monthlyBreakdown: MonthlyCount[]
  workspaceName: string
  year: number
  captureMode?: boolean
}

export function PeakSlide({
  busiestDay,
  peakDayOfWeek,
  monthlyBreakdown,
  workspaceName,
  year,
  captureMode = false,
}: PeakSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const shouldReduceAnimations = useShouldReduceAnimations()

  // Find peak month
  const peakMonth = monthlyBreakdown.reduce(
    (max, month) => (month.count > max.count ? month : max),
    monthlyBreakdown[0]
  )

  // Normalize monthly data for chart
  const maxMonthCount = Math.max(...monthlyBreakdown.map((m) => m.count))
  const normalizedMonths = monthlyBreakdown.map((m) => ({
    ...m,
    height: maxMonthCount > 0 ? (m.count / maxMonthCount) * 100 : 0,
  }))

  // Playful copy for peak day
  const getPlayfulCopy = () => {
    if (busiestDay.count >= 50) return "Absolutely legendary"
    if (busiestDay.count >= 30) return "On fire"
    if (busiestDay.count >= 15) return "Pretty busy"
    return "The peak"
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
            <h2 className="wrapped-headline text-white mb-1">When Creativity Peaked</h2>
            <p className="wrapped-body">The moments that defined {year}</p>
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
                When Creativity Peaked
              </GradientText>
            </h2>
            <p className="wrapped-body">The moments that defined {year}</p>
          </BlurFade>
        )}

        {/* Busiest day spotlight */}
        <motion.div
          initial={captureMode ? false : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: captureMode ? 0 : 0.3 }}
          className="w-full max-w-xs sm:max-w-sm rounded-2xl wrapped-glass border border-[var(--wrapped-accent-cyan)]/30 p-4 sm:p-5 mb-4 relative overflow-hidden"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--wrapped-accent-cyan)]/10 to-transparent pointer-events-none" />

          <div className="relative">
            <p className="wrapped-label text-xs mb-1 flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              Best Day
            </p>
            <p className="text-2xl font-bold text-white mb-2">{busiestDay.date}</p>
            <p className="wrapped-body text-sm mb-3">{getPlayfulCopy()}</p>
            <div className="font-mono text-5xl font-black text-[var(--wrapped-accent-cyan)]">
              {captureMode ? (
                <span>{busiestDay.count}</span>
              ) : (
                <NumberTicker
                  value={busiestDay.count}
                  delay={0.5}
                  className="font-mono text-5xl font-black text-[var(--wrapped-accent-cyan)]"
                />
              )}
              <span className="text-lg font-normal text-[var(--wrapped-text-secondary)] ml-2">
                emojis
              </span>
            </div>

            {/* Emoji grid from that day */}
            {busiestDay.emojis.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-4 justify-items-center">
                {busiestDay.emojis.slice(0, 12).map((emoji, i) => (
                  <motion.img
                    key={emoji.name}
                    src={proxyImageUrl(emoji.url)}
                    alt={emoji.name}
                    className="w-12 h-12 rounded-lg shadow-lg object-contain"
                    initial={captureMode || shouldReduceAnimations ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: captureMode ? 0 : 0.8 + i * 0.05 }}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Monthly activity chart */}
        <motion.div
          initial={captureMode ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: captureMode ? 0 : 0.6 }}
          className="w-full max-w-xs sm:max-w-md rounded-xl wrapped-glass p-3 sm:p-4"
        >
          <h3 className="wrapped-label text-xs mb-4 flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Monthly Activity
          </h3>
          <div className="flex items-end justify-between gap-1.5 h-20 mb-2">
            {normalizedMonths.map((month, i) => (
              <motion.div
                key={month.month}
                className="flex-1 h-full flex flex-col justify-end group relative"
                initial={captureMode || shouldReduceAnimations ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: captureMode ? 0 : 0.8 + i * 0.05 }}
              >
                {/* Hover tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  {month.month}: {month.count}
                </div>
                {/* Bar */}
                <motion.div
                  className={`w-full rounded-t transition-colors ${
                    month.month === peakMonth?.month
                      ? "bg-gradient-to-t from-[var(--wrapped-accent-cyan)] to-[var(--wrapped-accent-purple)]"
                      : "bg-white/20 group-hover:bg-white/40"
                  }`}
                  initial={captureMode ? { height: `${Math.max(month.height, 8)}%` } : { height: 0 }}
                  animate={{ height: `${Math.max(month.height, 8)}%` }}
                  transition={{ delay: captureMode ? 0 : 0.8 + i * 0.05, duration: 0.5 }}
                />
              </motion.div>
            ))}
          </div>
          {/* Month labels */}
          <div className="flex justify-between text-[10px] text-[var(--wrapped-text-muted)]">
            {normalizedMonths.map((month) => (
              <span key={month.month} className="flex-1 text-center">
                {month.month.slice(0, 3)}
              </span>
            ))}
          </div>
          {/* Peak month callout */}
          {peakMonth && (
            <motion.p
              initial={captureMode ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: captureMode ? 0 : 1.4 }}
              className="text-center text-xs text-[var(--wrapped-accent-cyan)] mt-3"
            >
              {peakMonth.month} was busiest with {peakMonth.count} emojis
            </motion.p>
          )}
        </motion.div>

        {/* Peak day of week */}
        <motion.div
          initial={captureMode ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: captureMode ? 0 : 1.2 }}
          className="mt-6"
        >
          <StatPill
            value={peakDayOfWeek.day}
            label="most active day"
            icon={<Calendar className="w-4 h-4 text-purple-400" />}
          />
        </motion.div>

        {/* Branding */}
        <SlideBranding />
      </div>

      {/* Share button */}
      <SlideShareButton
        slideRef={slideRef}
        slideName="peak"
        workspaceName={workspaceName}
        year={year}
        backgroundColor="var(--wrapped-bg-start)"
      />
    </div>
  )
}
