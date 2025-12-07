"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { WrappedStats, PersonalWrappedStats } from "@/lib/services/wrapped-service"
import { detectPersona, Persona, PERSONAS } from "@/lib/services/vibe-generator"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import { Emoji } from "@/lib/services/emoji-service"
import {
  Moon,
  Crown,
  Minimize2,
  BookOpen,
  Flame,
  Music,
  Sunrise,
  Zap,
  Dumbbell,
  Target,
  Palette,
  Archive,
  Star,
  Tv,
  Coffee,
  Rocket,
} from "lucide-react"

interface VibeSlideProps {
  stats: WrappedStats
  personalStats: PersonalWrappedStats | null
  workspaceName: string
  year: number
  captureMode?: boolean
  customEmojis?: Emoji[]
}

// Map persona icon names to Lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Moon,
  Crown,
  Minimize2,
  BookOpen,
  Flame,
  Music,
  Sunrise,
  Zap,
  Dumbbell,
  Target,
  Palette,
  Archive,
  Star,
  Tv,
  Coffee,
  Rocket,
}

// CRT Scanline overlay component
function CRTScanlines() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-20"
      style={{
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 0, 0, 0.15) 2px,
          rgba(0, 0, 0, 0.15) 4px
        )`,
        mixBlendMode: "multiply",
      }}
    />
  )
}

// Pixel border component
function PixelBorder({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="relative">
      {/* Outer stepped border */}
      <div
        className="absolute -inset-1 sm:-inset-2"
        style={{
          background: color,
          clipPath: `polygon(
            0 8px, 8px 8px, 8px 0, calc(100% - 8px) 0, calc(100% - 8px) 8px, 100% 8px,
            100% calc(100% - 8px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%,
            8px 100%, 8px calc(100% - 8px), 0 calc(100% - 8px)
          )`,
        }}
      />
      {/* Inner content area */}
      <div
        className="relative bg-[#0a0a0a]"
        style={{
          clipPath: `polygon(
            0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px,
            100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
            4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)
          )`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Arcade stat bar component
function StatBar({
  label,
  value,
  color,
  delay,
  shouldAnimate,
  captureMode,
}: {
  label: string
  value: number
  color: string
  delay: number
  shouldAnimate: boolean
  captureMode: boolean
}) {
  const filledBlocks = Math.round(value / 10)
  const emptyBlocks = 10 - filledBlocks

  return (
    <motion.div
      className="flex items-center gap-2 font-mono text-xs sm:text-sm"
      initial={captureMode ? false : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: captureMode ? 0 : delay }}
    >
      <span className="w-16 sm:w-20 text-[#fffb96] uppercase tracking-wider">{label}</span>
      <div className="flex gap-0.5">
        {[...Array(filledBlocks)].map((_, i) => (
          <motion.div
            key={`filled-${i}`}
            className="w-2 h-3 sm:w-3 sm:h-4"
            style={{ backgroundColor: color }}
            initial={captureMode ? false : { scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: captureMode ? 0 : delay + i * 0.05 }}
          />
        ))}
        {[...Array(emptyBlocks)].map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-2 h-3 sm:w-3 sm:h-4 border border-white/20"
          />
        ))}
      </div>
      <span className="text-white/60 w-8 text-right">{value}%</span>
    </motion.div>
  )
}

// Arcade character card
function ArcadePersonaCard({
  persona,
  label,
  captureMode,
  shouldAnimate,
  delay = 0,
  size = "large",
}: {
  persona: Persona
  label: string
  captureMode: boolean
  shouldAnimate: boolean
  delay?: number
  size?: "large" | "small"
}) {
  const IconComponent = ICON_MAP[persona.icon] || Target
  const isLarge = size === "large"
  const primaryColor = persona.gradient[0]
  const secondaryColor = persona.gradient[1]

  return (
    <motion.div
      initial={captureMode ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: captureMode ? 0 : delay,
        duration: 0.3,
      }}
      className={isLarge ? "w-full max-w-sm sm:max-w-md" : "w-full max-w-xs"}
    >
      <PixelBorder color={secondaryColor}>
        <div className={`p-4 sm:p-6 ${isLarge ? "md:p-8" : ""}`}>
          {/* Label */}
          <motion.div
            className="text-center mb-3 sm:mb-4"
            initial={captureMode ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: captureMode ? 0 : delay + 0.1 }}
          >
            <span
              className="font-mono text-xs uppercase tracking-[0.3em] px-3 py-1"
              style={{ color: "#fffb96" }}
            >
              {label}
            </span>
          </motion.div>

          {/* Icon box with glitch effect */}
          <motion.div
            className={`mx-auto mb-4 flex items-center justify-center ${
              isLarge ? "w-20 h-20 sm:w-24 sm:h-24" : "w-14 h-14 sm:w-16 sm:h-16"
            }`}
            style={{
              background: `linear-gradient(180deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              boxShadow: `0 0 20px ${secondaryColor}80, inset 0 0 20px rgba(255,255,255,0.1)`,
            }}
            animate={
              shouldAnimate && !captureMode
                ? {
                    boxShadow: [
                      `0 0 20px ${secondaryColor}80, inset 0 0 20px rgba(255,255,255,0.1)`,
                      `0 0 40px ${secondaryColor}, inset 0 0 30px rgba(255,255,255,0.2)`,
                      `0 0 20px ${secondaryColor}80, inset 0 0 20px rgba(255,255,255,0.1)`,
                    ],
                  }
                : undefined
            }
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <IconComponent
              className={`text-white ${
                isLarge ? "w-10 h-10 sm:w-12 sm:h-12" : "w-7 h-7 sm:w-8 sm:h-8"
              }`}
            />
          </motion.div>

          {/* Persona name with chromatic aberration effect */}
          <motion.div
            className="text-center mb-2"
            initial={captureMode ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: captureMode ? 0 : delay + 0.2 }}
          >
            <div className="relative">
              {/* Chromatic aberration layers */}
              {shouldAnimate && !captureMode && (
                <>
                  <h3
                    className={`absolute inset-0 font-black uppercase tracking-wider ${
                      isLarge ? "text-2xl sm:text-3xl md:text-4xl" : "text-lg sm:text-xl"
                    }`}
                    style={{ color: "#ff2a6d", transform: "translateX(-2px)", opacity: 0.5 }}
                  >
                    {persona.name}
                  </h3>
                  <h3
                    className={`absolute inset-0 font-black uppercase tracking-wider ${
                      isLarge ? "text-2xl sm:text-3xl md:text-4xl" : "text-lg sm:text-xl"
                    }`}
                    style={{ color: "#01cdfe", transform: "translateX(2px)", opacity: 0.5 }}
                  >
                    {persona.name}
                  </h3>
                </>
              )}
              <h3
                className={`relative font-black uppercase tracking-wider text-white ${
                  isLarge ? "text-2xl sm:text-3xl md:text-4xl" : "text-lg sm:text-xl"
                }`}
              >
                {persona.name}
              </h3>
            </div>
            <span className={`${isLarge ? "text-3xl sm:text-4xl" : "text-2xl"}`}>
              {persona.emoji}
            </span>
          </motion.div>

          {/* Stats bars */}
          {isLarge && persona.stats && (
            <div className="space-y-2 mt-4 sm:mt-6">
              {persona.stats.map((stat, i) => (
                <StatBar
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  color={i === 0 ? "#ff2a6d" : i === 1 ? "#05ffa1" : "#01cdfe"}
                  delay={delay + 0.3 + i * 0.1}
                  shouldAnimate={shouldAnimate}
                  captureMode={captureMode}
                />
              ))}
            </div>
          )}

          {/* Description */}
          <motion.p
            className={`text-center font-mono mt-4 ${
              isLarge ? "text-sm sm:text-base" : "text-xs sm:text-sm"
            }`}
            style={{ color: "#fffb96" }}
            initial={captureMode ? false : { opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: captureMode ? 0 : delay + 0.5 }}
          >
            "{persona.description}"
          </motion.p>
        </div>
      </PixelBorder>
    </motion.div>
  )
}

export function VibeSlide({
  stats,
  personalStats,
  workspaceName,
  year,
  captureMode = false,
  customEmojis = [],
}: VibeSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const shouldReduceAnimations = useShouldReduceAnimations()

  // Hydration tracking for WKWebView compatibility
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  const shouldAnimate = hydrated && !captureMode && !shouldReduceAnimations

  // Detect personas
  const workspacePersona = useMemo(() => detectPersona(stats), [stats])
  const personalPersona = useMemo(
    () => (personalStats ? detectPersona(stats, personalStats) : null),
    [stats, personalStats]
  )

  // Check if personal and workspace have different personas
  const hasDifferentPersonas =
    personalPersona && personalPersona.type !== workspacePersona.type

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden bg-[#0a0a0a]">
      {/* CRT Scanlines */}
      <CRTScanlines />

      {/* Arcade cabinet glow effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(5, 255, 161, 0.05) 0%, transparent 50%)",
        }}
      />

      {/* Screen flicker effect */}
      {shouldAnimate && (
        <motion.div
          className="absolute inset-0 pointer-events-none bg-white/5"
          animate={{ opacity: [0, 0.03, 0, 0.02, 0] }}
          transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 3 }}
        />
      )}

      {/* Capturable content */}
      <div
        ref={slideRef}
        className={`relative w-full max-w-2xl md:max-w-4xl z-10 ${
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
            {/* Arcade header */}
            <motion.div
              className="mb-4 sm:mb-6"
              initial={captureMode ? false : { opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: captureMode ? 0 : 0.1 }}
            >
              <div className="relative">
                {/* Glowing border effect */}
                <div
                  className="absolute -inset-1 opacity-50"
                  style={{
                    background: "linear-gradient(90deg, #ff2a6d, #05ffa1, #01cdfe, #fffb96)",
                    filter: "blur(8px)",
                  }}
                />
                <div className="relative bg-[#0a0a0a] px-4 sm:px-8 py-2 sm:py-3 border-2 border-white/20">
                  <h2
                    className="font-mono font-black uppercase tracking-[0.2em] text-xl sm:text-2xl md:text-3xl"
                    style={{
                      background: "linear-gradient(90deg, #ff2a6d, #fffb96, #05ffa1)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Select Your Vibe
                  </h2>
                </div>
              </div>
            </motion.div>

            {/* INSERT COIN prompt */}
            <motion.div
              className="font-mono text-xs sm:text-sm uppercase tracking-widest"
              style={{ color: "#fffb96" }}
              initial={captureMode ? false : { opacity: 0 }}
              animate={shouldAnimate ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.7 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Player 1 Ready
            </motion.div>
          </div>

          {/* Middle Section: Persona Cards */}
          <div className="flex-1 flex flex-col items-center justify-center w-full gap-4 sm:gap-6 py-4">
            {personalPersona ? (
              <>
                <ArcadePersonaCard
                  persona={personalPersona}
                  label="You Are"
                  captureMode={captureMode}
                  shouldAnimate={shouldAnimate}
                  delay={0.3}
                  size="large"
                />

                {hasDifferentPersonas && (
                  <div className="flex flex-col items-center gap-2">
                    <motion.span
                      className="font-mono text-xs uppercase tracking-widest"
                      style={{ color: "#01cdfe" }}
                      initial={captureMode ? false : { opacity: 0 }}
                      animate={{ opacity: 0.7 }}
                      transition={{ delay: captureMode ? 0 : 0.7 }}
                    >
                      Meanwhile, {workspaceName} is...
                    </motion.span>
                    <ArcadePersonaCard
                      persona={workspacePersona}
                      label="Workspace"
                      captureMode={captureMode}
                      shouldAnimate={shouldAnimate}
                      delay={0.8}
                      size="small"
                    />
                  </div>
                )}
              </>
            ) : (
              <ArcadePersonaCard
                persona={workspacePersona}
                label={`${workspaceName} is`}
                captureMode={captureMode}
                shouldAnimate={shouldAnimate}
                delay={0.3}
                size="large"
              />
            )}
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
        slideName="vibe"
        workspaceName={workspaceName}
        year={year}
        backgroundColor="#0a0a0a"
      />
    </div>
  )
}
