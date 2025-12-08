"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ProgressCircle } from "@/components/ui/progress-circle"
import { GradientText } from "@/components/ui/gradient-text"
import { collectWrappedAssets, preloadImages } from "@/lib/utils/wrapped-asset-collector"
import { WrappedStats, PersonalWrappedStats } from "@/lib/services/wrapped-service"
import { Emoji } from "@/lib/services/emoji-service"
import { proxyImageUrl, hasValidUrl } from "@/lib/utils/image-proxy"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import { Sparkles } from "lucide-react"

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

// Floating particle component
function FloatingParticle({ delay, duration, size, color }: { delay: number; duration: number; size: number; color: string }) {
  const randomX = Math.random() * 100
  const randomStartY = 100 + Math.random() * 20

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        background: color,
        left: `${randomX}%`,
        bottom: 0,
        filter: "blur(1px)",
      }}
      initial={{ y: 0, opacity: 0, scale: 0 }}
      animate={{
        y: [-randomStartY, -window.innerHeight - 100],
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1, 0.5],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  )
}

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

  // Refs to prevent race conditions with onComplete callback
  const onCompleteRef = useRef(onComplete)
  const hasCompletedRef = useRef(false)

  // Keep ref updated with latest callback
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Stable completion handler that prevents double-firing
  const handleComplete = useCallback(() => {
    if (!hasCompletedRef.current) {
      hasCompletedRef.current = true
      onCompleteRef.current()
    }
  }, [])

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

    // Add preview emojis as they load (show first 8 for more drama)
    if (loaded <= 8) {
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
      handleComplete()
      return
    }

    // Timeout fallback - don't wait forever
    const timeoutDuration = Math.min(30000, Math.max(15000, urls.length * 100))
    const timeout = setTimeout(() => {
      console.log("[WrappedPreloader] Timeout reached, proceeding anyway")
      setIsComplete(true)
    }, timeoutDuration)

    const startLoading = async () => {
      const concurrency = urls.length > 100 ? 10 : 6
      await preloadImages(urls, concurrency, handleProgress)
      clearTimeout(timeout)
      setIsComplete(true)
    }

    startLoading()

    return () => clearTimeout(timeout)
  }, [assets.urls, handleProgress, handleComplete])

  // Complete immediately when loading finishes
  useEffect(() => {
    if (isComplete) {
      handleComplete()
    }
  }, [isComplete, handleComplete])

  // Generate particles for the background
  const particles = useMemo(() => {
    if (shouldReduceAnimations) return []
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      delay: i * 0.3,
      duration: 4 + Math.random() * 3,
      size: 4 + Math.random() * 8,
      color: i % 3 === 0
        ? "var(--wrapped-accent-purple)"
        : i % 3 === 1
          ? "var(--wrapped-accent-cyan)"
          : "var(--wrapped-accent-orange)",
    }))
  }, [shouldReduceAnimations])

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.05,
            filter: "blur(10px)",
          }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: "linear-gradient(135deg, var(--wrapped-bg-start) 0%, var(--wrapped-bg-end) 100%)",
          }}
        >
          {/* Noise texture overlay */}
          <div className="wrapped-noise absolute inset-0 pointer-events-none" />

          {/* Floating particles */}
          {!shouldReduceAnimations && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {particles.map((p) => (
                <FloatingParticle key={p.id} {...p} />
              ))}
            </div>
          )}

          {/* Gradient orbs */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 rounded-full blur-3xl"
              style={{ background: "var(--wrapped-accent-purple)" }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.15, 0.25, 0.15],
                x: [0, 50, 0],
                y: [0, 30, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4 rounded-full blur-3xl"
              style={{ background: "var(--wrapped-accent-cyan)" }}
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.15, 0.25, 0.15],
                x: [0, -50, 0],
                y: [0, -30, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>

          {/* Year badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="absolute top-8 sm:top-12"
          >
            <span className="wrapped-label text-sm sm:text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Slack Emojis Wrapped: {year}
              <Sparkles className="w-4 h-4" />
            </span>
          </motion.div>

          {/* Main content */}
          <div className="relative flex flex-col items-center">
            {/* Progress circle */}
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
                  const angle = (index * 45) - 90 // Distribute evenly
                  const radius = 100 + (index % 2) * 20 // Alternate distances
                  const x = Math.cos((angle * Math.PI) / 180) * radius
                  const y = Math.sin((angle * Math.PI) / 180) * radius

                  return (
                    <motion.img
                      key={url}
                      src={url}
                      alt=""
                      className="absolute w-10 h-10 object-contain rounded-xl shadow-lg"
                      style={{
                        left: "50%",
                        top: "50%",
                        marginLeft: -20,
                        marginTop: -20,
                      }}
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: -180 }}
                      animate={{
                        opacity: 0.9,
                        scale: 1,
                        x,
                        y,
                        rotate: 0,
                      }}
                      transition={{
                        delay: index * 0.08,
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
