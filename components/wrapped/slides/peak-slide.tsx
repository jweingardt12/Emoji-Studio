"use client"

import { useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { BusiestPeriod, DayOfWeekStat, MonthlyCount } from "@/lib/services/wrapped-service"
import { proxyImageUrl, EMOJI_PLACEHOLDER, hasValidUrl } from "@/lib/utils/image-proxy"
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

  // Hydration tracking for WKWebView compatibility
  const [hydrated, setHydrated] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  useEffect(() => {
    setHydrated(true)
  }, [])
  const shouldAnimate = hydrated && !captureMode && !shouldReduceAnimations

  const handleImageError = (key: string) => {
    setFailedImages((prev) => new Set(prev).add(key))
  }

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
        className={`relative w-full max-w-4xl ${captureMode ? "h-[600px] overflow-hidden" : "h-full max-h-full overflow-y-auto scrollbar-hide"}`}
      >
        <div className={`flex flex-col items-center pt-4 pb-4 px-4 sm:px-6 w-full ${captureMode ? "h-full justify-between" : "min-h-full justify-between"}`}>
          {/* Consistent header */}
          <SlideHeader year={year} />

          {/* Title */}
          {captureMode ? (
            <div className="mb-6">
              <h2 className="wrapped-headline text-white mb-2 text-4xl sm:text-5xl">When Creativity Peaked</h2>
              <p className="wrapped-body text-lg sm:text-xl">The moments that defined {year}</p>
            </div>
          ) : (
            <BlurFade delay={0.1} shouldAnimate={shouldAnimate} className="mb-6">
              <h2 className="wrapped-headline mb-2 text-4xl sm:text-5xl md:text-6xl">
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
              <p className="wrapped-body text-lg sm:text-xl md:text-2xl">The moments that defined {year}</p>
            </BlurFade>
          )}

          {/* Busiest day spotlight - WIDER and BOLDER */}
          <motion.div
            initial={captureMode ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: captureMode ? 0 : 0.3 }}
            className="w-full max-w-3xl rounded-3xl wrapped-glass border border-[var(--wrapped-accent-cyan)]/30 p-6 sm:p-8 mb-6 relative overflow-hidden"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--wrapped-accent-cyan)]/10 to-transparent pointer-events-none" />

            <div className="relative">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12">
                <div className="text-center md:text-left flex-1">
                  <p className="wrapped-label text-sm sm:text-base mb-2 flex items-center justify-center md:justify-start gap-2">
                    <Calendar className="w-5 h-5" />
                    Best Day
                  </p>
                  <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">{busiestDay.date || "N/A"}</p>
                  <p className="wrapped-body text-lg sm:text-xl opacity-90 mb-4">{getPlayfulCopy()}</p>
                  <div className="font-mono text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-[var(--wrapped-accent-cyan)] leading-none">
                    {captureMode ? (
                      <span>{busiestDay.count}</span>
                    ) : (
                      <NumberTicker
                        value={busiestDay.count}
                        delay={0.5}
                        className="font-mono text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-[var(--wrapped-accent-cyan)] leading-none tracking-tighter"
                      />
                    )}
                  </div>
                  <span className="text-xl sm:text-2xl font-normal text-[var(--wrapped-text-secondary)]">emojis created</span>
                </div>

                {/* Emoji grid from that day - Larger and more prominent */}
                {busiestDay.emojis.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 justify-items-center bg-black/20 p-4 rounded-2xl">
                    {busiestDay.emojis.slice(0, 12).filter(emoji => hasValidUrl(emoji)).map((emoji, i) => {
                      const key = `peak-${emoji.name}`
                      const hasFailed = failedImages.has(key)
                      return (
                        <motion.img
                          key={key}
                          src={hasFailed ? EMOJI_PLACEHOLDER : proxyImageUrl(emoji.url)}
                          alt={emoji.name}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl shadow-lg object-contain bg-white/5 p-1"
                          initial={captureMode || shouldReduceAnimations ? false : { scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: captureMode ? 0 : 0.8 + i * 0.05 }}
                          onError={() => handleImageError(key)}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Monthly activity chart - FULL WIDTH */}
          <motion.div
            initial={captureMode ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: captureMode ? 0 : 0.6 }}
            className="w-full max-w-3xl rounded-2xl wrapped-glass p-4 sm:p-6"
          >
            <h3 className="wrapped-label text-sm sm:text-base mb-4 flex items-center justify-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Monthly Activity
            </h3>
            <div className="flex items-end justify-between gap-1 sm:gap-2 h-36 sm:h-44 md:h-48 mb-3">
              {normalizedMonths.map((month, i) => (
                <motion.div
                  key={month.month}
                  className="flex-1 h-full flex flex-col justify-end group relative"
                  initial={captureMode || shouldReduceAnimations ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: captureMode ? 0 : 0.8 + i * 0.05 }}
                >
                  {/* Hover tooltip */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black/90 text-white text-sm px-3 py-1.5 rounded-lg whitespace-nowrap z-10 border border-white/20">
                    {month.month}: {month.count}
                  </div>
                  {/* Bar */}
                  <motion.div
                    className={`w-full rounded-t-md transition-colors ${month.month === peakMonth?.month
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
            <div className="flex justify-between text-xs sm:text-sm text-[var(--wrapped-text-muted)] font-medium">
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
                className="text-center text-sm sm:text-base md:text-lg text-[var(--wrapped-accent-cyan)] mt-4 font-medium"
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
      </div>

    </div>
  )
}
