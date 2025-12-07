"use client"

import { motion } from "framer-motion"
import { useEffect, useState, useRef } from "react"
import { Emoji } from "@/lib/services/emoji-service"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { DualEmojiMarquee } from "../emoji-marquee"
import { StatPill } from "../stat-card"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Confetti, ConfettiRef } from "@/components/ui/confetti"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { useShouldReduceAnimations, DRAMATIC_PRESETS } from "@/hooks/use-animation-tier"
import { Users } from "lucide-react"

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
  captureMode = false,
}: CountSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const confettiRef = useRef<ConfettiRef>(null)
  const [showEmojis, setShowEmojis] = useState(captureMode)
  const [hydrated, setHydrated] = useState(false)
  const shouldReduceAnimations = useShouldReduceAnimations()

  // Hydration tracking for WKWebView compatibility
  useEffect(() => {
    setHydrated(true)
  }, [])
  const shouldAnimate = hydrated && !captureMode && !shouldReduceAnimations

  // Get sample emojis for marquee (24-32 for nice scrolling)
  const marqueeEmojis = customEmojis.slice(0, 32)

  useEffect(() => {
    if (captureMode || shouldReduceAnimations) return

    // Trigger confetti when number finishes counting
    const confettiTimer = setTimeout(() => {
      confettiRef.current?.fire({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ["#a855f7", "#f97316", "#22d3ee"],
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
  }, [captureMode, shouldReduceAnimations])

  // Playful absurdist copy based on emoji count
  const getPlayfulCopy = () => {
    if (totalEmojis >= 1000) return "Somehow that's a personality type now."
    if (totalEmojis >= 500) return "Your keyboard has been through things."
    if (totalEmojis >= 200) return "That's approximately one feeling per day. Healthy."
    if (totalEmojis >= 100) return "Your emoji fingerprint is legally distinctive."
    return "Curated chaos. We respect it."
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Noise texture overlay */}
      <div className="wrapped-noise absolute inset-0 pointer-events-none" />

      {/* Confetti canvas */}
      {!captureMode && (
        <Confetti
          ref={confettiRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-50"
          manualstart
        />
      )}

      {/* Capturable content */}
      <div
        ref={slideRef}
        className={`relative flex flex-col items-center pt-2 pb-2 px-4 sm:px-6 w-full max-w-4xl ${captureMode ? "h-[600px]" : "h-full max-h-full justify-center overflow-y-auto scrollbar-hide"
          } overflow-x-hidden`}
      >
        {/* Consistent header */}
        <SlideHeader year={year} />

        {/* Intro text */}
        {captureMode ? (
          <p className="wrapped-label mb-4 text-xl sm:text-2xl">
            This year, <span className="truncate max-w-[240px] sm:max-w-xs md:max-w-sm inline-block align-bottom">{workspaceName}</span> created
          </p>
        ) : (
          <BlurFade delay={0.2} shouldAnimate={shouldAnimate} className="wrapped-label mb-4 text-xl sm:text-2xl">
            This year, <span className="truncate max-w-[240px] sm:max-w-xs md:max-w-sm inline-block align-bottom">{workspaceName}</span> created
          </BlurFade>
        )}

        {/* Hero number - Responsive sizing with overflow protection */}
        {/* Uses DRAMATIC_PRESETS.suspense for blur-to-focus reveal effect */}
        <motion.div
          initial={captureMode ? false : {
            scale: 0.8,
            opacity: 0,
            filter: shouldAnimate ? "blur(12px)" : "blur(0px)"
          }}
          animate={{
            scale: 1,
            opacity: 1,
            filter: "blur(0px)"
          }}
          transition={{
            duration: 1.2,
            ease: [0.22, 1, 0.36, 1],
            filter: { duration: 1.5 }
          }}
          className="relative my-4 sm:my-8 w-full max-w-full overflow-visible px-4"
        >
          {/* Dark backdrop for readability against floating emojis */}
          <div
            className="absolute inset-0 -inset-x-16 -inset-y-4 rounded-3xl"
            style={{
              background: "radial-gradient(ellipse 80% 120% at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)",
            }}
          />
          {captureMode ? (
            <span
              className="wrapped-hero-number text-[3.5rem] sm:text-[5rem] md:text-[7rem] lg:text-[9rem] block text-center relative z-10"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 4px 24px rgba(0,0,0,0.6)" }}
            >
              {totalEmojis.toLocaleString()}
            </span>
          ) : (
            <NumberTicker
              value={totalEmojis}
              delay={0.5}
              className="wrapped-hero-number text-[3.5rem] sm:text-[5rem] md:text-[7rem] lg:text-[9rem] leading-none tracking-tighter block text-center relative z-10"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 4px 24px rgba(0,0,0,0.6)" }}
            />
          )}
        </motion.div>

        {/* Label with gradient */}
        <motion.div
          initial={captureMode ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="space-y-3"
        >
          <h2 className="wrapped-headline text-4xl sm:text-5xl md:text-6xl">
            <GradientText
              colors={[
                "var(--wrapped-accent-purple)",
                "var(--wrapped-accent-orange)",
                "var(--wrapped-accent-cyan)",
                "var(--wrapped-accent-purple)",
              ]}
              animationSpeed={5}
            >
              custom emojis
            </GradientText>
          </h2>
          <p className="wrapped-body text-xl sm:text-2xl opacity-90">{getPlayfulCopy()}</p>
        </motion.div>

        {/* Dual marquee emoji streams */}
        {(showEmojis || captureMode) && marqueeEmojis.length > 0 && (
          <motion.div
            initial={captureMode ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: captureMode ? 0 : 0.3, duration: 0.5 }}
            className="w-full mt-4 sm:mt-6 overflow-hidden"
          >
            <DualEmojiMarquee
              emojis={marqueeEmojis}
              size="lg"
              gap="md"
              speed="normal"
              pauseOnHover={!captureMode}
              captureMode={captureMode}
            />
          </motion.div>
        )}

        {/* Creator count pill */}
        <motion.div
          initial={captureMode ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: captureMode ? 0 : 1.8, duration: 0.5 }}
          className="mt-6"
        >
          <StatPill
            value={totalCreators}
            label="emoji architects"
            icon={<Users className="w-4 h-4" />}
          />
        </motion.div>

        {/* Branding */}
        <SlideBranding />
      </div>

    </div>
  )
}
