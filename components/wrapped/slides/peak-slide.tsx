"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { BusiestPeriod, DayOfWeekStat, MonthlyCount } from "@/lib/services/wrapped-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"

interface PeakSlideProps {
  busiestDay: BusiestPeriod
  peakDayOfWeek: DayOfWeekStat
  monthlyBreakdown: MonthlyCount[]
  workspaceName: string
  year: number
}

export function PeakSlide({ busiestDay, peakDayOfWeek, monthlyBreakdown, workspaceName, year }: PeakSlideProps) {
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

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
      {/* Capturable content - fixed square size for consistent share images */}
      <div ref={slideRef} className="relative flex flex-col items-center justify-center p-6 w-[600px] h-[600px] overflow-hidden">
        {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Peak Activity
        </h2>
        <p className="text-white/60">When creativity peaked</p>
      </motion.div>

      {/* Busiest day card */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6 mb-6"
      >
        <div className="text-4xl mb-3">📅</div>
        <h3 className="text-lg text-white/70 mb-1">Busiest Day</h3>
        <p className="text-2xl font-bold text-white mb-2">{busiestDay.date}</p>
        <p className="text-3xl font-black text-emerald-400">{busiestDay.count} emojis</p>

        {/* Sample emojis from that day */}
        {busiestDay.emojis.length > 0 && (
          <div className="flex justify-center gap-2 mt-4">
            {busiestDay.emojis.slice(0, 5).map((emoji, i) => (
              <motion.img
                key={emoji.name}
                src={proxyImageUrl(emoji.url)}
                alt={emoji.name}
                className="w-8 h-8 rounded"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Monthly bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-md rounded-xl bg-white/5 border border-white/10 p-4"
      >
        <h3 className="text-sm text-white/60 mb-4 font-medium">Monthly Activity</h3>
        <div className="flex items-end justify-between gap-1.5 h-24 mb-2">
          {normalizedMonths.map((month, i) => (
            <motion.div
              key={month.month}
              className="flex-1 h-full flex flex-col justify-end group relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 + i * 0.05 }}
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
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(month.height, 8)}%` }}
                transition={{ delay: 0.8 + i * 0.05, duration: 0.5 }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="text-center text-xs text-emerald-400 mt-3"
          >
            Peak: {peakMonth.month} with {peakMonth.count} emojis
          </motion.p>
        )}
      </motion.div>

        {/* Peak day of week */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-6 flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 border border-white/20"
        >
          <span className="text-xl">📊</span>
          <span className="text-white/80">
            Most emojis created on{" "}
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
