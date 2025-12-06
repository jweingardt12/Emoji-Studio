"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { TopCreator } from "@/lib/services/wrapped-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { EmojiHero } from "../emoji-hero"
import { NumberTicker } from "@/components/ui/number-ticker"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
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

  // Rank-based styling - reduced heights for better mobile fit
  const rankStyles = {
    1: {
      height: "h-32 sm:h-40 md:h-52",
      bg: "bg-gradient-to-b from-yellow-500/30 to-yellow-600/10",
      border: "border-yellow-500/50",
      icon: <Crown className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-yellow-400" />,
      glow: "shadow-[0_0_60px_rgba(234,179,8,0.4)]",
    },
    2: {
      height: "h-24 sm:h-32 md:h-40",
      bg: "bg-gradient-to-b from-gray-400/20 to-gray-500/10",
      border: "border-gray-400/40",
      icon: <Medal className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-gray-300" />,
      glow: "",
    },
    3: {
      height: "h-20 sm:h-24 md:h-32",
      bg: "bg-gradient-to-b from-amber-600/20 to-amber-700/10",
      border: "border-amber-600/40",
      icon: <Award className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-amber-500" />,
      glow: "",
    },
  }

  const style = rankStyles[rank]
  const shouldAnimate = !captureMode && !shouldReduceAnimations

  return (
    <motion.div
      className={`flex flex-col items-center ${isWinner ? "order-2" : rank === 2 ? "order-1" : "order-3"}`}
      initial={shouldAnimate ? { opacity: 0, y: 30 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 20 }}
    >
      {/* Emoji halo - creator's top emojis */}
      <div className="flex justify-center gap-1.5 mb-3 min-h-[32px]">
        {creator.topEmojis.slice(1, isWinner ? 6 : 4).map((emoji, i) => (
          <motion.img
            key={emoji.name}
            src={proxyImageUrl(emoji.url)}
            alt={emoji.name}
            className={`object-contain rounded ${isWinner ? "w-8 h-8 sm:w-10 sm:h-10" : "w-6 h-6 sm:w-8 sm:h-8"}`}
            initial={shouldAnimate ? { scale: 0, rotate: -20 } : false}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: delay + 0.1 + i * 0.05 }}
          />
        ))}
      </div>

      {/* Top emoji as avatar */}
      {creator.topEmojis[0] ? (
        <div className={`relative ${isWinner ? "mb-4" : "mb-3"}`}>
          <EmojiHero
            emoji={creator.topEmojis[0]}
            size={isWinner ? "lg" : "md"}
            glow={isWinner ? "orange" : "none"}
            animate={!captureMode}
            captureMode={captureMode}
            delay={delay}
          />
          {/* Rank badge */}
          <div
            className={`absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center ${style.bg} border ${style.border}`}
          >
            {style.icon}
          </div>
        </div>
      ) : (
        <div className={`${isWinner ? "w-28 h-28 sm:w-36 sm:h-36" : "w-20 h-20 sm:w-24 sm:h-24"} rounded-full bg-white/10 flex items-center justify-center mb-2`}>
          {style.icon}
        </div>
      )}

      {/* Creator name */}
      <p className={`font-semibold text-white truncate max-w-[140px] ${isWinner ? "text-xl sm:text-2xl" : "text-base sm:text-lg"}`}>
        {formatName(creator.displayName)}
      </p>

      {/* Emoji count */}
      <div className={`font-mono font-bold ${isWinner ? "text-3xl sm:text-4xl text-yellow-400" : "text-xl sm:text-2xl text-white/80"}`}>
        {captureMode ? (
          <span>{creator.emojiCount}</span>
        ) : (
          <NumberTicker
            value={creator.emojiCount}
            delay={delay + 0.3}
            className={isWinner ? "text-3xl sm:text-4xl text-yellow-400" : "text-xl sm:text-2xl text-white/80"}
          />
        )}
      </div>
      <span className="wrapped-label text-sm">emojis</span>

      {/* Podium base */}
      <div
        className={`mt-4 w-28 sm:w-40 md:w-52 ${style.height} ${style.bg} border-t-2 ${style.border} rounded-t-xl ${style.glow}`}
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
          <div className="w-full flex flex-col items-center flex-shrink-0">
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
                <BlurFade delay={0.1}>
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
                  <p className="wrapped-body text-lg sm:text-xl md:text-2xl">Who built {workspaceName}'s emoji empire?</p>
                </BlurFade>
              )}
            </div>
          </div>

          {/* Middle Section: Podiums */}
          {/* Pushed to bottom of available space, or just flows if scrolling */}
          <div className="flex-1 flex items-end justify-center w-full min-h-0 mt-8 mb-8">
            <div className="flex items-end justify-center gap-3 sm:gap-6 md:gap-8 w-full max-w-4xl px-2">
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
          <div className="flex flex-col items-center flex-shrink-0 gap-4 mb-safe">
            {/* Champion callout for #1 */}
            {top3[0] && (
              <motion.div
                initial={captureMode ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: captureMode ? 0 : 1.5 }}
                className="wrapped-pill px-5 py-2 rounded-full"
              >
                <span className="text-white font-medium text-sm text-center block">
                  <span className="font-bold text-[var(--wrapped-accent-orange)]">
                    {formatName(top3[0].displayName)}
                  </span>{" "}
                  created{" "}
                  <span className="font-bold text-[var(--wrapped-accent-orange)]">
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

      {/* Share button */}
      <SlideShareButton
        slideRef={slideRef}
        slideName="creators"
        workspaceName={workspaceName}
        year={year}
        backgroundColor="var(--wrapped-bg-start)"
      />
    </div>
  )
}
