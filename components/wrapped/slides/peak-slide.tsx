"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { BusiestPeriod, DayOfWeekStat, MonthlyCount } from "@/lib/services/wrapped-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { NumberTicker } from "@/components/ui/number-ticker"
import { GridBackground } from "@/components/ui/grid-background"
import { Meteors } from "@/components/ui/meteors"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"

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
  captureMode = false
}: PeakSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)

  // Find peak month
  const peakMonth = monthlyBreakdown.reduce((max, month) =>
    month.count > max.count ? month : max
  , monthlyBreakdown[0])

  // Normalize monthly data for sparkline
  const maxMonthCount = Math.max(...monthlyBreakdown.map((m) => m.count))
  const normalizedMonths = monthlyBreakdown.map((m) => ({
    ...m,
    height: maxMonthCount > 0 ? (m.count / maxMonthCount) * 100 : 0,
  }))

  // Playful copy for peak day
  const getPlayfulCopy = () => {
    if (busiestDay.count >= 50) return "went absolutely WILD"
    if (busiestDay.count >= 30) return "was on fire 🔥"
    if (busiestDay.count >= 15) return "was pretty busy"
    return "was the peak"
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
      {/* Background effects */}
      <GridBackground
        gridSize={35}
        gridColor="rgba(255, 255, 255, 0.04)"
        showGlow={true}
        glowColor="rgba(16, 185, 129, 0.2)"
        glowPosition="top"
      />
      {!captureMode && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Meteors number={10} className="opacity-50" />
        </div>
      )}

      {/* Capturable content - fixed square size for share images, flexible for live view */}
      <div ref={slideRef} className={`relative flex flex-col items-center pt-4 pb-4 px-6 w-[600px] ${captureMode ? 'h-[600px]' : 'h-auto min-h-[600px]'} overflow-hidden`}>
        {/* Consistent header for share images */}
        <SlideHeader year={year} />

        {/* Title with GradientText */}
        {captureMode ? (
          <div className="mb-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
              When Creativity Peaked
            </h2>
            <p className="text-white/60 text-sm">The moments that defined {year}</p>
          </div>
        ) : (
          <BlurFade delay={0.1} className="mb-4">
            <h2 className="text-2xl md:text-3xl font-bold mb-1">
              <GradientText colors={["#10b981", "#14b8a6", "#06b6d4", "#10b981"]} animationSpeed={6}>
                When Creativity Peaked
              </GradientText>
            </h2>
            <p className="text-white/60 text-sm">The moments that defined {year}</p>
          </BlurFade>
        )}

        {/* Busiest day spotlight */}
        <motion.div
          initial={captureMode ? false : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: captureMode ? 0 : 0.3 }}
          className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 p-5 mb-4 relative overflow-hidden"
        >
          {/* Subtle ripple effect in background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              className="w-32 h-32 rounded-full border border-emerald-400/20"
              animate={captureMode ? {} : { scale: [1, 2, 2], opacity: [0.5, 0.2, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>

          <div className="relative">
            <p className="text-emerald-300 text-sm font-medium mb-1">🗓️ Best Day</p>
            <p className="text-2xl font-bold text-white mb-2">{busiestDay.date}</p>
            <p className="text-sm text-white/60 mb-3">{getPlayfulCopy()}</p>
            <div className="text-4xl font-black text-emerald-400">
              {captureMode ? (
                <span>{busiestDay.count}</span>
              ) : (
                <NumberTicker
                  value={busiestDay.count}
                  delay={0.5}
                  className="text-4xl font-black text-emerald-400"
                />
              )}
              <span className="text-lg font-normal text-emerald-400/70 ml-2">emojis</span>
            </div>

            {/* Sample emojis from that day - LARGER and more */}
            {busiestDay.emojis.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {busiestDay.emojis.slice(0, 8).map((emoji, i) => (
                  <motion.img
                    key={emoji.name}
                    src={proxyImageUrl(emoji.url)}
                    alt={emoji.name}
                    className="w-12 h-12 rounded-lg shadow-lg object-contain"
                    initial={captureMode ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: captureMode ? 0 : 0.8 + i * 0.08 }}
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
          className="w-full max-w-md rounded-xl bg-white/5 border border-white/10 p-4"
        >
          <h3 className="text-sm text-white/60 mb-4 font-medium">Monthly Activity</h3>
          <div className="flex items-end justify-between gap-1.5 h-20 mb-2">
            {normalizedMonths.map((month, i) => (
              <motion.div
                key={month.month}
                className="flex-1 h-full flex flex-col justify-end group relative"
                initial={captureMode ? false : { opacity: 0 }}
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
                      ? "bg-gradient-to-t from-emerald-500 to-emerald-400"
                      : "bg-white/30 group-hover:bg-white/50"
                  }`}
                  initial={captureMode ? { height: `${Math.max(month.height, 8)}%` } : { height: 0 }}
                  animate={{ height: `${Math.max(month.height, 8)}%` }}
                  transition={{ delay: captureMode ? 0 : 0.8 + i * 0.05, duration: 0.5 }}
                />
              </motion.div>
            ))}
          </div>
          {/* Month labels */}
          <div className="flex justify-between text-[10px] text-white/40">
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
              className="text-center text-xs text-emerald-400 mt-3"
            >
              {peakMonth.month} was the busiest with {peakMonth.count} emojis
            </motion.p>
          )}
        </motion.div>

        {/* Peak day of week */}
        <motion.div
          initial={captureMode ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: captureMode ? 0 : 1.2 }}
          className="mt-6 flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 border border-white/20"
        >
          <span className="text-lg">📅</span>
          <span className="text-white/80 text-sm">
            Most emojis on{" "}
            <span className="text-white font-bold">{peakDayOfWeek.day}s</span>
          </span>
        </motion.div>

        {/* Branding */}
        <SlideBranding />
      </div>

      {/* Share button - outside capturable area */}
      <SlideShareButton
        slideRef={slideRef}
        slideName="peak"
        workspaceName={workspaceName}
        year={year}
        backgroundColor="#064e3b"
      />
    </div>
  )
}
