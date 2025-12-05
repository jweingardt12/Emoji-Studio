"use client"

import { motion, useMotionValue, animate } from "framer-motion"
import { useEffect, useState, useRef } from "react"
import { Emoji } from "@/lib/services/emoji-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { SlideShareButton } from "../slide-share-button"
import { SlideBranding } from "../slide-branding"

interface CountSlideProps {
  totalEmojis: number
  totalCreators: number
  customEmojis?: Emoji[]
  workspaceName: string
  year: number
}

function AnimatedNumber({ value, duration = 2 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)
  const motionValue = useMotionValue(0)

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // expo-out
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    })
    return controls.stop
  }, [value, duration, motionValue])

  return <span>{displayValue.toLocaleString()}</span>
}

export function CountSlide({ totalEmojis, totalCreators, customEmojis = [], workspaceName, year }: CountSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null)
  const [showBurst, setShowBurst] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowBurst(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  // Use up to 8 custom emojis for the burst effect
  const burstEmojis = customEmojis.slice(0, 8)

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
      {/* Capturable content - fixed square size for consistent share images */}
      <div ref={slideRef} className="relative flex flex-col items-center justify-center p-8 w-[600px] h-[600px] overflow-hidden">
        {/* Emoji burst effect using custom workspace emojis */}
      {showBurst && burstEmojis.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {burstEmojis.map((emoji, i) => {
            const angle = (i / burstEmojis.length) * 360
            const radians = (angle * Math.PI) / 180
            const distance = 150

            return (
              <motion.div
                key={emoji.url}
                className="absolute"
                initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1.5, 1],
                  x: Math.cos(radians) * distance,
                  y: Math.sin(radians) * distance,
                  opacity: [0, 1, 0.7],
                }}
                transition={{
                  duration: 0.8,
                  ease: "easeOut",
                }}
              >
                <img
                  src={proxyImageUrl(emoji.url)}
                  alt={emoji.name}
                  className="w-10 h-10 md:w-12 md:h-12 object-contain"
                />
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Main number */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
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
          <AnimatedNumber value={totalEmojis} duration={2} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-4 space-y-2"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          custom emojis
        </h2>
        <p className="text-lg text-white/60">
          created this year
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="mt-12 flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm"
      >
        {/* Show a few custom emojis instead of generic 👥 */}
        <div className="flex -space-x-2">
          {customEmojis.slice(0, 3).map((emoji) => (
            <img
              key={emoji.url}
              src={proxyImageUrl(emoji.url)}
              alt={emoji.name}
              className="w-7 h-7 rounded-full bg-white/20 object-contain"
            />
          ))}
        </div>
          <span className="text-white/80 font-medium">
            by <span className="text-white font-bold">{totalCreators}</span> creators
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
