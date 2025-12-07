"use client"

import { motion } from "framer-motion"
import { WrappedStats } from "@/lib/services/wrapped-service"
import { Emoji } from "@/lib/services/emoji-service"
import { Button } from "@/components/ui/button"
import { Share2, Trophy, Users, Zap } from "lucide-react"
import { proxyImageUrl, EMOJI_PLACEHOLDER, hasValidUrl } from "@/lib/utils/image-proxy"
import { useEffect, useRef, useState } from "react"
import { Confetti, ConfettiRef } from "@/components/ui/confetti"
import { SparklesText } from "@/components/ui/sparkles-text"
import { NumberTicker } from "@/components/ui/number-ticker"
import { SlideHeader } from "../slide-header"
import { SlideBranding } from "../slide-branding"
import { FloatingEmojisBackground } from "../floating-emojis-background"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"

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
  const shouldReduceAnimations = useShouldReduceAnimations()
  const [mvpEmojiError, setMvpEmojiError] = useState(false)

  // Hydration tracking for WKWebView compatibility
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  const shouldAnimate = hydrated && !captureMode && !shouldReduceAnimations

  // Auto-trigger confetti on mount
  useEffect(() => {
    if (captureMode || shouldReduceAnimations) return

    // Initial burst
    const timer1 = setTimeout(() => {
      confettiRef.current?.fire({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7, x: 0.3 },
        colors: ["#a855f7", "#f97316", "#22d3ee"],
      })
    }, 300)

    const timer2 = setTimeout(() => {
      confettiRef.current?.fire({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7, x: 0.7 },
        colors: ["#a855f7", "#f97316", "#22d3ee"],
      })
    }, 500)

    // Celebratory burst
    const timer3 = setTimeout(() => {
      confettiRef.current?.fire({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.5 },
        colors: ["#a855f7", "#f97316", "#22d3ee", "#fbbf24"],
      })
    }, 800)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [captureMode, shouldReduceAnimations])

  // Use all year emojis for background
  const backgroundEmojis = allYearEmojis.length > 0 ? allYearEmojis : customEmojis

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Background floating emojis */}
      <FloatingEmojisBackground emojis={backgroundEmojis} opacity={0.2} />

      {/* Noise texture overlay */}
      <div className="wrapped-noise absolute inset-0 pointer-events-none" />

      {/* Confetti canvas */}
      {!captureMode && (
        <Confetti
          ref={confettiRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-50"
          manualstart
        />
      )}

      {/* Content container - scrollable only on mobile if needed */}
      <div
        className={`relative z-10 w-full max-w-4xl flex flex-col items-center ${captureMode ? "h-[600px] justify-center" : "h-full max-h-full md:overflow-hidden overflow-y-auto scrollbar-hide py-4"}`}
      >
        {/* Consistent header within scroll flow */}
        <div className="flex-shrink-0 mb-4">
          <SlideHeader year={stats.year} />
        </div>

        {/* Main Title content */}
        <motion.div
          initial={captureMode ? false : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative z-10 flex-shrink-0 mt-4"
        >
          {/* Wrap message */}
          {captureMode ? (
            <h2 className="wrapped-hero-number text-5xl sm:text-6xl md:text-7xl lg:text-8xl mb-4">
              That's a Wrap!
            </h2>
          ) : (
            <SparklesText
              className="wrapped-hero-number text-5xl sm:text-6xl md:text-7xl lg:text-8xl mb-4"
              colors={{ first: "var(--wrapped-accent-orange)", second: "var(--wrapped-accent-purple)" }}
              sparklesCount={shouldReduceAnimations ? 0 : 12}
            >
              That's a Wrap!
            </SparklesText>
          )}
          {captureMode ? (
            <p className="wrapped-body max-w-md mx-auto px-4">
              You made it. The emojis are proud. Probably.
            </p>
          ) : (
            <BlurFade delay={0.5} shouldAnimate={shouldAnimate} className="wrapped-body max-w-md mx-auto px-4">
              You made it. The emojis are{" "}
              <GradientText
                colors={[
                  "var(--wrapped-accent-orange)",
                  "var(--wrapped-accent-purple)",
                  "var(--wrapped-accent-cyan)",
                  "var(--wrapped-accent-orange)",
                ]}
                animationSpeed={4}
              >
                proud
              </GradientText>
              . Probably.
            </BlurFade>
          )}
        </motion.div>

        {/* Quick stats summary */}
        <div className="w-full flex-1 flex flex-col items-center justify-center min-h-0">


          {/* Quick stats summary - Premium Glass */}
          <motion.div
            initial={captureMode ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: captureMode ? 0 : 1 }}
            className="relative z-10 mt-4 sm:mt-6 rounded-3xl wrapped-glass-premium border border-white/20 p-5 sm:p-6 w-full max-w-2xl overflow-hidden"
          >
            {/* Subtle gradient glow behind stats */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--wrapped-accent-purple)]/10 via-transparent to-[var(--wrapped-accent-cyan)]/10 pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 sm:gap-8">
              <div className="text-center group">
                <div className="flex items-center justify-center gap-2 mb-2 group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--wrapped-accent-cyan)]" />
                </div>
                <div className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                  {captureMode ? (
                    stats.overview.totalEmojis
                  ) : (
                    <NumberTicker
                      value={stats.overview.totalEmojis}
                      delay={1.2}
                      className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tighter"
                    />
                  )}
                </div>
                <p className="text-[var(--wrapped-text-muted)] text-sm sm:text-base uppercase tracking-wider mt-1">emojis</p>
              </div>
              <div className="hidden sm:block w-px h-16 bg-white/10" />
              <div className="text-center group">
                <div className="flex items-center justify-center gap-2 mb-2 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--wrapped-accent-purple)]" />
                </div>
                <div className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                  {captureMode ? (
                    stats.overview.totalCreators
                  ) : (
                    <NumberTicker
                      value={stats.overview.totalCreators}
                      delay={1.4}
                      className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tighter"
                    />
                  )}
                </div>
                <p className="text-[var(--wrapped-text-muted)] text-sm sm:text-base uppercase tracking-wider mt-1">creators</p>
              </div>
              <div className="hidden sm:block w-px h-16 bg-white/10" />
              <div className="text-center group">
                <div className="flex items-center justify-center gap-2 mb-2 group-hover:scale-110 transition-transform">
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--wrapped-accent-orange)]" />
                </div>
                <div className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                  {captureMode ? (
                    stats.busiestDay.count
                  ) : (
                    <NumberTicker
                      value={stats.busiestDay.count}
                      delay={1.6}
                      className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tighter"
                    />
                  )}
                </div>
                <p className="text-[var(--wrapped-text-muted)] text-sm sm:text-base uppercase tracking-wider mt-1">best day</p>
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
                <span className="text-[var(--wrapped-text-secondary)]">
                  MVP:{" "}
                  <span className="font-bold text-white">
                    {stats.topCreators[0].displayName.split(" ")[0]}
                  </span>
                </span>
                {stats.topCreators[0].topEmojis[0] && hasValidUrl(stats.topCreators[0].topEmojis[0]) && (
                  <img
                    src={mvpEmojiError ? EMOJI_PLACEHOLDER : proxyImageUrl(stats.topCreators[0].topEmojis[0].url)}
                    alt="Top emoji"
                    className="w-7 h-7 rounded-lg shadow-lg object-contain"
                    onError={() => setMvpEmojiError(true)}
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
            className="relative z-10 mt-6 mb-4 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-[var(--wrapped-accent-purple)] to-[var(--wrapped-accent-orange)] hover:from-[var(--wrapped-accent-purple)]/90 hover:to-[var(--wrapped-accent-orange)]/90 text-white font-bold px-8 shadow-lg shadow-purple-500/30 transition-all hover:scale-105"
              onClick={onShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Your Wrapped
            </Button>
            <p className="text-[var(--wrapped-text-muted)] text-xs">
              Create a shareable image or video
            </p>
          </motion.div>

        </div> {/* End of flex-1 container */}

      </div> {/* End of main scrollable container */}

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
