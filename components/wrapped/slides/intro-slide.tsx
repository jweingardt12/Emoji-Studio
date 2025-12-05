"use client"

import { motion } from "framer-motion"
import { useEffect, useState, useRef } from "react"
import { Emoji } from "@/lib/services/emoji-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"

interface IntroSlideProps {
  year: number
  workspaceName: string
  onContinue: () => void
  customEmojis?: Emoji[]
}

export function IntroSlide({ year, workspaceName, onContinue, customEmojis = [] }: IntroSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const [floatingEmojis, setFloatingEmojis] = useState<
    Array<{ id: number; emoji: Emoji | null; x: number; delay: number; duration: number; size: number }>
  >([])

  useEffect(() => {
    // Generate floating emojis on mount using custom workspace emojis
    const generated = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      emoji: customEmojis.length > 0 ? customEmojis[i % customEmojis.length] : null,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 4 + Math.random() * 3,
      size: 32 + Math.random() * 16, // Random size between 32-48px
    }))
    setFloatingEmojis(generated)
  }, [customEmojis])

  // Get a featured emoji for the center animation
  const featuredEmoji = customEmojis[0]

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Capturable content - fixed square size for consistent share images */}
      <div ref={slideRef} className="relative flex flex-col items-center justify-center p-8 w-[600px] h-[600px] overflow-hidden">
        {/* Floating emojis background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingEmojis.map((item) => (
          <motion.div
            key={item.id}
            className="absolute opacity-40"
            style={{ left: `${item.x}%` }}
            initial={{ y: "100vh", rotate: 0 }}
            animate={{
              y: "-100vh",
              rotate: 360,
            }}
            transition={{
              duration: item.duration,
              delay: item.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {item.emoji ? (
              <img
                src={proxyImageUrl(item.emoji.url)}
                alt={item.emoji.name}
                style={{ width: item.size, height: item.size }}
                className="object-contain"
              />
            ) : (
              <span className="text-3xl">✨</span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Main content - Workspace name now more prominent at top */}
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-2xl md:text-3xl font-bold text-white mb-4"
        style={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}
      >
        {workspaceName}
      </motion.p>

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
        className="text-7xl md:text-9xl font-black text-white mb-4"
        style={{
          textShadow: "0 0 60px rgba(255,255,255,0.3), 0 0 100px rgba(147,51,234,0.5)",
        }}
      >
        {year}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-white/90">
          Emoji Wrapped
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="mt-12"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {featuredEmoji ? (
            <img
              src={proxyImageUrl(featuredEmoji.url)}
              alt={featuredEmoji.name}
              className="w-16 h-16 md:w-20 md:h-20 object-contain"
            />
          ) : (
            <span className="text-5xl">🎁</span>
          )}
          </motion.div>
        </motion.div>

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
