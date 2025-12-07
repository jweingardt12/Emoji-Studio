"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ProgressCircle } from "@/components/ui/progress-circle"
import { GradientText } from "@/components/ui/gradient-text"
import { collectWrappedAssets, preloadImages } from "@/lib/utils/wrapped-asset-collector"
import { WrappedStats, PersonalWrappedStats } from "@/lib/services/wrapped-service"
import { Emoji } from "@/lib/services/emoji-service"
import { proxyImageUrl, hasValidUrl } from "@/lib/utils/image-proxy"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"

interface WrappedPreloaderProps {
  stats: WrappedStats
  personalStats?: PersonalWrappedStats | null
  allYearEmojis: Emoji[]
  workspaceName: string
  year: number
  onComplete: () => void
}

// Witty loading messages that cycle during preload
const LOADING_MESSAGES = [
  "Gathering your emoji memories...",
  "Counting pixels of joy...",
  "Measuring emoji energy levels...",
  "Calculating your vibe score...",
  "Loading your year in emojis...",
  "Preparing the confetti...",
  "Warming up the animations...",
]

export function WrappedPreloader({
  stats,
  personalStats,
  allYearEmojis,
  workspaceName,
  year,
  onComplete,
}: WrappedPreloaderProps) {
  const [progress, setProgress] = useState(0)
  const [loadedCount, setLoadedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [messageIndex, setMessageIndex] = useState(0)
  const [previewEmojis, setPreviewEmojis] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const shouldReduceAnimations = useShouldReduceAnimations()

  // Collect all assets that need preloading
  const assets = useMemo(() => {
    return collectWrappedAssets(stats, allYearEmojis, personalStats)
  }, [stats, allYearEmojis, personalStats])

  // Cycle through loading messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  // Handle progress updates
  const handleProgress = useCallback((loaded: number, total: number) => {
    setLoadedCount(loaded)
    setProgress(Math.round((loaded / total) * 100))

    // Add preview emojis as they load (show first 5)
    if (loaded <= 5) {
      setPreviewEmojis((prev) => {
        const url = assets.urls[loaded - 1]
        if (url && !prev.includes(url)) {
          return [...prev, url]
        }
        return prev
      })
    }
  }, [assets.urls])

  // Start preloading
  useEffect(() => {
    const urls = assets.urls
    setTotalCount(urls.length)

    if (urls.length === 0) {
      // No assets to preload, complete immediately
      onComplete()
      return
    }

    // Timeout fallback - don't wait forever
    // Increase timeout for larger emoji sets (30s max)
    const timeoutDuration = Math.min(30000, Math.max(15000, urls.length * 100))
    const timeout = setTimeout(() => {
      console.log("[WrappedPreloader] Timeout reached, proceeding anyway")
      setIsComplete(true)
    }, timeoutDuration)

    const startLoading = async () => {
      // Use higher concurrency (10) for larger emoji sets to load faster
      const concurrency = urls.length > 100 ? 10 : 6
      await preloadImages(urls, concurrency, handleProgress)
      clearTimeout(timeout)
      setIsComplete(true)
    }

    startLoading()

    return () => clearTimeout(timeout)
  }, [assets.urls, handleProgress, onComplete])

  // Smooth transition out when complete
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(onComplete, 400) // Allow exit animation
      return () => clearTimeout(timer)
    }
  }, [isComplete, onComplete])

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: "linear-gradient(135deg, var(--wrapped-bg-start) 0%, var(--wrapped-bg-end) 100%)",
          }}
        >
          {/* Noise texture overlay */}
          <div className="wrapped-noise absolute inset-0 pointer-events-none" />

          {/* Subtle gradient orbs in background */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full blur-3xl opacity-20"
              style={{ background: "var(--wrapped-accent-purple)" }}
              animate={{
                scale: [1, 1.2, 1],
                x: [0, 50, 0],
                y: [0, 30, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full blur-3xl opacity-20"
              style={{ background: "var(--wrapped-accent-cyan)" }}
              animate={{
                scale: [1.2, 1, 1.2],
                x: [0, -50, 0],
                y: [0, -30, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>

          {/* Year badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="absolute top-8 sm:top-12"
          >
            <span className="wrapped-label text-sm sm:text-base">
              Slack Emojis Wrapped: {year}
            </span>
          </motion.div>

          {/* Main content */}
          <div className="relative flex flex-col items-center">
            {/* Progress circle with percentage */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <ProgressCircle
                value={progress}
                size={140}
                strokeWidth={6}
                trackClassName="text-white/10"
                indicatorClassName="text-[var(--wrapped-accent-purple)]"
                className="drop-shadow-lg"
              >
                <motion.span
                  key={progress}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl font-bold text-white"
                  style={{ fontFamily: "var(--font-wrapped-display)" }}
                >
                  {progress}%
                </motion.span>
              </ProgressCircle>
            </motion.div>

            {/* Preview emojis floating around the progress circle */}
            {!shouldReduceAnimations && previewEmojis.length > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {previewEmojis.map((url, index) => {
                  const angle = (index * 72) - 90 // Distribute evenly in a circle
                  const radius = 100
                  const x = Math.cos((angle * Math.PI) / 180) * radius
                  const y = Math.sin((angle * Math.PI) / 180) * radius

                  return (
                    <motion.img
                      key={url}
                      src={url}
                      alt=""
                      className="absolute w-8 h-8 object-contain rounded-lg"
                      style={{
                        left: "50%",
                        top: "50%",
                        marginLeft: -16,
                        marginTop: -16,
                      }}
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{
                        opacity: 0.8,
                        scale: 1,
                        x,
                        y,
                      }}
                      transition={{
                        delay: index * 0.1,
                        type: "spring",
                        stiffness: 200,
                        damping: 15,
                      }}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Loading text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 text-center px-6"
          >
            <h2 className="wrapped-headline text-2xl sm:text-3xl mb-3">
              <GradientText
                colors={[
                  "var(--wrapped-accent-purple)",
                  "var(--wrapped-accent-cyan)",
                  "var(--wrapped-accent-orange)",
                  "var(--wrapped-accent-purple)",
                ]}
                animationSpeed={5}
              >
                {workspaceName}
              </GradientText>
            </h2>

            {/* Cycling message */}
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="wrapped-body text-base sm:text-lg opacity-80"
              >
                {LOADING_MESSAGES[messageIndex]}
              </motion.p>
            </AnimatePresence>

            {/* Progress details */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.5 }}
              className="wrapped-body text-xs sm:text-sm mt-4 opacity-50"
            >
              {loadedCount} of {totalCount} assets ready
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
