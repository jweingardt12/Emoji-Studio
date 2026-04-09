"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import { TopCreator } from "@/lib/services/wrapped-service"
import { proxyImageUrl, EMOJI_PLACEHOLDER, hasValidUrl } from "@/lib/utils/image-proxy"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { EmojiHero } from "../emoji-hero"
import { EmojiSupernova } from "../emoji-supernova"
import { NumberTicker } from "@/components/ui/number-ticker"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { useShouldReduceAnimations, DRAMATIC_PRESETS } from "@/hooks/use-animation-tier"
import { Crown, Medal, Award } from "lucide-react"

interface CreatorsSlideProps {
  topCreators: TopCreator[]
  workspaceName: string
  year: number
  captureMode?: boolean
}

function formatName(name: string): string {
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

interface PodiumSpotProps {
  creator: TopCreator
  rank: 1 | 2 | 3
  captureMode: boolean
  shouldReduceAnimations: boolean
}

function PodiumSpot({ creator, rank, captureMode, shouldReduceAnimations }: PodiumSpotProps) {
  const isWinner = rank === 1
  const delay = rank === 1 ? 0.3 : rank === 2 ? 0.5 : 0.7
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const handleImageError = useCallback((key: string) => {
    setFailedImages((prev) => new Set(prev).add(key))
  }, [])

  // Rank-based styling - responsive heights with better mobile scaling
  const rankStyles = {
    1: {
      height: "h-20 xs:h-24 sm:h-40 md:h-52",
      bg: "bg-linear-to-b from-yellow-500/30 to-yellow-600/10",
      border: "border-yellow-500/50",
      icon: <Crown className="w-4 h-4 xs:w-5 xs:h-5 sm:w-8 sm:h-8 md:w-10 md:h-10 text-yellow-400" />,
      glow: "shadow-[0_0_60px_rgba(234,179,8,0.4)]",
    },
    2: {
      height: "h-14 xs:h-16 sm:h-32 md:h-40",
      bg: "bg-linear-to-b from-gray-400/20 to-gray-500/10",
      border: "border-gray-400/40",
      icon: <Medal className="w-3 h-3 xs:w-4 xs:h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 text-gray-300" />,
      glow: "",
    },
    3: {
      height: "h-10 xs:h-12 sm:h-24 md:h-32",
      bg: "bg-linear-to-b from-amber-600/20 to-amber-700/10",
      border: "border-amber-600/40",
      icon: <Award className="w-3 h-3 xs:w-4 xs:h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 text-amber-500" />,
      glow: "",
    },
  }

  const style = rankStyles[rank]
  const shouldAnimate = !captureMode && !shouldReduceAnimations

  // Filter to emojis with valid URLs
  const validHaloEmojis = creator.topEmojis.slice(1, isWinner ? 5 : 3).filter(emoji => hasValidUrl(emoji))

  // More dramatic rise-up animation - podiums emerge from below
  // Winner has longer travel distance and more bounce
  const riseDistance = isWinner ? 100 : rank === 2 ? 70 : 50

  return (
    <motion.div
      className={`flex flex-col items-center ${isWinner ? "order-2" : rank === 2 ? "order-1" : "order-3"}`}
      initial={shouldAnimate ? { opacity: 0, y: riseDistance, scale: 0.9 } : { opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={shouldAnimate ? {
        delay,
        type: "spring",
        stiffness: isWinner ? 150 : 200,
        damping: isWinner ? 12 : 20,
        mass: isWinner ? 1.2 : 1
      } : { duration: 0 }}
    >
      {/* Emoji halo - creator's top emojis (hidden on very small screens) */}
      <div className="hidden xs:flex justify-center gap-1 xs:gap-1.5 mb-2 xs:mb-3 min-h-[24px] xs:min-h-[32px]">
        {validHaloEmojis.map((emoji, i) => {
          const key = `${creator.userId}-${emoji.name}`
          const hasFailed = failedImages.has(key)
          return (
            <motion.img
              key={key}
              src={hasFailed ? EMOJI_PLACEHOLDER : proxyImageUrl(emoji.url)}
              alt={emoji.name}
              className={`object-contain rounded ${isWinner ? "w-5 h-5 xs:w-5 xs:h-5 sm:w-8 sm:h-8 md:w-10 md:h-10" : "w-4 h-4 xs:w-4 xs:h-4 sm:w-6 sm:h-6 md:w-8 md:h-8"}`}
              initial={shouldAnimate ? { scale: 0, rotate: -20 } : { scale: 1, rotate: 0 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={shouldAnimate ? { delay: delay + 0.1 + i * 0.05 } : { duration: 0 }}
              onError={() => handleImageError(key)}
            />
          )
        })}
      </div>

      {/* Top emoji as avatar - Supernova effect for winner */}
      {creator.topEmojis[0] ? (
        <div className={`relative ${isWinner ? "mb-3 xs:mb-4" : "mb-2 xs:mb-3"}`}>
          {isWinner && !captureMode && !shouldReduceAnimations ? (
            <EmojiSupernova
              emoji={creator.topEmojis[0]}
              trigger={true}
              size="lg"
              glowColor="var(--wrapped-accent-orange)"
              particleCount={6}
            />
          ) : (
            <EmojiHero
              emoji={creator.topEmojis[0]}
              size={isWinner ? "lg" : "md"}
              glow={isWinner ? "orange" : "none"}
              animate={!captureMode}
              captureMode={captureMode}
              delay={delay}
            />
          )}
          {/* Rank badge - touch-friendly sizing */}
          <div
            className={`absolute -top-1 -right-1 xs:-top-1 xs:-right-1 sm:-top-3 sm:-right-3 w-5 h-5 xs:w-6 xs:h-6 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center ${style.bg} border ${style.border} z-20`}
          >
            {style.icon}
          </div>
        </div>
      ) : (
        <div className={`${isWinner ? "w-14 h-14 xs:w-16 xs:h-16 sm:w-28 sm:h-28 md:w-36 md:h-36" : "w-12 h-12 xs:w-14 xs:h-14 sm:w-20 sm:h-20 md:w-24 md:h-24"} rounded-full bg-white/10 flex items-center justify-center mb-2`}>
          {style.icon}
        </div>
      )}

      {/* Creator name */}
      <p className={`font-semibold text-white truncate ${isWinner ? "max-w-[70px] xs:max-w-[90px] sm:max-w-[140px] text-sm xs:text-base sm:text-xl md:text-2xl" : "max-w-[60px] xs:max-w-[70px] sm:max-w-[120px] text-xs xs:text-sm sm:text-lg"}`}>
        {formatName(creator.displayName)}
      </p>

      {/* Emoji count */}
      <div className={`font-mono font-bold ${isWinner ? "text-lg xs:text-xl sm:text-3xl md:text-4xl text-yellow-400" : "text-base xs:text-lg sm:text-2xl text-white/80"}`}>
        {captureMode ? (
          <span>{creator.emojiCount}</span>
        ) : (
          <NumberTicker
            value={creator.emojiCount}
            delay={delay + 0.3}
            className={isWinner ? "text-lg xs:text-xl sm:text-3xl md:text-4xl text-yellow-400" : "text-base xs:text-lg sm:text-2xl text-white/80"}
          />
        )}
      </div>
      <span className="wrapped-label text-[10px] xs:text-xs sm:text-sm">emojis</span>

      {/* Podium base - flex-based width for better mobile scaling */}
      {/* Winner's podium has spotlight glow animation */}
      <motion.div
        className={`mt-2 xs:mt-3 sm:mt-4 w-full max-w-[80px] xs:max-w-[90px] sm:max-w-[144px] md:max-w-[176px] lg:max-w-[208px] ${style.height} ${style.bg} border-t-2 ${style.border} rounded-t-xl ${style.glow}`}
        initial={shouldAnimate && isWinner ? { boxShadow: "0 0 0 rgba(234, 179, 8, 0)" } : false}
        animate={shouldAnimate && isWinner ? {
          boxShadow: [
            "0 0 0 rgba(234, 179, 8, 0)",
            "0 0 60px rgba(234, 179, 8, 0.5)",
            "0 0 40px rgba(234, 179, 8, 0.3)"
          ]
        } : {}}
        transition={{ delay: delay + 0.8, duration: 1.2, ease: "easeOut" }}
      />
    </motion.div>
  )
}

export function CreatorsSlide({
  topCreators,
  workspaceName,
  year,
  captureMode = false,
}: CreatorsSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const shouldReduceAnimations = useShouldReduceAnimations()
  const top3 = topCreators.slice(0, 3)

  // Hydration tracking for WKWebView compatibility
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  const shouldAnimate = hydrated && !captureMode && !shouldReduceAnimations

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Noise texture overlay */}
      <div className="wrapped-noise absolute inset-0 pointer-events-none" />

      {/* Capturable content */}
      <div
        ref={slideRef}
        className={`relative w-full max-w-5xl ${captureMode ? "h-[600px] overflow-hidden" : "h-full max-h-full overflow-y-auto scrollbar-hide"
          }`}
      >
        <div className={`flex flex-col items-center pt-4 pb-4 px-4 sm:px-6 w-full ${captureMode ? "h-full justify-between" : "min-h-full justify-between"}`}>

          {/* Top Section: Header & Title */}
          <div className="w-full flex flex-col items-center shrink-0">
            {/* Consistent header */}
            <div className="mb-2">
              <SlideHeader year={year} />
            </div>

            {/* Title - Centered in upper area */}
            <div className="mt-2 mb-2 text-center">
              {captureMode ? (
                <div>
                  <h2 className="wrapped-headline text-white mb-2 text-4xl sm:text-5xl">The Emoji Architects</h2>
                  <p className="wrapped-body text-lg sm:text-xl">Who built {workspaceName}'s emoji empire?</p>
                </div>
              ) : (
                <BlurFade delay={0.1} shouldAnimate={shouldAnimate}>
                  <h2 className="wrapped-headline mb-2 text-4xl sm:text-5xl md:text-6xl">
                    <GradientText
                      colors={[
                        "var(--wrapped-accent-orange)",
                        "var(--wrapped-accent-purple)",
                        "var(--wrapped-accent-cyan)",
                        "var(--wrapped-accent-orange)",
                      ]}
                      animationSpeed={6}
                    >
                      The Emoji Architects
                    </GradientText>
                  </h2>
                  <p className="wrapped-body text-lg sm:text-xl md:text-2xl">These people decided what feelings look like here.</p>
                </BlurFade>
              )}
            </div>
          </div>

          {/* Middle Section: Podiums */}
          {/* Pushed to bottom of available space, or just flows if scrolling */}
          <div className="flex-1 flex items-end justify-center w-full min-h-0 mt-2 xs:mt-4 sm:mt-8 mb-2 xs:mb-4 sm:mb-8">
            <div className="flex items-end justify-center gap-2 xs:gap-3 sm:gap-4 md:gap-6 lg:gap-8 w-full max-w-4xl px-2 xs:px-3 sm:px-4">
              {top3.map((creator) => (
                <PodiumSpot
                  key={creator.userId}
                  creator={creator}
                  rank={creator.rank as 1 | 2 | 3}
                  captureMode={captureMode}
                  shouldReduceAnimations={shouldReduceAnimations}
                />
              ))}
            </div>
          </div>

          {/* Bottom Section: Callout & Branding */}
          <div className="flex flex-col items-center shrink-0 gap-4 mb-safe">
            {/* Champion callout for #1 */}
            {top3[0] && (
              <motion.div
                initial={captureMode ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: captureMode ? 0 : 1.5 }}
                className="wrapped-pill px-5 py-2 rounded-full"
              >
                <span className="text-white font-medium text-sm text-center block">
                  <span className="font-bold text-(--wrapped-accent-orange)">
                    {formatName(top3[0].displayName)}
                  </span>{" "}
                  created{" "}
                  <span className="font-bold text-(--wrapped-accent-orange)">
                    {top3[0].percentageOfTotal}%
                  </span>{" "}
                  of all emojis
                </span>
              </motion.div>
            )}

            {/* Branding */}
            <SlideBranding />
          </div>
        </div>
      </div>

    </div>
  )
}
