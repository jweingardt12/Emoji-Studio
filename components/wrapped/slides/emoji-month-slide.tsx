"use client"

import { useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { MonthlyTopCreator } from "@/lib/services/wrapped-service"
import { Emoji } from "@/lib/services/emoji-service"
import { proxyImageUrl, EMOJI_PLACEHOLDER, hasValidUrl } from "@/lib/utils/image-proxy"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { useShouldReduceAnimations, getStaggerDelay } from "@/hooks/use-animation-tier"
import { Crown, Calendar, Trophy } from "lucide-react"

interface EmojiMonthSlideProps {
  monthlyTopCreators: MonthlyTopCreator[]
  workspaceName: string
  year: number
  customEmojis?: Emoji[]
  captureMode?: boolean
}

function formatName(name: string): string {
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

// Seasonal color accents for each month
const MONTH_ACCENTS: Record<number, { bg: string; glow: string }> = {
  0: { bg: "from-blue-500/20 to-cyan-500/10", glow: "rgba(59, 130, 246, 0.3)" }, // January - winter blue
  1: { bg: "from-pink-500/20 to-red-500/10", glow: "rgba(236, 72, 153, 0.3)" }, // February - valentine pink
  2: { bg: "from-green-500/20 to-emerald-500/10", glow: "rgba(34, 197, 94, 0.3)" }, // March - spring green
  3: { bg: "from-yellow-500/20 to-pink-500/10", glow: "rgba(234, 179, 8, 0.3)" }, // April - spring bloom
  4: { bg: "from-emerald-500/20 to-teal-500/10", glow: "rgba(16, 185, 129, 0.3)" }, // May - fresh green
  5: { bg: "from-orange-500/20 to-yellow-500/10", glow: "rgba(249, 115, 22, 0.3)" }, // June - summer sun
  6: { bg: "from-red-500/20 to-orange-500/10", glow: "rgba(239, 68, 68, 0.3)" }, // July - hot summer
  7: { bg: "from-amber-500/20 to-orange-500/10", glow: "rgba(245, 158, 11, 0.3)" }, // August - late summer
  8: { bg: "from-orange-500/20 to-amber-500/10", glow: "rgba(249, 115, 22, 0.3)" }, // September - autumn
  9: { bg: "from-orange-600/20 to-red-500/10", glow: "rgba(234, 88, 12, 0.3)" }, // October - fall colors
  10: { bg: "from-amber-600/20 to-orange-600/10", glow: "rgba(217, 119, 6, 0.3)" }, // November - harvest
  11: { bg: "from-blue-400/20 to-purple-500/10", glow: "rgba(96, 165, 250, 0.3)" }, // December - winter magic
}

// Short month names for mobile
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

interface MonthCardProps {
  data: MonthlyTopCreator
  index: number
  isChampion: boolean
  championCount: number
  captureMode: boolean
  shouldAnimate: boolean
}

function MonthCard({ data, index, isChampion, championCount, captureMode, shouldAnimate }: MonthCardProps) {
  const [imgError, setImgError] = useState(false)
  const delay = getStaggerDelay(index, 0.2, 0.05)
  const accent = MONTH_ACCENTS[data.monthIndex]

  const hasEmoji = data.topCreator?.topEmoji && hasValidUrl(data.topCreator.topEmoji)
  const isPeakMonth = data.totalCount === Math.max(...Array.from({ length: 12 }, (_, i) => i).map(() => data.totalCount))

  return (
    <motion.div
      className={`relative rounded-xl overflow-hidden ${
        isChampion ? "ring-2 ring-(--wrapped-accent-orange)/50" : ""
      }`}
      initial={shouldAnimate ? { opacity: 0, scale: 0.9, y: 20 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={
        shouldAnimate
          ? {
              delay,
              type: "spring",
              stiffness: 300,
              damping: 25,
            }
          : { duration: 0 }
      }
    >
      {/* Card background with seasonal gradient */}
      <div className={`absolute inset-0 bg-linear-to-br ${accent.bg} opacity-60`} />
      <div className="absolute inset-0 wrapped-glass" />

      {/* Content */}
      <div className="relative p-3 sm:p-4 flex flex-col items-center gap-2">
        {/* Month name */}
        <p className="text-xs sm:text-sm font-medium text-(--wrapped-text-muted) uppercase tracking-wider">
          <span className="sm:hidden">{SHORT_MONTHS[data.monthIndex]}</span>
          <span className="hidden sm:inline">{data.month}</span>
        </p>

        {/* Creator avatar/emoji */}
        {data.topCreator ? (
          <div className="relative">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-white/10 flex items-center justify-center border-2 border-white/20">
              {hasEmoji && !imgError ? (
                <img
                  src={proxyImageUrl(data.topCreator.topEmoji!.url)}
                  alt=""
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className="text-2xl">🏆</span>
              )}
            </div>
            {/* Crown for repeat champions */}
            {isChampion && championCount > 1 && (
              <motion.div
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-(--wrapped-accent-orange) flex items-center justify-center"
                initial={shouldAnimate ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={{ delay: delay + 0.2, type: "spring" }}
              >
                <Crown className="w-3.5 h-3.5 text-white" />
              </motion.div>
            )}
          </div>
        ) : (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 flex items-center justify-center border-2 border-white/10">
            <span className="text-xl opacity-30">-</span>
          </div>
        )}

        {/* Creator name */}
        <p className="text-sm sm:text-base font-semibold text-white truncate max-w-full px-1">
          {data.topCreator ? formatName(data.topCreator.displayName) : "—"}
        </p>

        {/* Emoji count */}
        {data.topCreator && (
          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            <span className="font-mono font-bold text-(--wrapped-accent-cyan)">{data.topCreator.count}</span>
            <span className="text-(--wrapped-text-muted)">emojis</span>
          </div>
        )}
      </div>

      {/* Glow effect for months with high activity */}
      {data.topCreator && data.topCreator.count >= 10 && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: `radial-gradient(ellipse at center, ${accent.glow} 0%, transparent 70%)`,
          }}
        />
      )}
    </motion.div>
  )
}

export function EmojiMonthSlide({
  monthlyTopCreators,
  workspaceName,
  year,
  customEmojis = [],
  captureMode = false,
}: EmojiMonthSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const shouldReduceAnimations = useShouldReduceAnimations()

  // Hydration tracking for WKWebView compatibility
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  const shouldAnimate = hydrated && !captureMode && !shouldReduceAnimations

  // Find "champion of champions" - person who won the most months
  const championCounts: Record<string, number> = {}
  monthlyTopCreators.forEach((m) => {
    if (m.topCreator) {
      championCounts[m.topCreator.userId] = (championCounts[m.topCreator.userId] || 0) + 1
    }
  })

  const maxMonthsWon = Math.max(...Object.values(championCounts), 0)
  const overallChampions = Object.entries(championCounts)
    .filter(([, count]) => count === maxMonthsWon && count > 1)
    .map(([userId]) => userId)

  const overallChampionName = monthlyTopCreators.find(
    (m) => m.topCreator && overallChampions.includes(m.topCreator.userId)
  )?.topCreator?.displayName

  // Find peak month (highest total count)
  const peakMonth = monthlyTopCreators.reduce(
    (max, m) => (m.totalCount > max.totalCount ? m : max),
    monthlyTopCreators[0]
  )

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Noise texture overlay */}
      <div className="wrapped-noise absolute inset-0 pointer-events-none" />

      {/* Decorative floating emojis */}
      {customEmojis.slice(0, 6).map((emoji, i) => (
        <motion.img
          key={`deco-${emoji.name}-${i}`}
          src={proxyImageUrl(emoji.url)}
          alt=""
          className="absolute w-8 h-8 sm:w-10 sm:h-10 opacity-20 pointer-events-none"
          style={{
            top: `${10 + (i % 3) * 30}%`,
            left: i < 3 ? `${5 + i * 3}%` : undefined,
            right: i >= 3 ? `${5 + (i - 3) * 3}%` : undefined,
          }}
          initial={shouldAnimate ? { opacity: 0, scale: 0 } : { opacity: 0.2 }}
          animate={{ opacity: 0.2, scale: 1, rotate: [0, 5, -5, 0] }}
          transition={{
            delay: 1 + i * 0.1,
            rotate: { repeat: Infinity, duration: 4 + i, ease: "easeInOut" },
          }}
        />
      ))}

      {/* Capturable content */}
      <div
        ref={slideRef}
        className={`relative w-full max-w-4xl ${
          captureMode ? "h-[600px] overflow-hidden" : "h-full max-h-full overflow-y-auto scrollbar-hide"
        }`}
      >
        <div
          className={`flex flex-col items-center pt-4 pb-4 px-3 sm:px-6 w-full ${
            captureMode ? "h-full justify-between" : "min-h-full justify-between"
          }`}
        >
          {/* Top Section: Header & Title */}
          <div className="w-full flex flex-col items-center shrink-0">
            <div className="mb-2">
              <SlideHeader year={year} />
            </div>

            <div className="mt-2 mb-4 text-center">
              {captureMode ? (
                <div>
                  <h2 className="wrapped-headline text-white mb-2 text-3xl sm:text-4xl flex items-center justify-center gap-3">
                    <Calendar className="w-7 h-7 text-(--wrapped-accent-cyan)" />
                    Monthly Champions
                    <Calendar className="w-7 h-7 text-(--wrapped-accent-cyan)" />
                  </h2>
                  <p className="wrapped-body text-base sm:text-lg">Who ruled each month of {year}?</p>
                </div>
              ) : (
                <BlurFade delay={0.1} shouldAnimate={shouldAnimate}>
                  <h2 className="wrapped-headline mb-2 text-3xl sm:text-4xl md:text-5xl flex items-center justify-center gap-2 sm:gap-3">
                    <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-(--wrapped-accent-cyan)" />
                    <GradientText
                      colors={[
                        "var(--wrapped-accent-cyan)",
                        "var(--wrapped-accent-purple)",
                        "var(--wrapped-accent-orange)",
                        "var(--wrapped-accent-cyan)",
                      ]}
                      animationSpeed={6}
                    >
                      Monthly Champions
                    </GradientText>
                    <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-(--wrapped-accent-cyan)" />
                  </h2>
                  <p className="wrapped-body text-base sm:text-lg md:text-xl">Who ruled each month of {year}?</p>
                </BlurFade>
              )}
            </div>
          </div>

          {/* Middle Section: Month Grid */}
          <div className="flex-1 w-full flex items-center justify-center min-h-0 my-2">
            <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {monthlyTopCreators.map((data, index) => (
                <MonthCard
                  key={data.month}
                  data={data}
                  index={index}
                  isChampion={data.topCreator ? overallChampions.includes(data.topCreator.userId) : false}
                  championCount={data.topCreator ? championCounts[data.topCreator.userId] || 0 : 0}
                  captureMode={captureMode}
                  shouldAnimate={shouldAnimate}
                />
              ))}
            </div>
          </div>

          {/* Bottom Section: Champion Callout & Branding */}
          <div className="flex flex-col items-center shrink-0 gap-3 mt-4 mb-safe">
            {/* Overall champion callout */}
            {overallChampionName && maxMonthsWon > 1 && (
              <motion.div
                className="wrapped-pill px-4 py-2 rounded-full flex items-center gap-2"
                initial={shouldAnimate ? { opacity: 0, scale: 0.8 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: captureMode ? 0 : 1.2 }}
              >
                <Trophy className="w-4 h-4 text-(--wrapped-accent-orange)" />
                <span className="text-white font-medium text-sm">
                  <span className="font-bold text-(--wrapped-accent-orange)">
                    {formatName(overallChampionName)}
                  </span>{" "}
                  dominated{" "}
                  <span className="font-bold text-(--wrapped-accent-orange)">{maxMonthsWon} months</span>!
                </span>
                <Trophy className="w-4 h-4 text-(--wrapped-accent-orange)" />
              </motion.div>
            )}

            {/* Peak month callout */}
            {peakMonth.totalCount > 0 && (
              <motion.p
                className="text-sm text-(--wrapped-text-muted)"
                initial={shouldAnimate ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ delay: captureMode ? 0 : 1.4 }}
              >
                {peakMonth.month} was the busiest with{" "}
                <span className="text-(--wrapped-accent-cyan) font-semibold">{peakMonth.totalCount}</span> total
                emojis
              </motion.p>
            )}

            {/* Branding */}
            <SlideBranding />
          </div>
        </div>
      </div>
    </div>
  )
}
