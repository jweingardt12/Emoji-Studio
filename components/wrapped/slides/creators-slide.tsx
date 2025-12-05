"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { TopCreator } from "@/lib/services/wrapped-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { AnimatedList } from "@/components/ui/animated-list"
import { NumberTicker } from "@/components/ui/number-ticker"
import { DotPattern } from "@/components/ui/dot-pattern"
import { ShootingStars } from "@/components/ui/shooting-stars"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"

interface CreatorsSlideProps {
  topCreators: TopCreator[]
  workspaceName: string
  year: number
  captureMode?: boolean
}

const RANK_COLORS = {
  1: { bg: "bg-gradient-to-br from-yellow-400/20 to-amber-600/20", border: "border-yellow-500/50", text: "text-yellow-400" },
  2: { bg: "bg-gradient-to-br from-gray-300/20 to-gray-500/20", border: "border-gray-400/50", text: "text-gray-300" },
  3: { bg: "bg-gradient-to-br from-amber-600/20 to-orange-700/20", border: "border-amber-600/50", text: "text-amber-500" },
}

function formatName(name: string): string {
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

interface CreatorCardProps {
  creator: TopCreator
  captureMode: boolean
}

function CreatorCard({ creator, captureMode }: CreatorCardProps) {
  const rank = creator.rank as 1 | 2 | 3
  const colors = RANK_COLORS[rank] || { bg: "bg-white/10", border: "border-white/20", text: "text-white" }

  return (
    <div
      className={`w-full rounded-xl p-4 ${colors.bg} border ${colors.border} flex items-center gap-4`}
    >
      {/* Rank number */}
      <div className={`text-3xl font-black ${colors.text} w-10 text-center`}>
        #{rank}
      </div>

      {/* Creator's top emoji as avatar - LARGER */}
      <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
        {creator.topEmojis[0] ? (
          <img
            src={proxyImageUrl(creator.topEmojis[0].url)}
            alt={creator.topEmojis[0].name}
            className="w-12 h-12 object-contain"
          />
        ) : (
          <span className="text-2xl">✨</span>
        )}
      </div>

      {/* Creator info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-lg truncate">
          {formatName(creator.displayName)}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {/* Mini emoji samples - LARGER */}
          <div className="flex -space-x-1">
            {creator.topEmojis.slice(1, 5).map((emoji) => (
              <img
                key={emoji.name}
                src={proxyImageUrl(emoji.url)}
                alt={emoji.name}
                className="w-8 h-8 rounded object-contain bg-white/10"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Emoji count with NumberTicker */}
      <div className="text-right">
        <div className="text-2xl font-bold text-white">
          {captureMode ? (
            <span>{creator.emojiCount}</span>
          ) : (
            <NumberTicker
              value={creator.emojiCount}
              delay={0.5 + (creator.rank - 1) * 0.3}
              className="text-2xl font-bold text-white"
            />
          )}
        </div>
        <p className="text-white/50 text-xs">emojis</p>
      </div>
    </div>
  )
}

export function CreatorsSlide({
  topCreators,
  workspaceName,
  year,
  captureMode = false
}: CreatorsSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const top3 = topCreators.slice(0, 3)

  // Collect all top emojis from all creators for the showcase (limit to 8 to prevent overflow)
  const allCreatorEmojis = top3.flatMap(creator => creator.topEmojis).slice(0, 8)

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
      {/* Background effects */}
      <DotPattern
        className="absolute inset-0 opacity-15"
        dotColor="rgba(251, 191, 36, 0.5)"
        dotOpacity={0.4}
        width={24}
        height={24}
        cr={1}
      />
      {!captureMode && (
        <>
          <ShootingStars
            starColor="#fbbf24"
            trailColor="#f59e0b"
            minSpeed={12}
            maxSpeed={28}
            minDelay={2000}
            maxDelay={5000}
          />
          <ShootingStars
            starColor="#d97706"
            trailColor="#fbbf24"
            minSpeed={8}
            maxSpeed={20}
            minDelay={3000}
            maxDelay={6000}
          />
        </>
      )}

      {/* Capturable content - fixed square size for share images, flexible for live view */}
      <div ref={slideRef} className={`relative flex flex-col items-center pt-4 pb-4 px-6 w-[600px] ${captureMode ? 'h-[600px]' : 'h-auto min-h-[600px]'} overflow-hidden`}>
        {/* Consistent header for share images */}
        <SlideHeader year={year} />

        {/* Title with GradientText */}
        {captureMode ? (
          <div className="mb-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
              The Emoji Architects
            </h2>
            <p className="text-white/60 text-sm">
              Who built {workspaceName}'s emoji empire?
            </p>
          </div>
        ) : (
          <BlurFade delay={0.1} className="mb-4">
            <h2 className="text-2xl md:text-3xl font-bold mb-1">
              <GradientText colors={["#fbbf24", "#f59e0b", "#d97706", "#fbbf24"]} animationSpeed={6}>
                The Emoji Architects
              </GradientText>
            </h2>
            <p className="text-white/60 text-sm">
              Who built {workspaceName}'s emoji empire?
            </p>
          </BlurFade>
        )}

        {/* Animated leaderboard */}
        <div className="w-full max-w-md space-y-3">
          {captureMode ? (
            // Static version for capture
            top3.map((creator) => (
              <CreatorCard
                key={creator.userId}
                creator={creator}
                captureMode={captureMode}
              />
            ))
          ) : (
            // Animated version for live experience
            <AnimatedList delay={600} className="w-full gap-3">
              {top3.map((creator) => (
                <CreatorCard
                  key={creator.userId}
                  creator={creator}
                  captureMode={captureMode}
                />
              ))}
            </AnimatedList>
          )}
        </div>

        {/* Champion callout for #1 */}
        {top3[0] && (
          <motion.div
            initial={captureMode ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: captureMode ? 0 : 2.5 }}
            className="mt-4 px-5 py-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40"
          >
            <span className="text-yellow-300 font-medium text-sm">
              <span className="font-bold">{formatName(top3[0].displayName)}</span> created{" "}
              <span className="font-bold">{top3[0].percentageOfTotal}%</span> of all emojis!
            </span>
          </motion.div>
        )}

        {/* Emoji showcase from all creators - LARGER */}
        {allCreatorEmojis.length > 0 && (
          <motion.div
            initial={captureMode ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: captureMode ? 0 : 2.8 }}
            className="mt-4 flex flex-wrap justify-center gap-2 max-w-[400px]"
          >
            {allCreatorEmojis.map((emoji, i) => (
              <motion.img
                key={`${emoji.name}-${i}`}
                src={proxyImageUrl(emoji.url)}
                alt={emoji.name}
                className="w-10 h-10 md:w-12 md:h-12 object-contain rounded-lg shadow-md"
                initial={captureMode ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: captureMode ? 0 : 2.9 + i * 0.05 }}
              />
            ))}
          </motion.div>
        )}

        {/* Branding */}
        <SlideBranding />
      </div>

      {/* Share button - outside capturable area */}
      <SlideShareButton
        slideRef={slideRef}
        slideName="creators"
        workspaceName={workspaceName}
        year={year}
        backgroundColor="#78350f"
      />
    </div>
  )
}
