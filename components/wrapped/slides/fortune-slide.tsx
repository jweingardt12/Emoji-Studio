"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { WrappedStats, PersonalWrappedStats } from "@/lib/services/wrapped-service"
import { detectPersona, generateProphecy, Prophecy, Persona } from "@/lib/services/vibe-generator"
import { proxyImageUrl, EMOJI_PLACEHOLDER, hasValidUrl } from "@/lib/utils/image-proxy"
import { SlideBranding } from "../slide-branding"
import { EmojiConstellation } from "../emoji-constellation"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import { Emoji } from "@/lib/services/emoji-service"

interface FortuneSlideProps {
  stats: WrappedStats
  personalStats: PersonalWrappedStats | null
  workspaceName: string
  year: number
  captureMode?: boolean
  customEmojis?: Emoji[]
}

// Tarot color palette
const TAROT_COLORS = {
  gold: "#d4af37",
  navy: "#0a1628",
  cream: "#f4e8d1",
  burgundy: "#722f37",
  silver: "#c0c0c0",
  deepPurple: "#1a0a2e",
}

// Moon phases component
function MoonPhases({ size = "medium" }: { size?: "small" | "medium" | "large" }) {
  const sizeClasses = {
    small: "w-3 h-3 sm:w-4 sm:h-4",
    medium: "w-4 h-4 sm:w-5 sm:h-5",
    large: "w-5 h-5 sm:w-6 sm:h-6",
  }
  const moonClass = sizeClasses[size]

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* New moon */}
      <div className={`${moonClass} rounded-full border border-${TAROT_COLORS.gold}`} style={{ borderColor: TAROT_COLORS.gold }} />
      {/* Waxing crescent */}
      <div className={`${moonClass} rounded-full overflow-hidden`} style={{ backgroundColor: TAROT_COLORS.navy, border: `1px solid ${TAROT_COLORS.gold}` }}>
        <div className="w-1/2 h-full" style={{ backgroundColor: TAROT_COLORS.gold }} />
      </div>
      {/* Full moon */}
      <div className={`${moonClass} rounded-full`} style={{ backgroundColor: TAROT_COLORS.gold }} />
      {/* Waning crescent */}
      <div className={`${moonClass} rounded-full overflow-hidden`} style={{ backgroundColor: TAROT_COLORS.navy, border: `1px solid ${TAROT_COLORS.gold}` }}>
        <div className="w-1/2 h-full ml-auto" style={{ backgroundColor: TAROT_COLORS.gold }} />
      </div>
      {/* New moon */}
      <div className={`${moonClass} rounded-full border`} style={{ borderColor: TAROT_COLORS.gold }} />
    </div>
  )
}

// Stars decoration for background - reduced on mobile for performance
function ConstellationBackground({ starCount = 8, reduceMotion = false }: { starCount?: number; reduceMotion?: boolean }) {
  // Reduce star count on mobile
  const effectiveCount = reduceMotion ? Math.min(starCount, 4) : starCount

  const stars = useMemo(() => {
    return [...Array(effectiveCount)].map((_, i) => ({
      left: `${10 + Math.random() * 80}%`,
      top: `${10 + Math.random() * 80}%`,
      size: 1 + Math.random() * 2,
      delay: Math.random() * 2,
    }))
  }, [effectiveCount])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map((star, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            backgroundColor: TAROT_COLORS.gold,
          }}
          animate={reduceMotion ? {} : {
            opacity: [0.3, 0.8, 0.3],
          }}
          initial={{ opacity: 0.5 }}
          transition={reduceMotion ? {} : {
            duration: 3,
            repeat: Infinity,
            delay: star.delay,
          }}
        />
      ))}
    </div>
  )
}

// Art Nouveau decorative border
function TarotBorder() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top ornament */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2">
        <svg width="100" height="30" viewBox="0 0 100 30" fill="none">
          <path
            d="M50 5 L55 15 L70 15 L58 22 L62 30 L50 25 L38 30 L42 22 L30 15 L45 15 Z"
            fill={TAROT_COLORS.gold}
            opacity="0.8"
          />
          <circle cx="15" cy="15" r="5" fill={TAROT_COLORS.gold} opacity="0.5" />
          <circle cx="85" cy="15" r="5" fill={TAROT_COLORS.gold} opacity="0.5" />
        </svg>
      </div>
      {/* Corner flourishes */}
      <div className="absolute top-3 left-3 w-8 h-8" style={{ borderTop: `2px solid ${TAROT_COLORS.gold}`, borderLeft: `2px solid ${TAROT_COLORS.gold}` }} />
      <div className="absolute top-3 right-3 w-8 h-8" style={{ borderTop: `2px solid ${TAROT_COLORS.gold}`, borderRight: `2px solid ${TAROT_COLORS.gold}` }} />
      <div className="absolute bottom-3 left-3 w-8 h-8" style={{ borderBottom: `2px solid ${TAROT_COLORS.gold}`, borderLeft: `2px solid ${TAROT_COLORS.gold}` }} />
      <div className="absolute bottom-3 right-3 w-8 h-8" style={{ borderBottom: `2px solid ${TAROT_COLORS.gold}`, borderRight: `2px solid ${TAROT_COLORS.gold}` }} />
      {/* Main border */}
      <div className="absolute inset-2 border" style={{ borderColor: TAROT_COLORS.gold, opacity: 0.5 }} />
      <div className="absolute inset-4 border" style={{ borderColor: TAROT_COLORS.gold, opacity: 0.3 }} />
    </div>
  )
}

// Tarot card component
function TarotCard({
  persona,
  prophecy,
  captureMode,
  shouldAnimate,
  emoji,
  delay = 0,
  size = "large",
}: {
  persona: Persona
  prophecy: Prophecy
  captureMode: boolean
  shouldAnimate: boolean
  emoji: Emoji | null
  delay?: number
  size?: "large" | "small"
}) {
  const isLarge = size === "large"
  const [imgError, setImgError] = useState(false)
  const validEmoji = emoji && hasValidUrl(emoji) && !imgError

  return (
    <motion.div
      initial={captureMode ? false : { opacity: 0, rotateY: -90 }}
      animate={{ opacity: 1, rotateY: 0 }}
      transition={{
        delay: captureMode ? 0 : delay,
        duration: 0.8,
        type: "spring",
      }}
      className={`relative ${isLarge ? "w-64 sm:w-72 md:w-80" : "w-48 sm:w-56"}`}
      style={{ perspective: "1000px" }}
    >
      <div
        className={`relative overflow-hidden ${isLarge ? "p-6 sm:p-8" : "p-4 sm:p-5"}`}
        style={{
          background: `linear-gradient(180deg, ${TAROT_COLORS.navy} 0%, ${TAROT_COLORS.deepPurple} 100%)`,
          border: `2px solid ${TAROT_COLORS.gold}`,
          boxShadow: `0 0 30px ${TAROT_COLORS.gold}40, inset 0 0 50px ${TAROT_COLORS.navy}`,
        }}
      >
        <TarotBorder />
        <ConstellationBackground starCount={isLarge ? 8 : 4} reduceMotion={!shouldAnimate} />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-4">
          {/* Tarot number */}
          <motion.div
            className="flex items-center gap-2"
            initial={captureMode ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: captureMode ? 0 : delay + 0.2 }}
          >
            <span className="text-lg" style={{ color: TAROT_COLORS.gold }}>✧</span>
            <span
              className={`font-serif tracking-widest ${isLarge ? "text-sm sm:text-base" : "text-xs"}`}
              style={{ color: TAROT_COLORS.gold }}
            >
              {persona.tarotNumber}
            </span>
            <span className="text-lg" style={{ color: TAROT_COLORS.gold }}>✧</span>
          </motion.div>

          {/* Persona name with moon decorations */}
          <motion.div
            className="text-center"
            initial={captureMode ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: captureMode ? 0 : delay + 0.3 }}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <span style={{ color: TAROT_COLORS.gold }}>☽</span>
              <h3
                className={`font-serif font-bold uppercase tracking-wider ${
                  isLarge ? "text-xl sm:text-2xl md:text-3xl" : "text-base sm:text-lg"
                }`}
                style={{ color: TAROT_COLORS.cream }}
              >
                {persona.name}
              </h3>
              <span style={{ color: TAROT_COLORS.gold }}>☾</span>
            </div>
          </motion.div>

          {/* Central image - emoji or mystical symbol */}
          <motion.div
            className={`flex items-center justify-center ${
              isLarge ? "w-20 h-20 sm:w-24 sm:h-24" : "w-14 h-14 sm:w-16 sm:h-16"
            }`}
            initial={captureMode ? false : { opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: captureMode ? 0 : delay + 0.4, type: "spring" }}
            style={{
              border: `1px solid ${TAROT_COLORS.gold}40`,
              background: `radial-gradient(circle, ${TAROT_COLORS.deepPurple} 0%, transparent 70%)`,
            }}
          >
            {validEmoji ? (
              <img
                src={proxyImageUrl(emoji.url)}
                alt=""
                className={`object-contain ${isLarge ? "w-14 h-14 sm:w-16 sm:h-16" : "w-10 h-10 sm:w-12 sm:h-12"}`}
                style={{
                  filter: `drop-shadow(0 0 10px ${TAROT_COLORS.gold}80)`,
                }}
                onError={() => setImgError(true)}
              />
            ) : (
              <span className={`${isLarge ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}>
                {persona.emoji}
              </span>
            )}
          </motion.div>

          {/* Divider */}
          <motion.div
            className={`w-full flex items-center gap-2 ${isLarge ? "my-2" : "my-1"}`}
            initial={captureMode ? false : { opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: captureMode ? 0 : delay + 0.5 }}
          >
            <div className="flex-1 h-px" style={{ backgroundColor: TAROT_COLORS.gold, opacity: 0.5 }} />
            <span style={{ color: TAROT_COLORS.gold }}>✦</span>
            <div className="flex-1 h-px" style={{ backgroundColor: TAROT_COLORS.gold, opacity: 0.5 }} />
          </motion.div>

          {/* Prophecy text */}
          <motion.p
            className={`text-center font-serif italic leading-relaxed ${
              isLarge ? "text-sm sm:text-base" : "text-xs sm:text-sm"
            }`}
            style={{ color: TAROT_COLORS.cream }}
            initial={captureMode ? false : { opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ delay: captureMode ? 0 : delay + 0.6 }}
          >
            "{prophecy.text}"
          </motion.p>

          {/* Moon phases at bottom */}
          <motion.div
            initial={captureMode ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: captureMode ? 0 : delay + 0.7 }}
          >
            <MoonPhases size={isLarge ? "medium" : "small"} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

export function FortuneSlide({
  stats,
  personalStats,
  workspaceName,
  year,
  captureMode = false,
  customEmojis = [],
}: FortuneSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const shouldReduceAnimations = useShouldReduceAnimations()

  // Hydration tracking for WKWebView compatibility
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  const shouldAnimate = hydrated && !captureMode && !shouldReduceAnimations

  // Detect personas and generate prophecies
  const workspacePersona = useMemo(() => detectPersona(stats), [stats])
  const personalPersona = useMemo(
    () => (personalStats ? detectPersona(stats, personalStats) : null),
    [stats, personalStats]
  )

  const workspaceProphecy = useMemo(
    () => generateProphecy(workspacePersona, year),
    [workspacePersona, year]
  )
  const personalProphecy = useMemo(
    () => (personalPersona ? generateProphecy(personalPersona, year) : null),
    [personalPersona, year]
  )

  // Get featured emoji for card
  const featuredEmoji = customEmojis[0] || null

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden"
      style={{ backgroundColor: TAROT_COLORS.navy }}
    >
      {/* Simple star constellation background - reduced on mobile */}
      <ConstellationBackground starCount={12} reduceMotion={shouldReduceAnimations} />

      {/* Emoji constellation - connects user's emojis like stars */}
      {customEmojis.length >= 3 && !captureMode && (
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <EmojiConstellation
            emojis={customEmojis.slice(0, 6)}
            lineColor={TAROT_COLORS.gold}
            lineOpacity={0.4}
            emojiSize={shouldReduceAnimations ? 20 : 24}
            animated={!shouldReduceAnimations}
          />
        </div>
      )}

      {/* Celestial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center top, ${TAROT_COLORS.deepPurple}80 0%, transparent 50%)`,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center bottom, ${TAROT_COLORS.burgundy}40 0%, transparent 40%)`,
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
          {/* Top Section: Header */}
          <div className="w-full flex flex-col items-center flex-shrink-0">
            <motion.div
              className="mb-4 sm:mb-6"
              initial={captureMode ? false : { opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: captureMode ? 0 : 0.1 }}
            >
              <h2
                className="font-serif text-2xl sm:text-3xl md:text-4xl tracking-wide mb-2"
                style={{ color: TAROT_COLORS.cream }}
              >
                Your {year + 1} Prophecy
              </h2>
              <p
                className="font-serif text-sm sm:text-base italic"
                style={{ color: TAROT_COLORS.gold }}
              >
                The emojis have spoken
              </p>
            </motion.div>

            <MoonPhases size="large" />
          </div>

          {/* Middle Section: Tarot Cards */}
          <div className="flex-1 flex flex-col items-center justify-center w-full gap-4 sm:gap-6 py-4">
            {personalProphecy && personalPersona ? (
              <>
                <TarotCard
                  persona={personalPersona}
                  prophecy={personalProphecy}
                  captureMode={captureMode}
                  shouldAnimate={shouldAnimate}
                  emoji={featuredEmoji}
                  delay={0.3}
                  size="large"
                />

                {workspacePersona.type !== personalPersona.type && (
                  <div className="flex flex-col items-center gap-2">
                    <motion.span
                      className="font-serif text-xs uppercase tracking-widest"
                      style={{ color: TAROT_COLORS.gold }}
                      initial={captureMode ? false : { opacity: 0 }}
                      animate={{ opacity: 0.7 }}
                      transition={{ delay: captureMode ? 0 : 1.5 }}
                    >
                      {workspaceName}'s fate:
                    </motion.span>
                    <TarotCard
                      persona={workspacePersona}
                      prophecy={workspaceProphecy}
                      captureMode={captureMode}
                      shouldAnimate={shouldAnimate}
                      emoji={customEmojis[1] || null}
                      delay={1.6}
                      size="small"
                    />
                  </div>
                )}
              </>
            ) : (
              <TarotCard
                persona={workspacePersona}
                prophecy={workspaceProphecy}
                captureMode={captureMode}
                shouldAnimate={shouldAnimate}
                emoji={featuredEmoji}
                delay={0.3}
                size="large"
              />
            )}

            {/* Disclaimer */}
            <motion.p
              initial={captureMode ? false : { opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: captureMode ? 0 : 2.5 }}
              className="text-[10px] sm:text-xs font-serif italic"
              style={{ color: TAROT_COLORS.cream }}
            >
              {workspaceProphecy.disclaimer}
            </motion.p>
          </div>

          {/* Bottom Section: Branding */}
          <div className="flex-shrink-0 mb-safe">
            <SlideBranding />
          </div>
        </div>
      </div>

    </div>
  )
}
