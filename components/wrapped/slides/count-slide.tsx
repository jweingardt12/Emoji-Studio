"use client"

import { motion } from "framer-motion"
import { useEffect, useState, useRef } from "react"
import { Emoji } from "@/lib/services/emoji-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Confetti, ConfettiRef } from "@/components/ui/confetti"
import { GridBackground } from "@/components/ui/grid-background"
import { Meteors } from "@/components/ui/meteors"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"

interface CountSlideProps {
  totalEmojis: number
  totalCreators: number
  customEmojis?: Emoji[]
  workspaceName: string
  year: number
  captureMode?: boolean
}

export function CountSlide({
  totalEmojis,
  totalCreators,
  customEmojis = [],
  workspaceName,
  year,
  captureMode = false
}: CountSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const confettiRef = useRef<ConfettiRef>(null)
  const [showEmojis, setShowEmojis] = useState(captureMode)

  // Get sample emojis to showcase (up to 16 for a larger grid)
  const sampleEmojis = customEmojis.slice(0, 16)

  useEffect(() => {
    if (captureMode) return

    // Trigger confetti when number finishes counting (after ~2s)
    const confettiTimer = setTimeout(() => {
      confettiRef.current?.fire({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
    }, 2200)

    // Show emoji showcase after confetti
    const emojiTimer = setTimeout(() => {
      setShowEmojis(true)
    }, 2500)

    return () => {
      clearTimeout(confettiTimer)
      clearTimeout(emojiTimer)
    }
  }, [captureMode])

  // Playful copy based on emoji count
  const getPlayfulCopy = () => {
    if (totalEmojis >= 1000) return "Holy smokes! That's LEGENDARY"
    if (totalEmojis >= 500) return "Holy smokes! That's a LOT"
    if (totalEmojis >= 200) return "Wow! Y'all were busy"
    if (totalEmojis >= 100) return "Not bad at all!"
    return "Quality over quantity!"
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
      {/* Background effects */}
      <GridBackground
        gridSize={32}
        gridColor="rgba(255, 255, 255, 0.04)"
        showGlow={true}
        glowColor="rgba(147, 51, 234, 0.25)"
        glowPosition="center"
      />
      {!captureMode && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Meteors number={15} className="opacity-70" />
        </div>
      )}

      {/* Confetti canvas - only show when not in capture mode */}
      {!captureMode && (
        <Confetti
          ref={confettiRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-50"
          manualstart
        />
      )}

      {/* Capturable content - fixed square size for share images, flexible for live view */}
      <div ref={slideRef} className={`relative flex flex-col items-center pt-4 pb-4 px-6 w-[600px] ${captureMode ? 'h-[600px]' : 'h-auto min-h-[600px]'} overflow-hidden`}>
        {/* Consistent header for share images */}
        <SlideHeader year={year} />

        {/* Playful header */}
        {captureMode ? (
          <p className="text-white/60 text-base mb-1">
            This year, {workspaceName} created...
          </p>
        ) : (
          <BlurFade delay={0.2} className="text-white/60 text-base mb-1">
            This year, {workspaceName} created...
          </BlurFade>
        )}

        {/* Main number with NumberTicker */}
        <motion.div
          initial={captureMode ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative"
        >
          <div
            className="text-7xl md:text-9xl font-black text-white tabular-nums"
            style={{
              textShadow: "0 0 60px rgba(255,255,255,0.4), 0 0 100px rgba(99,102,241,0.6)",
            }}
          >
            {captureMode ? (
              <span>{totalEmojis.toLocaleString()}</span>
            ) : (
              <NumberTicker
                value={totalEmojis}
                delay={0.5}
                className="text-7xl md:text-9xl font-black text-white"
              />
            )}
          </div>
        </motion.div>

        {/* Label */}
        <motion.div
          initial={captureMode ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-4 space-y-2"
        >
          <h2 className="text-2xl md:text-3xl font-bold">
            <GradientText colors={["#8b5cf6", "#ec4899", "#6366f1", "#8b5cf6"]} animationSpeed={5}>
              custom emojis
            </GradientText>
          </h2>
          <p className="text-lg text-white/80 font-medium">
            {getPlayfulCopy()}
          </p>
        </motion.div>

        {/* Emoji showcase grid */}
        {(showEmojis || captureMode) && sampleEmojis.length > 0 && (
          <motion.div
            initial={captureMode ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: captureMode ? 0 : 0.3, duration: 0.5 }}
            className="mt-4 flex flex-wrap justify-center gap-2 max-w-[420px]"
          >
            {sampleEmojis.map((emoji, i) => (
              <motion.div
                key={emoji.url}
                initial={captureMode ? false : { scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: captureMode ? 0 : 0.4 + i * 0.04,
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className="relative"
              >
                <img
                  src={proxyImageUrl(emoji.url)}
                  alt={emoji.name}
                  className="w-12 h-12 md:w-14 md:h-14 object-contain rounded-xl shadow-lg"
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Creator count pill */}
        <motion.div
          initial={captureMode ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: captureMode ? 0 : 1.8, duration: 0.5 }}
          className="mt-4 flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
        >
          {/* Show custom emojis as avatars */}
          <div className="flex -space-x-2">
            {customEmojis.slice(0, 3).map((emoji) => (
              <img
                key={emoji.url}
                src={proxyImageUrl(emoji.url)}
                alt={emoji.name}
                className="w-8 h-8 rounded-full bg-white/20 object-contain ring-2 ring-white/10"
              />
            ))}
          </div>
          <span className="text-white/80 font-medium text-sm">
            by <span className="text-white font-bold">{totalCreators}</span> emoji architects
          </span>
        </motion.div>

        {/* Branding */}
        <SlideBranding />
      </div>

      {/* Share button - outside capturable area */}
      <SlideShareButton
        slideRef={slideRef}
        slideName="count"
        workspaceName={workspaceName}
        year={year}
        backgroundColor="#1e3a8a"
      />
    </div>
  )
}
