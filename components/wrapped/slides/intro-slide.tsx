"use client"

import { motion } from "framer-motion"
import { useRef, useState, useEffect } from "react"
import { Emoji } from "@/lib/services/emoji-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { EmojiHero } from "../emoji-hero"
import { EmojiOrbit } from "../emoji-orbit"
import { SparklesText } from "@/components/ui/sparkles-text"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"

interface IntroSlideProps {
  year: number
  workspaceName: string
  onContinue: () => void
  customEmojis?: Emoji[]
  captureMode?: boolean
}

export function IntroSlide({
  year,
  workspaceName,
  onContinue,
  customEmojis = [],
  captureMode = false,
}: IntroSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const shouldReduceAnimations = useShouldReduceAnimations()

  // Track hydration to prevent SSR/client mismatch
  // During SSR, shouldAnimate will be false, ensuring content renders visible
  // After hydration, animations can play on desktop
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])

  // Only enable animations AFTER hydration is complete AND when animations are wanted
  // This ensures:
  // - SSR: shouldAnimate=false → content renders visible (initial={false})
  // - Mobile after hydration: shouldAnimate=false → content stays visible
  // - Desktop after hydration: shouldAnimate=true → animations play
  const shouldAnimate = hydrated && !captureMode && !shouldReduceAnimations

  // Get the top emoji to feature prominently
  const featuredEmoji = customEmojis[0]
  // Get emojis for the orbital ring (12-16 for nice spacing)
  const orbitEmojis = customEmojis.slice(1, 13)

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Noise texture overlay */}
      <div className="wrapped-noise absolute inset-0 pointer-events-none" />

      {/* Capturable content */}
      <div
        ref={slideRef}
        className={`relative flex flex-col items-center pt-2 pb-2 px-4 sm:px-6 w-full max-w-4xl ${captureMode ? "h-[600px]" : "h-full max-h-full justify-center overflow-y-auto scrollbar-hide"} overflow-x-hidden`}
      >
        {/* Consistent header for share images */}
        <SlideHeader year={year} />

        {/* Workspace name */}
        {captureMode ? (
          <p className="wrapped-label mb-6 text-xl sm:text-2xl truncate max-w-[280px] sm:max-w-sm">{workspaceName}</p>
        ) : (
          <BlurFade delay={0.2} shouldAnimate={shouldAnimate} className="wrapped-label mb-6 text-xl sm:text-2xl truncate max-w-[280px] sm:max-w-sm">
            {workspaceName}
          </BlurFade>
        )}

        {/* Main hero section - Year with orbital emojis */}
        <div className="relative flex-1 flex items-center justify-center w-full min-h-[300px] sm:min-h-[400px]">
          {/* Orbital emoji ring */}
          {orbitEmojis.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center scale-110 sm:scale-125 md:scale-150">
              <EmojiOrbit
                emojis={orbitEmojis}
                size="lg"
                emojiSize="md"
                orbitDuration={40}
                captureMode={captureMode}
                centerContent={
                  <motion.div
                    initial={shouldAnimate ? { scale: 0, rotate: -180 } : { scale: 1, rotate: 0 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={shouldAnimate ? {
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                      delay: 0.3,
                    } : { duration: 0 }}
                    className="flex flex-col items-center"
                  >
                    {/* Year number */}
                    {captureMode ? (
                      <h1 className="wrapped-hero-number text-[6rem] sm:text-[8rem] md:text-[10rem] leading-none">
                        {year}
                      </h1>
                    ) : (
                      <h1 className="wrapped-hero-number text-[5rem] sm:text-[7rem] md:text-[9rem] lg:text-[11rem] leading-none text-refraction">
                        {year}
                      </h1>
                    )}
                  </motion.div>
                }
              />
            </div>
          )}

          {/* Fallback if no orbit emojis */}
          {orbitEmojis.length === 0 && (
            <motion.div
              initial={shouldAnimate ? { scale: 0, rotate: -180 } : { scale: 1, rotate: 0 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={shouldAnimate ? {
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay: 0.3,
              } : { duration: 0 }}
            >
              {captureMode ? (
                <h1 className="wrapped-hero-number text-[6rem] sm:text-[8rem] md:text-[10rem] leading-none">
                  {year}
                </h1>
              ) : (
                <h1 className="wrapped-hero-number text-[5rem] sm:text-[7rem] md:text-[9rem] lg:text-[11rem] leading-none text-refraction">
                  {year}
                </h1>
              )}
            </motion.div>
          )}
        </div>

        {/* Subtitle with GradientText */}
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldAnimate ? { delay: 0.6, duration: 0.5 } : { duration: 0 }}
          className="mt-8 sm:mt-12"
        >
          <h2 className="wrapped-headline text-4xl sm:text-5xl md:text-6xl">
            <GradientText
              colors={[
                "var(--wrapped-accent-purple)",
                "var(--wrapped-accent-orange)",
                "var(--wrapped-accent-cyan)",
                "var(--wrapped-accent-purple)",
              ]}
              animationSpeed={6}
            >
              Emoji Wrapped
            </GradientText>
          </h2>
          <p className="wrapped-body mt-4 text-xl sm:text-2xl">Your emoji journey awaits</p>
        </motion.div>

        {/* Featured emoji hero */}
        {featuredEmoji && (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={shouldAnimate ? { delay: 1, duration: 0.5 } : { duration: 0 }}
            className="mt-6"
          >
            <EmojiHero
              emoji={featuredEmoji}
              size="md"
              glow="purple"
              animate={!captureMode}
              captureMode={captureMode}
              delay={1.2}
            />
          </motion.div>
        )}

        {/* Branding */}
        <SlideBranding />
      </div>

      {/* Share button - outside capturable area */}
      <SlideShareButton
        slideRef={slideRef}
        slideName="intro"
        workspaceName={workspaceName}
        year={year}
        backgroundColor="var(--wrapped-bg-start)"
      />
    </div>
  )
}
