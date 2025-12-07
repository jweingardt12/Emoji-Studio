"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { WrappedStats, PersonalWrappedStats } from "@/lib/services/wrapped-service"
import { generateHaiku, Haiku } from "@/lib/services/vibe-generator"
import { proxyImageUrl, EMOJI_PLACEHOLDER, hasValidUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import { Emoji } from "@/lib/services/emoji-service"

interface HaikuSlideProps {
  stats: WrappedStats
  personalStats: PersonalWrappedStats | null
  workspaceName: string
  year: number
  captureMode?: boolean
  customEmojis?: Emoji[]
}

// Wabi-Sabi color palette
const COLORS = {
  sumiBlack: "#1a1a1a",
  washiCream: "#f5f0e8",
  akaRed: "#8b0000",
  stoneGray: "#6b6b6b",
  mossGreen: "#4a5d23",
  inkBrown: "#3d2b1f",
}

// Hanko (seal) stamp component
function HankoSeal({ size = "medium" }: { size?: "small" | "medium" | "large" }) {
  const sizeClasses = {
    small: "w-10 h-10 sm:w-12 sm:h-12",
    medium: "w-14 h-14 sm:w-16 sm:h-16",
    large: "w-18 h-18 sm:w-20 sm:h-20",
  }

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      {/* Outer circle with worn effect */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: COLORS.akaRed,
          opacity: 0.85,
        }}
      />
      {/* Inner content area */}
      <div
        className="absolute inset-1 rounded-full flex items-center justify-center"
        style={{
          border: `2px solid ${COLORS.washiCream}`,
          opacity: 0.9,
        }}
      >
        <span
          className="text-xs sm:text-sm font-serif font-bold"
          style={{ color: COLORS.washiCream }}
        >
          詩
        </span>
      </div>
      {/* Weathered texture overlay */}
      <div
        className="absolute inset-0 rounded-full opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}

// Ink splatter decoration
function InkSplatter({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="20" fill={COLORS.sumiBlack} opacity="0.6" />
      <circle cx="35" cy="40" r="8" fill={COLORS.sumiBlack} opacity="0.4" />
      <circle cx="65" cy="35" r="5" fill={COLORS.sumiBlack} opacity="0.3" />
      <circle cx="70" cy="60" r="6" fill={COLORS.sumiBlack} opacity="0.35" />
      <circle cx="30" cy="65" r="4" fill={COLORS.sumiBlack} opacity="0.25" />
    </svg>
  )
}

// Brush stroke divider
function BrushStrokeDivider() {
  return (
    <svg
      className="w-32 sm:w-40 h-2"
      viewBox="0 0 160 8"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 4 Q40 1, 80 4 T160 4"
        stroke={COLORS.sumiBlack}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  )
}

// Haiku line with brush stroke animation
function HaikuLine({
  line,
  syllables,
  index,
  captureMode,
  shouldAnimate,
  baseDelay,
}: {
  line: string
  syllables: number
  index: number
  captureMode: boolean
  shouldAnimate: boolean
  baseDelay: number
}) {
  const isMiddleLine = index === 1

  return (
    <motion.div
      className="relative flex items-center justify-center gap-4"
      initial={captureMode ? false : { opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: captureMode ? 0 : baseDelay + index * 0.6,
        duration: 0.8,
        ease: "easeOut",
      }}
    >
      {/* Vertical brush stroke accent */}
      {index === 0 && (
        <motion.div
          className="absolute -left-6 sm:-left-8 top-0 bottom-0 w-0.5"
          style={{ backgroundColor: COLORS.akaRed }}
          initial={captureMode ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: captureMode ? 0 : baseDelay + 0.3, duration: 0.5 }}
        />
      )}

      <p
        className={`font-serif tracking-wide leading-relaxed ${
          isMiddleLine
            ? "text-2xl sm:text-3xl md:text-4xl font-medium"
            : "text-xl sm:text-2xl md:text-3xl"
        }`}
        style={{
          color: COLORS.sumiBlack,
          textShadow: "1px 1px 2px rgba(0,0,0,0.1)",
        }}
      >
        {line}
      </p>

      {/* Syllable count - hidden on mobile */}
      <motion.span
        className="hidden sm:block absolute -right-12 top-1/2 -translate-y-1/2 text-xs font-mono"
        style={{ color: COLORS.stoneGray }}
        initial={captureMode ? false : { opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: captureMode ? 0 : baseDelay + index * 0.6 + 0.4 }}
      >
        ({syllables})
      </motion.span>
    </motion.div>
  )
}

export function HaikuSlide({
  stats,
  personalStats,
  workspaceName,
  year,
  captureMode = false,
  customEmojis = [],
}: HaikuSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const shouldReduceAnimations = useShouldReduceAnimations()

  // Hydration tracking for WKWebView compatibility
  const [hydrated, setHydrated] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  useEffect(() => {
    setHydrated(true)
  }, [])
  const shouldAnimate = hydrated && !captureMode && !shouldReduceAnimations

  const handleImageError = (key: string) => {
    setFailedImages((prev) => new Set(prev).add(key))
  }

  // Generate haikus
  const workspaceHaiku = useMemo(
    () => generateHaiku(stats.funStats.topWords),
    [stats.funStats.topWords]
  )

  const personalHaiku = useMemo(
    () =>
      personalStats?.topWords?.length
        ? generateHaiku(personalStats.topWords)
        : null,
    [personalStats?.topWords]
  )

  // Get stamp emojis (3 for decoration) - filter to valid URLs
  const stampEmojis = customEmojis.slice(0, 3).filter(emoji => hasValidUrl(emoji))

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden"
      style={{ backgroundColor: COLORS.washiCream }}
    >
      {/* Washi paper texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='5' stitchTiles='stitch'/%3E%3CfeDiffuseLighting in='noise' lighting-color='%23f5f0e8' surfaceScale='2'%3E%3CfeDistantLight azimuth='45' elevation='60'/%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Subtle fold/crease lines */}
      <div
        className="absolute top-0 left-1/3 bottom-0 w-px opacity-10"
        style={{ backgroundColor: COLORS.inkBrown }}
      />
      <div
        className="absolute top-0 right-1/3 bottom-0 w-px opacity-10"
        style={{ backgroundColor: COLORS.inkBrown }}
      />

      {/* Ink splatter decorations */}
      <motion.div
        className="absolute top-8 left-8 w-16 h-16 sm:w-20 sm:h-20 opacity-20"
        initial={captureMode ? false : { opacity: 0, scale: 0 }}
        animate={{ opacity: 0.2, scale: 1 }}
        transition={{ delay: captureMode ? 0 : 2.5 }}
      >
        <InkSplatter />
      </motion.div>
      <motion.div
        className="absolute bottom-16 right-8 w-12 h-12 sm:w-16 sm:h-16 opacity-15"
        initial={captureMode ? false : { opacity: 0, scale: 0 }}
        animate={{ opacity: 0.15, scale: 1 }}
        transition={{ delay: captureMode ? 0 : 2.8 }}
      >
        <InkSplatter />
      </motion.div>

      {/* Capturable content */}
      <div
        ref={slideRef}
        className={`relative w-full max-w-2xl md:max-w-3xl ${
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
              className="mb-4 sm:mb-6"
              initial={captureMode ? false : { opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: captureMode ? 0 : 0.2 }}
            >
              <h2
                className="font-serif text-3xl sm:text-4xl md:text-5xl font-light tracking-wide mb-2"
                style={{ color: COLORS.sumiBlack }}
              >
                Your Year in 17 Syllables
              </h2>
              <p
                className="font-serif text-sm sm:text-base italic"
                style={{ color: COLORS.stoneGray }}
              >
                "We asked an AI. It said no. So we made this ourselves."
              </p>
            </motion.div>

            <BrushStrokeDivider />
          </div>

          {/* Middle Section: Haiku with Decorations */}
          <div className="flex-1 flex items-center justify-center w-full py-6 sm:py-8">
            <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
              {/* Hanko seal - left side on desktop */}
              <motion.div
                className="hidden md:block"
                initial={captureMode ? false : { opacity: 0, rotate: -30, scale: 0 }}
                animate={{ opacity: 1, rotate: -8, scale: 1 }}
                transition={{ delay: captureMode ? 0 : 2, type: "spring" }}
              >
                <HankoSeal size="large" />
              </motion.div>

              {/* Main haiku content */}
              <div className="flex flex-col items-center gap-6 sm:gap-8">
                {/* Scroll/paper container */}
                <motion.div
                  initial={captureMode ? false : { opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: captureMode ? 0 : 0.3, duration: 0.5 }}
                  className="relative rounded-none p-8 sm:p-10 md:p-12"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.6)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    border: `1px solid ${COLORS.inkBrown}20`,
                  }}
                >
                  {/* Label if showing personal */}
                  {personalHaiku && (
                    <motion.span
                      initial={captureMode ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: captureMode ? 0 : 0.4 }}
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 font-serif text-xs uppercase tracking-wider"
                      style={{
                        backgroundColor: COLORS.washiCream,
                        color: COLORS.akaRed,
                        border: `1px solid ${COLORS.akaRed}40`,
                      }}
                    >
                      Your Haiku
                    </motion.span>
                  )}

                  {/* Haiku lines */}
                  <div className="flex flex-col items-center gap-4 sm:gap-6">
                    {(personalHaiku || workspaceHaiku).lines.map((line, i) => (
                      <HaikuLine
                        key={i}
                        line={line}
                        syllables={(personalHaiku || workspaceHaiku).syllables[i]}
                        index={i}
                        captureMode={captureMode}
                        shouldAnimate={shouldAnimate}
                        baseDelay={0.5}
                      />
                    ))}
                  </div>
                </motion.div>

                {/* Workspace haiku (smaller) if personal exists */}
                {personalHaiku && (
                  <motion.div
                    initial={captureMode ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: captureMode ? 0 : 2.5 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <span
                      className="text-xs font-serif"
                      style={{ color: COLORS.stoneGray }}
                    >
                      {workspaceName}'s haiku:
                    </span>
                    <div
                      className="p-4 sm:p-6 opacity-70"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.4)",
                        border: `1px solid ${COLORS.inkBrown}10`,
                      }}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {workspaceHaiku.lines.map((line, i) => (
                          <p
                            key={i}
                            className="font-serif text-sm sm:text-base"
                            style={{ color: COLORS.sumiBlack }}
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Stamp emojis - mobile (bottom) and decorative elements */}
              {stampEmojis.length > 0 && (
                <>
                  {/* Desktop - right side */}
                  <div className="hidden md:flex flex-col gap-4 items-center">
                    {stampEmojis.map((emoji, i) => {
                      const key = `haiku-${emoji.name}`
                      const hasFailed = failedImages.has(key)
                      return (
                        <motion.div
                          key={key}
                          initial={captureMode ? false : { opacity: 0, rotate: 20, scale: 0 }}
                          animate={{ opacity: 0.8, rotate: 5 - i * 5, scale: 1 }}
                          transition={{ delay: captureMode ? 0 : 2.2 + i * 0.15 }}
                          className="relative"
                        >
                          <img
                            src={hasFailed ? EMOJI_PLACEHOLDER : proxyImageUrl(emoji.url)}
                            alt=""
                            className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                            style={{
                              filter: "sepia(30%) saturate(80%)",
                            }}
                            onError={() => handleImageError(key)}
                          />
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Mobile - bottom row */}
                  <div className="flex md:hidden gap-4 items-center justify-center mt-4">
                    <HankoSeal size="small" />
                    {stampEmojis.slice(0, 2).map((emoji, i) => {
                      const key = `haiku-mobile-${emoji.name}`
                      const hasFailed = failedImages.has(key)
                      return (
                        <motion.img
                          key={key}
                          src={hasFailed ? EMOJI_PLACEHOLDER : proxyImageUrl(emoji.url)}
                          alt=""
                          className="w-8 h-8 object-contain opacity-60"
                          initial={captureMode ? false : { opacity: 0, scale: 0 }}
                          animate={{ opacity: 0.6, scale: 1 }}
                          transition={{ delay: captureMode ? 0 : 2 + i * 0.1 }}
                          style={{
                            filter: "sepia(30%) saturate(80%)",
                          }}
                          onError={() => handleImageError(key)}
                        />
                      )
                    })}
                  </div>
                </>
              )}
            </div>
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
        slideName="haiku"
        workspaceName={workspaceName}
        year={year}
        backgroundColor={COLORS.washiCream}
      />
    </div>
  )
}
