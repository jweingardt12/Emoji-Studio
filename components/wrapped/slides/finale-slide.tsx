"use client"

import { motion } from "framer-motion"
import { WrappedStats } from "@/lib/services/wrapped-service"
import { Emoji } from "@/lib/services/emoji-service"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { useEffect, useRef } from "react"
import { Confetti, ConfettiRef } from "@/components/ui/confetti"
import { SparklesText } from "@/components/ui/sparkles-text"
import { NumberTicker } from "@/components/ui/number-ticker"
import { SlideHeader } from "../slide-header"
import { SlideBranding } from "../slide-branding"
import { EmojiGridBackground } from "../emoji-grid-background"
import { DotPattern } from "@/components/ui/dot-pattern"
import { ShootingStars } from "@/components/ui/shooting-stars"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"

interface FinaleSlideProps {
  stats: WrappedStats
  workspaceName: string
  onShare: () => void
  customEmojis?: Emoji[]
  allYearEmojis?: Emoji[]
  captureMode?: boolean
}

export function FinaleSlide({
  stats,
  workspaceName,
  onShare,
  customEmojis = [],
  allYearEmojis = [],
  captureMode = false
}: FinaleSlideProps) {
  const confettiRef = useRef<ConfettiRef>(null)

  // Auto-trigger confetti on mount
  useEffect(() => {
    if (captureMode) return

    // Initial burst
    const timer1 = setTimeout(() => {
      confettiRef.current?.fire({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7, x: 0.3 },
      })
    }, 300)

    const timer2 = setTimeout(() => {
      confettiRef.current?.fire({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7, x: 0.7 },
      })
    }, 500)

    // Celebratory burst
    const timer3 = setTimeout(() => {
      confettiRef.current?.fire({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.5 },
      })
    }, 800)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [captureMode])

  // Use all year emojis for background
  const backgroundEmojis = allYearEmojis.length > 0 ? allYearEmojis : customEmojis

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Background grid of ALL emojis from the year */}
      <EmojiGridBackground emojis={backgroundEmojis} opacity={0.15} />

      {/* Additional background effects */}
      <DotPattern
        className="absolute inset-0 opacity-10"
        dotColor="rgba(255, 215, 0, 0.5)"
        dotOpacity={0.3}
        width={28}
        height={28}
        cr={1}
      />
      {!captureMode && (
        <>
          <ShootingStars
            starColor="#FFD700"
            trailColor="#FFA500"
            minSpeed={15}
            maxSpeed={35}
            minDelay={1500}
            maxDelay={4000}
          />
          <ShootingStars
            starColor="#ec4899"
            trailColor="#8b5cf6"
            minSpeed={10}
            maxSpeed={25}
            minDelay={2000}
            maxDelay={5000}
          />
        </>
      )}

      {/* Confetti canvas - only show when not in capture mode */}
      {!captureMode && (
        <Confetti
          ref={confettiRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-50"
          manualstart
        />
      )}

      {/* Consistent header for share images */}
      <SlideHeader year={stats.year} />

      {/* Main content */}
      <motion.div
        initial={captureMode ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10"
      >
        {/* Wrap message */}
        {captureMode ? (
          <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
            That's a Wrap!
          </h2>
        ) : (
          <SparklesText
            className="text-3xl md:text-4xl font-black mb-2"
            colors={{ first: "#FFD700", second: "#FFA500" }}
            sparklesCount={12}
          >
            That's a Wrap!
          </SparklesText>
        )}
        {captureMode ? (
          <p className="text-white/70 text-base">
            {workspaceName} • {stats.year} was *chef's kiss*
          </p>
        ) : (
          <BlurFade delay={0.5} className="text-white/70 text-base">
            {workspaceName} • {stats.year} was{" "}
            <GradientText colors={["#FFD700", "#FFA500", "#ec4899", "#FFD700"]} animationSpeed={4}>
              *chef's kiss*
            </GradientText>
          </BlurFade>
        )}
      </motion.div>

      {/* Quick stats summary */}
      <motion.div
        initial={captureMode ? false : { y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: captureMode ? 0 : 1 }}
        className="relative z-10 mt-8 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-6"
      >
        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">
              {captureMode ? (
                stats.overview.totalEmojis
              ) : (
                <NumberTicker
                  value={stats.overview.totalEmojis}
                  delay={1.2}
                  className="text-3xl font-bold text-white"
                />
              )}
            </div>
            <p className="text-white/50 text-xs">emojis</p>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div className="text-center">
            <div className="text-3xl font-bold text-white">
              {captureMode ? (
                stats.overview.totalCreators
              ) : (
                <NumberTicker
                  value={stats.overview.totalCreators}
                  delay={1.4}
                  className="text-3xl font-bold text-white"
                />
              )}
            </div>
            <p className="text-white/50 text-xs">creators</p>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div className="text-center">
            <div className="text-3xl font-bold text-white">
              {captureMode ? (
                stats.busiestDay.count
              ) : (
                <NumberTicker
                  value={stats.busiestDay.count}
                  delay={1.6}
                  className="text-3xl font-bold text-white"
                />
              )}
            </div>
            <p className="text-white/50 text-xs">best day</p>
          </div>
        </div>

        {/* Top creator highlight */}
        {stats.topCreators[0] && (
          <motion.div
            initial={captureMode ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: captureMode ? 0 : 1.8 }}
            className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-3"
          >
            <span className="text-xl">🏆</span>
            <span className="text-white/80">
              MVP: <span className="font-bold text-white">{stats.topCreators[0].displayName.split(" ")[0]}</span>
            </span>
            {stats.topCreators[0].topEmojis[0] && (
              <img
                src={proxyImageUrl(stats.topCreators[0].topEmojis[0].url)}
                alt="Top emoji"
                className="w-6 h-6 rounded"
              />
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Share CTA */}
      <motion.div
        initial={captureMode ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: captureMode ? 0 : 2 }}
        className="relative z-10 mt-8 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="lg"
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold px-8 shadow-lg shadow-purple-500/30"
          onClick={onShare}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share Your Wrapped
        </Button>
        <p className="text-white/40 text-xs">
          Create a shareable image or video
        </p>
      </motion.div>

      {/* Branding */}
      <motion.div
        initial={captureMode ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: captureMode ? 0 : 2.5 }}
      >
        <SlideBranding />
      </motion.div>
    </div>
  )
}
