"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import { TopCreator, PersonalWrappedStats } from "@/lib/services/wrapped-service"
import { proxyImageUrl, EMOJI_PLACEHOLDER, hasValidUrl } from "@/lib/utils/image-proxy"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { useShouldReduceAnimations, getStaggerDelay, DRAMATIC_PRESETS } from "@/hooks/use-animation-tier"
import { Trophy } from "lucide-react"

interface LeaderboardSlideProps {
  topCreators: TopCreator[]
  workspaceName: string
  year: number
  personalStats?: PersonalWrappedStats | null
  captureMode?: boolean
}

function formatName(name: string): string {
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

// Medal icons for top 3
const RANK_ICONS: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
}

// Witty callouts based on user's rank
function getRankCallout(rank: number, totalCreators: number): string {
  if (rank === 1) return "You're the emoji monarch. All bow."
  if (rank === 2) return "So close to the throne. We see you."
  if (rank === 3) return "Bronze looks good on you."
  if (rank <= 5) return "Top 5? That's main character energy."
  if (rank <= 10) return "Top 10 club. Exclusive vibes only."
  const percentile = Math.round((rank / totalCreators) * 100)
  if (percentile <= 25) return "Top quarter. Respectable."
  if (percentile <= 50) return "Solid middle ground. Strategic."
  return "Every emoji counts. Keep creating."
}

interface LeaderboardRowProps {
  creator: TopCreator
  index: number
  isCurrentUser: boolean
  captureMode: boolean
  shouldAnimate: boolean
}

function LeaderboardRow({ creator, index, isCurrentUser, captureMode, shouldAnimate }: LeaderboardRowProps) {
  const [imgError, setImgError] = useState(false)
  const delay = getStaggerDelay(index, 0.3, 0.08)

  // Alternating animation direction
  const isFromLeft = index % 2 === 0
  const initialX = isFromLeft ? -50 : 50

  const topEmoji = creator.topEmojis[0]
  const hasEmoji = topEmoji && hasValidUrl(topEmoji)

  return (
    <motion.div
      className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-colors ${
        isCurrentUser
          ? "bg-linear-to-r from-(--wrapped-accent-purple)/20 to-(--wrapped-accent-cyan)/20 border border-(--wrapped-accent-purple)/30"
          : "bg-white/5 hover:bg-white/10"
      }`}
      initial={shouldAnimate ? { x: initialX, opacity: 0, scale: 0.95 } : false}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      transition={shouldAnimate ? {
        delay,
        type: "spring",
        stiffness: 300,
        damping: 25,
      } : { duration: 0 }}
    >
      {/* Rank */}
      <div className="shrink-0 w-8 sm:w-10 text-center">
        {creator.rank <= 3 ? (
          <span className="text-xl sm:text-2xl">{RANK_ICONS[creator.rank]}</span>
        ) : (
          <span className="font-mono text-lg sm:text-xl font-bold text-white/60">
            {creator.rank}
          </span>
        )}
      </div>

      {/* Avatar/Emoji */}
      <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
        {hasEmoji && !imgError ? (
          <img
            src={proxyImageUrl(topEmoji.url)}
            alt=""
            className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-lg sm:text-xl">👤</span>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${
          isCurrentUser ? "text-white" : "text-white/90"
        } ${creator.rank <= 3 ? "text-base sm:text-lg" : "text-sm sm:text-base"}`}>
          {formatName(creator.displayName)}
          {isCurrentUser && (
            <span className="ml-2 text-xs text-(--wrapped-accent-cyan)">(You)</span>
          )}
        </p>
      </div>

      {/* Emoji count */}
      <div className="shrink-0 text-right">
        <span className={`font-mono font-bold ${
          creator.rank === 1
            ? "text-xl sm:text-2xl text-(--wrapped-accent-orange)"
            : creator.rank <= 3
              ? "text-lg sm:text-xl text-white"
              : "text-base sm:text-lg text-white/80"
        }`}>
          {creator.emojiCount}
        </span>
      </div>

      {/* Glow effect for top 3 */}
      {creator.rank <= 3 && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{
            delay: delay + 0.5,
            duration: 1.5,
            repeat: shouldAnimate ? 1 : 0,
          }}
          style={{
            background: creator.rank === 1
              ? "radial-gradient(ellipse at center, rgba(234, 179, 8, 0.3) 0%, transparent 70%)"
              : creator.rank === 2
                ? "radial-gradient(ellipse at center, rgba(192, 192, 192, 0.2) 0%, transparent 70%)"
                : "radial-gradient(ellipse at center, rgba(205, 127, 50, 0.2) 0%, transparent 70%)",
          }}
        />
      )}
    </motion.div>
  )
}

export function LeaderboardSlide({
  topCreators,
  workspaceName,
  year,
  personalStats,
  captureMode = false,
}: LeaderboardSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const shouldReduceAnimations = useShouldReduceAnimations()

  // Hydration tracking for WKWebView compatibility
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  const shouldAnimate = hydrated && !captureMode && !shouldReduceAnimations

  // Get top 10 creators
  const top10 = topCreators.slice(0, 10)

  // Find current user's position
  const currentUserId = personalStats?.userId
  const currentUserRank = personalStats?.rank || 0
  const isUserInTop10 = top10.some(c => c.userId === currentUserId)

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Noise texture overlay */}
      <div className="wrapped-noise absolute inset-0 pointer-events-none" />

      {/* Capturable content */}
      <div
        ref={slideRef}
        className={`relative w-full max-w-2xl ${
          captureMode ? "h-[600px] overflow-hidden" : "h-full max-h-full md:overflow-hidden overflow-y-auto scrollbar-hide"
        }`}
      >
        <div className={`flex flex-col items-center pt-4 pb-4 px-4 sm:px-6 w-full ${
          captureMode ? "h-full justify-between" : "min-h-full justify-between"
        }`}>

          {/* Top Section: Header & Title */}
          <div className="w-full flex flex-col items-center shrink-0">
            <div className="mb-2">
              <SlideHeader year={year} />
            </div>

            <div className="mt-2 mb-4 text-center">
              {captureMode ? (
                <div>
                  <h2 className="wrapped-headline text-white mb-2 text-3xl sm:text-4xl flex items-center justify-center gap-3">
                    <Trophy className="w-8 h-8 text-(--wrapped-accent-orange)" />
                    The Leaderboard
                    <Trophy className="w-8 h-8 text-(--wrapped-accent-orange)" />
                  </h2>
                  <p className="wrapped-body text-base sm:text-lg">Who runs this emoji town?</p>
                </div>
              ) : (
                <BlurFade delay={0.1} shouldAnimate={shouldAnimate}>
                  <h2 className="wrapped-headline mb-2 text-3xl sm:text-4xl md:text-5xl flex items-center justify-center gap-3">
                    <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-(--wrapped-accent-orange)" />
                    <GradientText
                      colors={[
                        "var(--wrapped-accent-orange)",
                        "var(--wrapped-accent-purple)",
                        "var(--wrapped-accent-cyan)",
                        "var(--wrapped-accent-orange)",
                      ]}
                      animationSpeed={6}
                    >
                      The Leaderboard
                    </GradientText>
                    <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-(--wrapped-accent-orange)" />
                  </h2>
                  <p className="wrapped-body text-base sm:text-lg md:text-xl">Who runs this emoji town?</p>
                </BlurFade>
              )}
            </div>
          </div>

          {/* Middle Section: Leaderboard */}
          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-0 my-2">
            <div className="w-full max-w-lg space-y-2 sm:space-y-3">
              {top10.map((creator, index) => (
                <LeaderboardRow
                  key={creator.userId}
                  creator={creator}
                  index={index}
                  isCurrentUser={creator.userId === currentUserId}
                  captureMode={captureMode}
                  shouldAnimate={shouldAnimate}
                />
              ))}
            </div>

            {/* Personal rank callout if not in top 10 */}
            {personalStats && !isUserInTop10 && currentUserRank > 0 && (
              <motion.div
                className="mt-4 sm:mt-6 wrapped-glass-premium rounded-2xl px-5 py-3 sm:px-6 sm:py-4"
                initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: captureMode ? 0 : 1.2 }}
              >
                <p className="text-white font-medium">
                  You're <span className="text-(--wrapped-accent-orange) font-bold">#{currentUserRank}</span> of {personalStats.totalCreators}
                </p>
                <p className="text-sm text-(--wrapped-text-muted) mt-1">
                  {getRankCallout(currentUserRank, personalStats.totalCreators)}
                </p>
              </motion.div>
            )}

            {/* Callout for users in top 10 */}
            {personalStats && isUserInTop10 && (
              <motion.div
                className="mt-4 sm:mt-6 text-center"
                initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: captureMode ? 0 : 1.2 }}
              >
                <p className="text-(--wrapped-accent-cyan) font-medium text-sm sm:text-base">
                  {getRankCallout(currentUserRank, personalStats.totalCreators)}
                </p>
              </motion.div>
            )}
          </div>

          {/* Bottom Section: Branding */}
          <div className="shrink-0 mt-4 mb-safe">
            <SlideBranding />
          </div>
        </div>
      </div>

    </div>
  )
}
