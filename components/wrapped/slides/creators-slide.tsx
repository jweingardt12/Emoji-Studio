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

  // Rank-based styling
  const rankStyles = {
    1: {
      height: "h-32",
      bg: "bg-gradient-to-b from-yellow-500/30 to-yellow-600/10",
      border: "border-yellow-500/50",
      icon: <Crown className="w-6 h-6 text-yellow-400" />,
      glow: "shadow-[0_0_40px_rgba(234,179,8,0.3)]",
    },
    2: {
      height: "h-24",
      bg: "bg-gradient-to-b from-gray-400/20 to-gray-500/10",
      border: "border-gray-400/40",
      icon: <Medal className="w-5 h-5 text-gray-300" />,
      glow: "",
    },
    3: {
      height: "h-20",
      bg: "bg-gradient-to-b from-amber-600/20 to-amber-700/10",
      border: "border-amber-600/40",
      icon: <Award className="w-5 h-5 text-amber-500" />,
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
      <div className="flex justify-center gap-1 mb-2 min-h-[28px]">
        {creator.topEmojis.slice(1, isWinner ? 6 : 4).map((emoji, i) => (
          <motion.img
            key={emoji.name}
            src={proxyImageUrl(emoji.url)}
            alt={emoji.name}
            className={`object-contain rounded ${isWinner ? "w-7 h-7" : "w-5 h-5"}`}
            initial={shouldAnimate ? { scale: 0, rotate: -20 } : false}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: delay + 0.1 + i * 0.05 }}
          />
        ))}
      </div>

      {/* Top emoji as avatar */}
      {creator.topEmojis[0] ? (
        <div className={`relative ${isWinner ? "mb-3" : "mb-2"}`}>
          <EmojiHero
            emoji={creator.topEmojis[0]}
            size={isWinner ? "md" : "sm"}
            glow={isWinner ? "orange" : "none"}
            animate={!captureMode}
            captureMode={captureMode}
            delay={delay}
          />
          {/* Rank badge */}
          <div
            className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center ${style.bg} border ${style.border}`}
          >
            {style.icon}
          </div>
        </div>
      ) : (
        <div className={`${isWinner ? "w-24 h-24" : "w-16 h-16"} rounded-full bg-white/10 flex items-center justify-center mb-2`}>
          {style.icon}
        </div>
      )}

      {/* Creator name */}
      <p className={`font-semibold text-white truncate max-w-[100px] ${isWinner ? "text-lg" : "text-sm"}`}>
        {formatName(creator.displayName)}
      </p>

      {/* Emoji count */}
      <div className={`font-mono font-bold ${isWinner ? "text-2xl text-yellow-400" : "text-lg text-white/80"}`}>
        {captureMode ? (
          <span>{creator.emojiCount}</span>
        ) : (
          <NumberTicker
            value={creator.emojiCount}
            delay={delay + 0.3}
            className={isWinner ? "text-2xl text-yellow-400" : "text-lg text-white/80"}
          />
        )}
      </div>
      <span className="wrapped-label text-xs">emojis</span>

      {/* Podium base */}
      <div
        className={`mt-3 w-24 ${style.height} ${style.bg} border-t-2 ${style.border} rounded-t-lg ${style.glow}`}
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
        className={`relative flex flex-col items-center pt-4 pb-4 px-4 sm:px-6 w-full max-w-[600px] ${
          captureMode ? "h-[600px]" : "h-auto min-h-[500px] sm:min-h-[600px]"
        } overflow-hidden`}
      >
        {/* Consistent header */}
        <SlideHeader year={year} />

        {/* Title */}
        {captureMode ? (
          <div className="mb-6">
            <h2 className="wrapped-headline text-white mb-1">The Emoji Architects</h2>
            <p className="wrapped-body">Who built {workspaceName}'s emoji empire?</p>
          </div>
        ) : (
          <BlurFade delay={0.1} className="mb-6">
            <h2 className="wrapped-headline mb-1">
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
            <p className="wrapped-body">Who built {workspaceName}'s emoji empire?</p>
          </BlurFade>
        )}

        {/* Podium layout */}
        <div className="flex-1 flex items-end justify-center w-full">
          <div className="flex items-end justify-center gap-4 sm:gap-6">
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

        {/* Champion callout for #1 */}
        {top3[0] && (
          <motion.div
            initial={captureMode ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: captureMode ? 0 : 1.5 }}
            className="mt-6 wrapped-pill px-5 py-2 rounded-full"
          >
            <span className="text-white font-medium text-sm">
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
