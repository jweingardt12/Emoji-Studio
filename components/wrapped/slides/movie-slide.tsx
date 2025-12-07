"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { WrappedStats, PersonalWrappedStats } from "@/lib/services/wrapped-service"
import { generateMoviePoster, MoviePoster } from "@/lib/services/vibe-generator"
import { proxyImageUrl, EMOJI_PLACEHOLDER, hasValidUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import { Emoji } from "@/lib/services/emoji-service"
import { Star } from "lucide-react"

interface MovieSlideProps {
  stats: WrappedStats
  personalStats: PersonalWrappedStats | null
  workspaceName: string
  year: number
  captureMode?: boolean
  customEmojis?: Emoji[]
}

// VHS color palette
const VHS_COLORS = {
  magenta: "#ff00ff",
  cyan: "#00e5ff",
  yellow: "#ffff00",
  static: "#2a2a2a",
  tapeBrown: "#3d2b1f",
  white: "#ffffff",
  black: "#0a0a0a",
}

// Format date for camcorder timestamp
function formatTimestamp(year: number) {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
  const month = months[Math.floor(Math.random() * 12)]
  const day = Math.floor(Math.random() * 28) + 1
  const hour = Math.floor(Math.random() * 12) + 1
  const minute = Math.floor(Math.random() * 60)
  const ampm = Math.random() > 0.5 ? "PM" : "AM"
  return `${month} ${day} ${year}  ${hour}:${minute.toString().padStart(2, "0")}${ampm}`
}

// VHS Tracking lines overlay
function VHSTrackingLines({ shouldAnimate }: { shouldAnimate: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {shouldAnimate && (
        <>
          <motion.div
            className="absolute left-0 right-0 h-2"
            style={{
              background: `linear-gradient(180deg, transparent, ${VHS_COLORS.white}20, transparent)`,
            }}
            animate={{
              top: ["-10%", "110%"],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 2,
            }}
          />
          <motion.div
            className="absolute left-0 right-0 h-1"
            style={{
              background: `linear-gradient(180deg, transparent, ${VHS_COLORS.white}10, transparent)`,
            }}
            animate={{
              top: ["110%", "-10%"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 4,
            }}
          />
        </>
      )}
    </div>
  )
}

// VHS static noise burst
function StaticBurst({ shouldAnimate }: { shouldAnimate: boolean }) {
  if (!shouldAnimate) return null

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-20"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        mixBlendMode: "overlay",
      }}
      animate={{
        opacity: [0, 0.3, 0, 0, 0],
      }}
      transition={{
        duration: 0.5,
        repeat: Infinity,
        repeatDelay: 5,
      }}
    />
  )
}

// Film strip perforations - reduced count on mobile for performance
function FilmPerforations({ side, reducedCount = false }: { side: "left" | "right"; reducedCount?: boolean }) {
  const count = reducedCount ? 6 : 12

  return (
    <div
      className={`absolute top-0 ${side}-0 w-4 sm:w-5 h-full opacity-30 pointer-events-none hidden xs:block`}
    >
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="w-full h-2 sm:h-3 bg-white rounded-sm mb-4 sm:mb-5"
          style={{ marginTop: i === 0 ? "12px" : undefined }}
        />
      ))}
    </div>
  )
}

// REC indicator
function RecIndicator({ shouldAnimate, captureMode }: { shouldAnimate: boolean; captureMode: boolean }) {
  return (
    <div className="flex items-center gap-2 font-mono text-xs sm:text-sm">
      <motion.div
        className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-600"
        animate={
          shouldAnimate && !captureMode
            ? { opacity: [1, 0.3, 1] }
            : undefined
        }
        transition={{ duration: 1, repeat: Infinity }}
      />
      <span className="text-white font-bold tracking-wider">REC</span>
    </div>
  )
}

// Star rating with VHS style
function VHSStarRating({ rating, captureMode }: { rating: number; captureMode: boolean }) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          initial={captureMode ? false : { opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: captureMode ? 0 : 1.5 + i * 0.1 }}
        >
          <Star
            className={`w-4 h-4 sm:w-5 sm:h-5 ${
              i < fullStars
                ? "fill-yellow-400 text-yellow-400"
                : i === fullStars && hasHalfStar
                  ? "fill-yellow-400/50 text-yellow-400"
                  : "fill-transparent text-white/30"
            }`}
          />
        </motion.div>
      ))}
    </div>
  )
}

// VHS Movie Poster Card
function VHSMoviePosterCard({
  poster,
  castEmojis,
  captureMode,
  shouldAnimate,
  workspaceName,
  timestamp,
}: {
  poster: MoviePoster
  castEmojis: Emoji[]
  captureMode: boolean
  shouldAnimate: boolean
  workspaceName: string
  timestamp: string
}) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const handleImageError = (key: string) => {
    setFailedImages((prev) => new Set(prev).add(key))
  }

  return (
    <motion.div
      initial={captureMode ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: captureMode ? 0 : 0.3, duration: 0.5 }}
      className="relative w-full max-w-xs sm:max-w-sm rounded-none overflow-hidden aspect-[3/4] sm:aspect-[2/3]"
      style={{
        background: `linear-gradient(180deg, ${VHS_COLORS.black} 0%, #1a1a2e 50%, ${VHS_COLORS.black} 100%)`,
        boxShadow: "0 0 40px rgba(0,0,0,0.8)",
      }}
    >
      {/* VHS tracking overlay */}
      <VHSTrackingLines shouldAnimate={shouldAnimate} />
      <StaticBurst shouldAnimate={shouldAnimate} />

      {/* Film perforations */}
      <FilmPerforations side="left" />
      <FilmPerforations side="right" />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-20"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 1px,
            rgba(0, 0, 0, 0.3) 1px,
            rgba(0, 0, 0, 0.3) 2px
          )`,
        }}
      />

      {/* Chromatic aberration on edges */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          boxShadow: `
            inset 3px 0 10px ${VHS_COLORS.cyan}40,
            inset -3px 0 10px ${VHS_COLORS.magenta}40
          `,
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-between p-4 sm:p-6">
        {/* Top bar: REC indicator and timestamp */}
        <div className="w-full flex justify-between items-start">
          <RecIndicator shouldAnimate={shouldAnimate} captureMode={captureMode} />
          <motion.span
            className="font-mono text-[10px] sm:text-xs text-white/70"
            initial={captureMode ? false : { opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: captureMode ? 0 : 0.5 }}
          >
            {timestamp}
          </motion.span>
        </div>

        {/* Middle: Title and content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 sm:gap-4 w-full py-4">
          {/* Genre tag */}
          <motion.div
            initial={captureMode ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: captureMode ? 0 : 0.6 }}
            className="px-3 py-1 border border-white/30"
          >
            <span className="text-[10px] sm:text-xs uppercase tracking-widest text-white/70 font-mono">
              {poster.genre}
            </span>
          </motion.div>

          {/* Cast row (emojis) */}
          {castEmojis.length > 0 && (
            <motion.div
              initial={captureMode ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: captureMode ? 0 : 0.7 }}
              className="flex items-center justify-center gap-2 sm:gap-3"
            >
              {castEmojis.map((emoji, i) => {
                const key = `movie-${emoji.name}`
                const hasFailed = failedImages.has(key)
                const imgSrc = hasFailed ? EMOJI_PLACEHOLDER : proxyImageUrl(emoji.url)
                return (
                  <motion.div
                    key={key}
                    className="relative"
                    initial={captureMode ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: captureMode ? 0 : 0.8 + i * 0.1 }}
                  >
                    {/* Chromatic aberration on emoji - desktop only for performance */}
                    {shouldAnimate && !hasFailed && (
                      <>
                        <img
                          src={imgSrc}
                          alt=""
                          className="absolute w-8 h-8 sm:w-10 sm:h-10 object-contain opacity-30 hidden sm:block"
                          style={{ transform: "translateX(-2px)", filter: "hue-rotate(90deg)" }}
                        />
                        <img
                          src={imgSrc}
                          alt=""
                          className="absolute w-8 h-8 sm:w-10 sm:h-10 object-contain opacity-30 hidden sm:block"
                          style={{ transform: "translateX(2px)", filter: "hue-rotate(-90deg)" }}
                        />
                      </>
                    )}
                    <img
                      src={imgSrc}
                      alt=""
                      className="relative w-8 h-8 sm:w-10 sm:h-10 object-contain"
                      onError={() => handleImageError(key)}
                    />
                  </motion.div>
                )
              })}
            </motion.div>
          )}

          {/* Title with VHS distortion */}
          <motion.div
            initial={captureMode ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: captureMode ? 0 : 1, type: "spring", stiffness: 100 }}
            className="relative"
          >
            {/* Chromatic aberration on title */}
            {shouldAnimate && !captureMode && (
              <>
                <h3
                  className="absolute inset-0 text-xl sm:text-2xl md:text-3xl font-black text-center tracking-tight leading-tight px-4 line-clamp-3"
                  style={{
                    color: VHS_COLORS.cyan,
                    transform: "translateX(-1px)",
                    opacity: 0.5,
                  }}
                >
                  {poster.title}
                </h3>
                <h3
                  className="absolute inset-0 text-xl sm:text-2xl md:text-3xl font-black text-center tracking-tight leading-tight px-4 line-clamp-3"
                  style={{
                    color: VHS_COLORS.magenta,
                    transform: "translateX(1px)",
                    opacity: 0.5,
                  }}
                >
                  {poster.title}
                </h3>
              </>
            )}
            <h3
              className="relative text-xl sm:text-2xl md:text-3xl font-black text-white text-center tracking-tight leading-tight px-4 line-clamp-3"
              style={{
                textShadow: "0 2px 10px rgba(0,0,0,0.8)",
              }}
            >
              {poster.title}
            </h3>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={captureMode ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: captureMode ? 0 : 1.3 }}
            className="text-xs sm:text-sm text-white/60 italic text-center max-w-xs font-mono"
          >
            "{poster.tagline}"
          </motion.p>
        </div>

        {/* Bottom: Rating and meta */}
        <div className="w-full flex flex-col items-center gap-2 sm:gap-3">
          <VHSStarRating rating={poster.rating} captureMode={captureMode} />

          <motion.div
            initial={captureMode ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: captureMode ? 0 : 2 }}
            className="flex items-center gap-3 sm:gap-4 text-white/50 text-[10px] sm:text-xs font-mono"
          >
            <span>{poster.runtime} emojis</span>
            <span>|</span>
            <span>{poster.year}</span>
          </motion.div>

          {/* Now Playing bar */}
          <motion.div
            initial={captureMode ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: captureMode ? 0 : 2.2 }}
            className="w-full py-2 border-t border-white/20 mt-2"
          >
            <p className="text-[10px] sm:text-xs uppercase tracking-widest text-center font-mono"
              style={{ color: VHS_COLORS.cyan }}
            >
              Now Playing in {workspaceName}
            </p>
          </motion.div>
        </div>
      </div>

      {/* VHS tracking bar at bottom */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-4 sm:h-6 z-20"
        style={{
          background: `linear-gradient(90deg, ${VHS_COLORS.black}, ${VHS_COLORS.static}, ${VHS_COLORS.black})`,
        }}
        initial={captureMode ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: captureMode ? 0 : 0.4 }}
      >
        <div className="h-full flex items-center justify-center">
          <div className="flex gap-1">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 sm:w-2 h-2 bg-white/30"
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function MovieSlide({
  stats,
  personalStats,
  workspaceName,
  year,
  captureMode = false,
  customEmojis = [],
}: MovieSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const shouldReduceAnimations = useShouldReduceAnimations()

  // Hydration tracking for WKWebView compatibility
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  const shouldAnimate = hydrated && !captureMode && !shouldReduceAnimations

  // Generate movie poster
  const moviePoster = useMemo(
    () => generateMoviePoster(stats, stats.funStats.topWords, personalStats),
    [stats, personalStats]
  )

  // Get cast emojis - filter to valid URLs
  const castEmojis = customEmojis.slice(0, 5).filter(emoji => hasValidUrl(emoji))

  // Generate timestamp
  const timestamp = useMemo(() => formatTimestamp(year), [year])

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden"
      style={{ backgroundColor: VHS_COLORS.black }}
    >
      {/* VHS static background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Capturable content */}
      <div
        ref={slideRef}
        className={`relative w-full max-w-2xl md:max-w-4xl ${
          captureMode ? "h-[600px] overflow-hidden" : "h-full max-h-full overflow-y-auto scrollbar-hide"
        }`}
      >
        <div
          className={`flex flex-col items-center pt-4 pb-4 px-4 sm:px-6 w-full ${
            captureMode ? "h-full justify-between" : "min-h-full justify-between"
          }`}
        >
          {/* Top Section: Title */}
          <div className="w-full flex flex-col items-center flex-shrink-0">
            <motion.div
              className="mb-4"
              initial={captureMode ? false : { opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: captureMode ? 0 : 0.1 }}
            >
              <h2
                className="font-mono font-black uppercase tracking-wider text-xl sm:text-2xl md:text-3xl"
                style={{
                  color: VHS_COLORS.white,
                  textShadow: `
                    2px 0 ${VHS_COLORS.magenta}80,
                    -2px 0 ${VHS_COLORS.cyan}80
                  `,
                }}
              >
                Your Emojis: The Movie
              </h2>
            </motion.div>
          </div>

          {/* Middle Section: Movie Poster */}
          <div className="flex-1 flex items-center justify-center w-full py-4">
            <VHSMoviePosterCard
              poster={moviePoster}
              castEmojis={castEmojis}
              captureMode={captureMode}
              shouldAnimate={shouldAnimate}
              workspaceName={workspaceName}
              timestamp={timestamp}
            />
          </div>

          {/* Bottom Section: Branding */}
          <div className="flex-shrink-0 mb-safe">
            <SlideBranding />
          </div>
        </div>
      </div>

      {/* Share button */}
      <SlideShareButton
        slideRef={slideRef}
        slideName="movie"
        workspaceName={workspaceName}
        year={year}
        backgroundColor={VHS_COLORS.black}
      />
    </div>
  )
}
