"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { WrappedStats, PersonalWrappedStats } from "@/lib/services/wrapped-service"
import { Emoji } from "@/lib/services/emoji-service"
import { useTrack } from "@/lib/hooks/use-track"
import { IntroSlide } from "./slides/intro-slide"
import { CountSlide } from "./slides/count-slide"
import { CreatorsSlide } from "./slides/creators-slide"
import { PersonalSlide } from "./slides/personal-slide"
import { PeakSlide } from "./slides/peak-slide"
import { StatsSlide } from "./slides/stats-slide"
import { FinaleSlide } from "./slides/finale-slide"
import { Button } from "@/components/ui/button"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { proxyImageUrl } from "@/lib/utils/image-proxy"

interface WrappedStoryProps {
  stats: WrappedStats
  personalStats: PersonalWrappedStats | null
  workspaceName: string
  onComplete: () => void
  onSkipToShare: () => void
  allYearEmojis?: Emoji[] // All emojis from the year for the background grid
}

// Emoji grid background component
function EmojiGridBackground({ emojis }: { emojis: Emoji[] }) {
  // Shuffle emojis for variety and fill enough to cover the screen
  const shuffledEmojis = useMemo(() => {
    const shuffled = [...emojis].sort(() => Math.random() - 0.5)
    // Repeat to fill the grid (need ~100 items for a nice grid)
    const targetCount = 120
    const repeated: Emoji[] = []
    while (repeated.length < targetCount && shuffled.length > 0) {
      repeated.push(...shuffled)
    }
    return repeated.slice(0, targetCount)
  }, [emojis])

  if (shuffledEmojis.length === 0) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="grid grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3 p-4 opacity-[0.12]">
        {shuffledEmojis.map((emoji, i) => (
          <motion.img
            key={`bg-${emoji.url}-${i}`}
            src={proxyImageUrl(emoji.url)}
            alt=""
            className="w-8 h-8 md:w-10 md:h-10 object-contain"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              rotate: (Math.random() - 0.5) * 10 // Slight random rotation
            }}
            transition={{
              delay: i * 0.01,
              duration: 0.3
            }}
          />
        ))}
      </div>
    </div>
  )
}

const BASE_SLIDES = ["intro", "count", "creators"] as const
const PERSONAL_SLIDE = ["personal"] as const
const END_SLIDES = ["peak", "stats", "finale"] as const

type SlideType = "intro" | "count" | "creators" | "personal" | "peak" | "stats" | "finale"

// Gradient backgrounds for each slide
const SLIDE_GRADIENTS: Record<SlideType, string> = {
  intro: "from-violet-900 via-purple-900 to-fuchsia-900",
  count: "from-blue-900 via-indigo-900 to-purple-900",
  creators: "from-amber-900 via-orange-900 to-red-900",
  personal: "from-cyan-900 via-blue-900 to-indigo-900",
  peak: "from-emerald-900 via-teal-900 to-cyan-900",
  stats: "from-pink-900 via-rose-900 to-red-900",
  finale: "from-violet-900 via-purple-900 to-fuchsia-900",
}

export function WrappedStory({ stats, personalStats, workspaceName, onComplete, onSkipToShare, allYearEmojis = [] }: WrappedStoryProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(1)
  const track = useTrack()
  const trackedSlides = useRef<Set<string>>(new Set())

  // Build slides array dynamically - include personal slide only if user has data
  const SLIDES: SlideType[] = useMemo(() => {
    if (personalStats) {
      return [...BASE_SLIDES, ...PERSONAL_SLIDE, ...END_SLIDES]
    }
    return [...BASE_SLIDES, ...END_SLIDES]
  }, [personalStats])

  const totalSlides = SLIDES.length

  // Track slide views
  useEffect(() => {
    const slideType = SLIDES[currentSlide]
    const slideKey = `${slideType}-${currentSlide}`

    // Only track first view of each slide
    if (!trackedSlides.current.has(slideKey)) {
      trackedSlides.current.add(slideKey)
      track("wrapped_slide_viewed", {
        slide_type: slideType,
        slide_index: currentSlide,
        total_slides: totalSlides,
        year: stats.year,
      })
    }
  }, [currentSlide, SLIDES, totalSlides, track, stats.year])

  // Extract custom emojis from stats to use in animations instead of standard Unicode emojis
  const customEmojis = useMemo(() => {
    const emojis: Emoji[] = []
    const seenUrls = new Set<string>()

    // Collect emojis from top creators
    stats.topCreators.forEach((creator) => {
      creator.topEmojis.forEach((emoji) => {
        if (!seenUrls.has(emoji.url)) {
          seenUrls.add(emoji.url)
          emojis.push(emoji)
        }
      })
    })

    // Add emojis from busiest day
    stats.busiestDay.emojis.forEach((emoji) => {
      if (!seenUrls.has(emoji.url)) {
        seenUrls.add(emoji.url)
        emojis.push(emoji)
      }
    })

    // Add first and last emoji of year
    if (stats.funStats.firstEmojiOfYear && !seenUrls.has(stats.funStats.firstEmojiOfYear.url)) {
      emojis.push(stats.funStats.firstEmojiOfYear)
    }
    if (stats.funStats.lastEmojiOfYear && !seenUrls.has(stats.funStats.lastEmojiOfYear.url)) {
      emojis.push(stats.funStats.lastEmojiOfYear)
    }

    return emojis.slice(0, 30) // Limit for performance
  }, [stats])

  const goToNext = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setDirection(1)
      setCurrentSlide((prev) => prev + 1)
      track("wrapped_navigation", {
        action: "next",
        from_slide: SLIDES[currentSlide],
        to_slide: SLIDES[currentSlide + 1],
        slide_index: currentSlide + 1,
        year: stats.year,
      })
    } else {
      onComplete()
      onSkipToShare()
    }
  }, [currentSlide, totalSlides, onComplete, onSkipToShare, track, SLIDES, stats.year])

  const goToPrev = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1)
      setCurrentSlide((prev) => prev - 1)
      track("wrapped_navigation", {
        action: "prev",
        from_slide: SLIDES[currentSlide],
        to_slide: SLIDES[currentSlide - 1],
        slide_index: currentSlide - 1,
        year: stats.year,
      })
    }
  }, [currentSlide, track, SLIDES, stats.year])

  const goToSlide = useCallback(
    (index: number) => {
      setDirection(index > currentSlide ? 1 : -1)
      track("wrapped_navigation", {
        action: "jump",
        from_slide: SLIDES[currentSlide],
        to_slide: SLIDES[index],
        slide_index: index,
        year: stats.year,
      })
      setCurrentSlide(index)
    },
    [currentSlide, track, SLIDES, stats.year]
  )

  const handleExit = useCallback((method: "close_button" | "escape_key" | "skip_to_share") => {
    track("wrapped_story_exited", {
      exit_method: method,
      exit_slide: SLIDES[currentSlide],
      slides_viewed: trackedSlides.current.size,
      total_slides: totalSlides,
      year: stats.year,
    })
  }, [track, SLIDES, currentSlide, totalSlides, stats.year])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault()
        goToNext()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        goToPrev()
      } else if (e.key === "Escape") {
        handleExit("escape_key")
        onSkipToShare()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goToNext, goToPrev, onSkipToShare, handleExit])

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  }

  const currentSlideType = SLIDES[currentSlide]

  const renderSlide = () => {
    switch (currentSlideType) {
      case "intro":
        return <IntroSlide year={stats.year} workspaceName={workspaceName} onContinue={goToNext} customEmojis={customEmojis} />
      case "count":
        return <CountSlide totalEmojis={stats.overview.totalEmojis} totalCreators={stats.overview.totalCreators} customEmojis={customEmojis} workspaceName={workspaceName} year={stats.year} />
      case "creators":
        return <CreatorsSlide topCreators={stats.topCreators} workspaceName={workspaceName} year={stats.year} />
      case "personal":
        return personalStats ? <PersonalSlide personalStats={personalStats} workspaceName={workspaceName} year={stats.year} /> : null
      case "peak":
        return (
          <PeakSlide
            busiestDay={stats.busiestDay}
            peakDayOfWeek={stats.peakDayOfWeek}
            monthlyBreakdown={stats.monthlyBreakdown}
            workspaceName={workspaceName}
            year={stats.year}
          />
        )
      case "stats":
        return <StatsSlide funStats={stats.funStats} overview={stats.overview} growth={stats.growth} workspaceName={workspaceName} year={stats.year} />
      case "finale":
        return (
          <FinaleSlide
            stats={stats}
            workspaceName={workspaceName}
            onShare={onSkipToShare}
            customEmojis={customEmojis}
          />
        )
      default:
        return null
    }
  }

  // Use allYearEmojis for background, fall back to customEmojis if not provided
  const backgroundEmojis = allYearEmojis.length > 0 ? allYearEmojis : customEmojis

  return (
    <div
      className={cn(
        "relative min-h-[calc(100vh-8rem)] -m-4 md:-m-6 bg-gradient-to-br transition-colors duration-1000",
        SLIDE_GRADIENTS[currentSlideType]
      )}
    >
      {/* Emoji grid background - layer 1 (above gradient, below content) */}
      <div className="absolute inset-0 overflow-hidden">
        <EmojiGridBackground emojis={backgroundEmojis} />
      </div>

      {/* Vignette overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.3) 100%)",
        }}
      />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Main content wrapper */}
      <div className="relative z-10 flex flex-col min-h-[calc(100vh-8rem)]">
        {/* Top controls */}
        <div className="flex items-center justify-between p-4">
          <Link href="/wrapped" onClick={(e) => { e.preventDefault(); handleExit("close_button"); window.history.back(); }}>
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => {
              handleExit("skip_to_share")
              onSkipToShare()
            }}
          >
            Skip to Share
          </Button>
        </div>

        {/* Main slide area - click to advance */}
        <div className="flex-1 flex items-center justify-center relative" onClick={goToNext}>
          {/* Navigation arrows (desktop) */}
          <div className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "text-white/50 hover:text-white hover:bg-white/10 transition-opacity",
                currentSlide === 0 && "opacity-0 pointer-events-none"
              )}
              onClick={(e) => {
                e.stopPropagation()
                goToPrev()
              }}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
          </div>
          <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/50 hover:text-white hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation()
                goToNext()
              }}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="w-full h-full flex items-center justify-center p-6"
            >
              {renderSlide()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 p-4">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                goToSlide(index)
              }}
              className={cn(
                "rounded-full transition-all duration-300",
                index === currentSlide
                  ? "bg-white w-6 h-2"
                  : index < currentSlide
                    ? "bg-white/60 w-2 h-2"
                    : "bg-white/30 w-2 h-2"
              )}
            />
          ))}
        </div>

        {/* Tap hint on intro */}
        {currentSlide === 0 && (
          <motion.div
            className="text-center text-white/50 text-sm pb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.5 }}
          >
            Tap anywhere to continue
          </motion.div>
        )}
      </div>
    </div>
  )
}
