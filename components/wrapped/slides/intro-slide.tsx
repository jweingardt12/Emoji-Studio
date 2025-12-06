"use client"

import { motion } from "framer-motion"
import { useRef } from "react"
import { Emoji } from "@/lib/services/emoji-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { Particles } from "@/components/ui/particles"
import { SparklesText } from "@/components/ui/sparkles-text"
import { ShootingStars } from "@/components/ui/shooting-stars"
import { DotPattern } from "@/components/ui/dot-pattern"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { useIsMobile } from "@/hooks/use-mobile"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

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
  captureMode = false
}: IntroSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const prefersReducedMotion = useReducedMotion()
  const shouldReduceAnimations = isMobile || prefersReducedMotion

  // Get the top emoji to feature prominently
  const featuredEmoji = customEmojis[0]
  // Get more for a prominent showcase (8 emojis instead of 5)
  const sampleEmojis = customEmojis.slice(1, 9)

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Background effects - only show when not in capture mode and not on mobile */}
      {!captureMode && !shouldReduceAnimations && (
        <>
          <Particles
            className="absolute inset-0"
            quantity={40}
            staticity={30}
            ease={80}
            color="#ffffff"
            size={0.6}
          />
          <ShootingStars
            starColor="#9E7AFF"
            trailColor="#2EB9DF"
            minSpeed={15}
            maxSpeed={35}
            minDelay={2500}
            maxDelay={5000}
          />
          <ShootingStars
            starColor="#FE8BBB"
            trailColor="#9E7AFF"
            minSpeed={10}
            maxSpeed={25}
            minDelay={3000}
            maxDelay={6000}
          />
        </>
      )}

      {/* Dot pattern overlay */}
      <DotPattern
        className="absolute inset-0 opacity-20"
        dotColor="rgba(255, 255, 255, 0.5)"
        dotOpacity={0.3}
        width={20}
        height={20}
        cr={1}
      />

      {/* Capturable content - fixed square size for share images, flexible for live view */}
      <div ref={slideRef} className={`relative flex flex-col items-center pt-4 pb-4 px-6 w-[600px] ${captureMode ? 'h-[600px]' : 'h-auto min-h-[600px]'} overflow-hidden`}>
        {/* Consistent header for share images */}
        <SlideHeader year={year} />

        {/* Workspace name with BlurFade */}
        {captureMode ? (
          <p className="text-lg md:text-xl font-semibold text-white/70 mb-2">
            {workspaceName}
          </p>
        ) : (
          <BlurFade delay={0.2} className="text-lg md:text-xl font-semibold text-white/70 mb-2">
            {workspaceName}
          </BlurFade>
        )}

        {/* Year with SparklesText */}
        <motion.div
          initial={captureMode ? false : { scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 }}
        >
          {captureMode ? (
            <h1
              className="text-8xl md:text-9xl font-black text-white"
              style={{
                textShadow: "0 0 60px rgba(255,255,255,0.3), 0 0 100px rgba(147,51,234,0.5)",
              }}
            >
              {year}
            </h1>
          ) : (
            <SparklesText
              className="text-8xl md:text-9xl font-black"
              colors={{ first: "#9E7AFF", second: "#FE8BBB" }}
              sparklesCount={8}
            >
              {year}
            </SparklesText>
          )}
        </motion.div>

        {/* Subtitle with GradientText */}
        <motion.div
          initial={captureMode ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-4"
        >
          <h2 className="text-2xl md:text-3xl font-bold">
            <GradientText
              colors={["#9E7AFF", "#FE8BBB", "#2EB9DF", "#9E7AFF"]}
              animationSpeed={6}
            >
              Emoji Wrapped
            </GradientText>
          </h2>
          <p className="text-white/60 mt-2 text-lg">
            Let's see what you cooked up...
          </p>
        </motion.div>

        {/* Featured emoji with pulsing animation - LARGER */}
        <motion.div
          initial={captureMode ? false : { opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-6"
        >
          {featuredEmoji ? (
            <motion.div
              animate={captureMode ? {} : { scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <img
                src={proxyImageUrl(featuredEmoji.url)}
                alt={featuredEmoji.name}
                className="w-28 h-28 md:w-36 md:h-36 object-contain drop-shadow-2xl"
              />
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-white/30 blur-2xl -z-10 scale-150" />
            </motion.div>
          ) : (
            <span className="text-6xl">✨</span>
          )}
        </motion.div>

        {/* Sample emojis showcase - LARGER and more prominent */}
        {sampleEmojis.length > 0 && (
          <motion.div
            initial={captureMode ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.5 }}
            className="mt-6 flex flex-wrap justify-center gap-3 max-w-[400px]"
          >
            {sampleEmojis.map((emoji, i) => (
              <motion.img
                key={emoji.url}
                src={proxyImageUrl(emoji.url)}
                alt={emoji.name}
                className="w-12 h-12 md:w-14 md:h-14 object-contain rounded-lg shadow-md"
                initial={captureMode ? false : { y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.4 + i * 0.08 }}
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
        slideName="intro"
        workspaceName={workspaceName}
        year={year}
        backgroundColor="#4c1d95"
      />
    </div>
  )
}
