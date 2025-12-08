"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { WrappedStats, PersonalWrappedStats } from "@/lib/services/wrapped-service"
import { Emoji } from "@/lib/services/emoji-service"
import { useTrack } from "@/lib/hooks/use-track"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import { IntroSlide } from "./slides/intro-slide"
import { CountSlide } from "./slides/count-slide"
import { CreatorsSlide } from "./slides/creators-slide"
import { PersonalSlide } from "./slides/personal-slide"
import { QuizSlide } from "./slides/quiz-slide"
import { VibeSlide } from "./slides/vibe-slide"
import { HaikuSlide } from "./slides/haiku-slide"
import { MovieSlide } from "./slides/movie-slide"
import { PeakSlide } from "./slides/peak-slide"
import { EmojiMonthSlide } from "./slides/emoji-month-slide"
import { PatternsSlide } from "./slides/patterns-slide"
import { FortuneSlide } from "./slides/fortune-slide"
import { StatsSlide } from "./slides/stats-slide"
import { FinaleSlide } from "./slides/finale-slide"
import { LeaderboardSlide } from "./slides/leaderboard-slide"
import { MilestonesSlide } from "./slides/milestones-slide"
import { Button } from "@/components/ui/button"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { FloatingEmojisBackground } from "./floating-emojis-background"
import { LiquidBackground } from "./liquid-background"
import { LiquidFilter } from "@/components/ui/liquid-filter"
import { WrappedPreloader } from "./wrapped-preloader"

interface WrappedStoryProps {
  stats: WrappedStats
  personalStats: PersonalWrappedStats | null
  workspaceName: string
  onComplete: () => void
  onSkipToShare: () => void
  allYearEmojis?: Emoji[] // All emojis from the year for the background grid
}

const INTRO_SLIDES = ["intro"] as const
const QUIZ_SLIDES = ["quiz-workspace", "quiz-funfacts"] as const
const REVEAL_SLIDES = ["count", "creators"] as const
const PERSONAL_SLIDE = ["personal"] as const
const LEADERBOARD_SLIDE = ["leaderboard"] as const
const MILESTONES_SLIDE = ["milestones"] as const
const FUN_SLIDES = ["vibe", "haiku", "movie"] as const
const MIDDLE_SLIDES = ["peak", "emoji-month", "patterns", "fortune"] as const
const END_SLIDES = ["stats", "finale"] as const

type SlideType = "intro" | "count" | "creators" | "personal" | "quiz-workspace" | "quiz-funfacts" | "leaderboard" | "milestones" | "vibe" | "haiku" | "movie" | "peak" | "emoji-month" | "patterns" | "fortune" | "stats" | "finale"

export function WrappedStory({ stats, personalStats, workspaceName, onComplete, onSkipToShare, allYearEmojis = [] }: WrappedStoryProps) {
  const router = useRouter()
  const [isPreloading, setIsPreloading] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(1)
  const [quizAnswered, setQuizAnswered] = useState<Record<string, boolean>>({})
  const [quizNeedsAttention, setQuizNeedsAttention] = useState(false)
  const track = useTrack()
  const trackedSlides = useRef<Set<string>>(new Set())
  const shouldReduceAnimations = useShouldReduceAnimations()

  // Build slides array dynamically - include personal slide only if user has data
  // Quiz slides come BEFORE reveal slides so users are quizzed before seeing the answers
  // Milestones slide only if there are milestones (at least 100 emojis)
  const hasMilestones = stats.funStats?.milestones && stats.funStats.milestones.length > 0
  const SLIDES: SlideType[] = useMemo(() => {
    const milestonesSlides = hasMilestones ? MILESTONES_SLIDE : []
    if (personalStats) {
      return [...INTRO_SLIDES, ...QUIZ_SLIDES, ...REVEAL_SLIDES, ...PERSONAL_SLIDE, ...LEADERBOARD_SLIDE, ...milestonesSlides, ...FUN_SLIDES, ...MIDDLE_SLIDES, ...END_SLIDES]
    }
    return [...INTRO_SLIDES, ...QUIZ_SLIDES, ...REVEAL_SLIDES, ...LEADERBOARD_SLIDE, ...milestonesSlides, ...FUN_SLIDES, ...MIDDLE_SLIDES, ...END_SLIDES]
  }, [personalStats, hasMilestones])

  const totalSlides = SLIDES.length

  // Check if current slide is a quiz that hasn't been answered
  const isQuizSlide = (slideType: SlideType) => slideType === "quiz-workspace" || slideType === "quiz-funfacts"
  const currentSlideType = SLIDES[currentSlide]
  const isCurrentQuizUnanswered = isQuizSlide(currentSlideType) && !quizAnswered[currentSlideType]

  // Handler for when a quiz is answered
  const handleQuizAnswered = useCallback((quizType: string) => {
    setQuizAnswered(prev => ({ ...prev, [quizType]: true }))
  }, [])

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

  // Extract and distribute distinct emojis across slides to ensure variety
  // Prioritize user's own emojis if available
  const { introEmojis, countEmojis, statsEmojis, finaleEmojis } = useMemo(() => {
    // 1. GATHER SOURCE EMOJIS
    const userEmojis: Emoji[] = []
    const communityEmojis: Emoji[] = []
    const seenUrls = new Set<string>()

    // Helper to add unique emojis
    const addEmoji = (emoji: Emoji, targetArray: Emoji[]) => {
      if (emoji && emoji.url && !seenUrls.has(emoji.url)) {
        seenUrls.add(emoji.url)
        targetArray.push(emoji)
      }
    }

    // A. Collect User Emojis (from allYearEmojis if filtered, or specific stats)
    if (personalStats?.userId && allYearEmojis.length > 0) {
      allYearEmojis.forEach(emoji => {
        if (emoji.user_id === personalStats.userId) {
          addEmoji(emoji, userEmojis)
        }
      })
    }

    // B. Collect Community/Top Emojis (from stats)
    // Top creators' emojis
    stats.topCreators.forEach((creator) => {
      creator.topEmojis.forEach((emoji) => addEmoji(emoji, communityEmojis))
    })
    // Busiest day emojis
    stats.busiestDay.emojis.forEach((emoji) => addEmoji(emoji, communityEmojis))
    // Notable moments
    if (stats.funStats.firstEmojiOfYear) addEmoji(stats.funStats.firstEmojiOfYear, communityEmojis)
    if (stats.funStats.lastEmojiOfYear) addEmoji(stats.funStats.lastEmojiOfYear, communityEmojis)

    // Fallback: Fill community pool from allYearEmojis if we're short
    if (communityEmojis.length < 50 && allYearEmojis.length > 0) {
      // Shuffle/random pick from allYearEmojis to fill gaps
      const shuffled = [...allYearEmojis].sort(() => 0.5 - Math.random())
      for (const emoji of shuffled) {
        if (communityEmojis.length >= 100) break;
        addEmoji(emoji, communityEmojis)
      }
    }

    // 2. CREATE A MASTER PRIORITY LIST
    // Interleave user emojis with best community ones, but bias heavily towards user
    // If user has enough emojis, use them almost exclusively for "Personal" touches

    // Shuffle arrays for randomness on each view
    const shuffledUser = [...userEmojis].sort(() => 0.5 - Math.random())
    const shuffledCommunity = [...communityEmojis].sort(() => 0.5 - Math.random())

    // 3. DISTRIBUTE TO SLIDES (Greedy allocation of unique emojis)

    // Intro: Needs ~12-16 high quality ones. 
    // Mix: 70% User, 30% Community
    const introSlice = [
      ...shuffledUser.slice(0, 10),
      ...shuffledCommunity.slice(0, 6)
    ].slice(0, 16)

    // Count: Needs ~32 for marquee. 
    // Use the next batch of user emojis + community filler
    const usedInIntro = new Set(introSlice.map(e => e.url))

    const availableUserForCount = shuffledUser.filter(e => !usedInIntro.has(e.url))
    const availableCommForCount = shuffledCommunity.filter(e => !usedInIntro.has(e.url))

    const countSlice = [
      ...availableUserForCount.slice(0, 20),
      ...availableCommForCount.slice(0, 20)
    ].slice(0, 32)

    // Stats: Needs ~8 for showcase
    const usedInCount = new Set([...countSlice.map(e => e.url), ...introSlice.map(e => e.url)])
    const availableUserForStats = shuffledUser.filter(e => !usedInCount.has(e.url))
    const availableCommForStats = shuffledCommunity.filter(e => !usedInCount.has(e.url))

    const statsSlice = [
      ...availableUserForStats.slice(0, 6),
      ...availableCommForStats.slice(0, 4)
    ].slice(0, 8)

    // Finale: Needs "All Year" vibe. Can reuse or pick remaining.
    // Let's grab a random mix of EVERYTHING to feel like a recap + any unused gems
    const usedEverywhere = new Set([...usedInCount, ...statsSlice.map(e => e.url)])
    const unusedUser = shuffledUser.filter(e => !usedEverywhere.has(e.url))
    const unusedComm = shuffledCommunity.filter(e => !usedEverywhere.has(e.url))

    const finaleSlice = [
      ...unusedUser,
      ...unusedComm,
      ...introSlice, // Reuse hits if we run out
      ...countSlice
    ].slice(0, 50)

    return {
      introEmojis: introSlice,
      countEmojis: countSlice,
      statsEmojis: statsSlice,
      finaleEmojis: finaleSlice
    }
  }, [stats, personalStats, allYearEmojis]) // Re-run when base data changes

  const goToNext = useCallback(() => {
    // Block navigation if current slide is an unanswered quiz
    const slideType = SLIDES[currentSlide]
    if (isQuizSlide(slideType) && !quizAnswered[slideType]) {
      // Show visual feedback that quiz needs to be answered
      setQuizNeedsAttention(true)
      setTimeout(() => setQuizNeedsAttention(false), 600)
      return
    }

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
      // Track story completion
      track("wrapped_story_completed", {
        total_slides: totalSlides,
        slides_viewed: trackedSlides.current.size,
        year: stats.year,
      })
      onComplete()
      onSkipToShare()
    }
  }, [currentSlide, totalSlides, onComplete, onSkipToShare, track, SLIDES, stats.year, quizAnswered])

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
      // Block forward navigation if current slide is an unanswered quiz
      if (index > currentSlide) {
        const slideType = SLIDES[currentSlide]
        if (isQuizSlide(slideType) && !quizAnswered[slideType]) {
          // Show visual feedback that quiz needs to be answered
          setQuizNeedsAttention(true)
          setTimeout(() => setQuizNeedsAttention(false), 600)
          return
        }
      }

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
    [currentSlide, track, SLIDES, stats.year, quizAnswered]
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
        // goToNext already handles quiz blocking
        goToNext()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        goToPrev()
      } else if (e.key === "Escape") {
        handleExit("escape_key")
        router.push("/wrapped")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goToNext, goToPrev, router, handleExit])

  // Simpler fade transitions on mobile for better performance
  const slideVariants = shouldReduceAnimations
    ? {
      enter: { opacity: 0 },
      center: { opacity: 1 },
      exit: { opacity: 0 },
    }
    : {
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

  const renderSlide = () => {
    switch (currentSlideType) {
      case "intro":
        return <IntroSlide year={stats.year} workspaceName={workspaceName} onContinue={goToNext} customEmojis={introEmojis} />
      case "count":
        return <CountSlide totalEmojis={stats.overview.totalEmojis} totalCreators={stats.overview.totalCreators} customEmojis={countEmojis} workspaceName={workspaceName} year={stats.year} />
      case "creators":
        return <CreatorsSlide topCreators={stats.topCreators} workspaceName={workspaceName} year={stats.year} />
      case "personal":
        return personalStats ? <PersonalSlide stats={stats} personalStats={personalStats} workspaceName={workspaceName} year={stats.year} /> : null
      case "quiz-workspace":
        return (
          <QuizSlide
            stats={stats}
            personalStats={personalStats}
            workspaceName={workspaceName}
            year={stats.year}
            quizType="workspace"
            onAnswered={() => handleQuizAnswered("quiz-workspace")}
            needsAttention={quizNeedsAttention}
          />
        )
      case "quiz-funfacts":
        return (
          <QuizSlide
            stats={stats}
            personalStats={personalStats}
            workspaceName={workspaceName}
            year={stats.year}
            quizType="funfacts"
            onAnswered={() => handleQuizAnswered("quiz-funfacts")}
            needsAttention={quizNeedsAttention}
          />
        )
      case "leaderboard":
        return (
          <LeaderboardSlide
            topCreators={stats.topCreators}
            workspaceName={workspaceName}
            year={stats.year}
            personalStats={personalStats}
          />
        )
      case "milestones":
        return (
          <MilestonesSlide
            milestones={stats.funStats?.milestones || []}
            workspaceName={workspaceName}
            year={stats.year}
          />
        )
      case "vibe":
        return (
          <VibeSlide
            stats={stats}
            personalStats={personalStats}
            workspaceName={workspaceName}
            year={stats.year}
            customEmojis={statsEmojis}
          />
        )
      case "haiku":
        return (
          <HaikuSlide
            stats={stats}
            personalStats={personalStats}
            workspaceName={workspaceName}
            year={stats.year}
            customEmojis={statsEmojis}
          />
        )
      case "movie":
        return (
          <MovieSlide
            stats={stats}
            personalStats={personalStats}
            workspaceName={workspaceName}
            year={stats.year}
            customEmojis={introEmojis}
          />
        )
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
      case "emoji-month":
        return (
          <EmojiMonthSlide
            monthlyTopCreators={stats.monthlyTopCreators}
            workspaceName={workspaceName}
            year={stats.year}
            customEmojis={statsEmojis}
          />
        )
      case "patterns":
        return (
          <PatternsSlide
            stats={stats}
            personalStats={personalStats}
            workspaceName={workspaceName}
            year={stats.year}
          />
        )
      case "fortune":
        return (
          <FortuneSlide
            stats={stats}
            personalStats={personalStats}
            workspaceName={workspaceName}
            year={stats.year}
            customEmojis={statsEmojis}
          />
        )
      case "stats":
        return <StatsSlide funStats={stats.funStats} overview={stats.overview} growth={stats.growth} workspaceName={workspaceName} year={stats.year} customEmojis={statsEmojis} />
      case "finale":
        return (
          <FinaleSlide
            stats={stats}
            workspaceName={workspaceName}
            onShare={onSkipToShare}
            customEmojis={finaleEmojis}
            allYearEmojis={allYearEmojis}
          />
        )
      default:
        return null
    }
  }

  // Use allYearEmojis for background, fall back to finaleEmojis (broadest selection)
  const backgroundEmojis = allYearEmojis.length > 0 ? allYearEmojis : finaleEmojis

  // Show preloader while assets are loading
  if (isPreloading) {
    return (
      <div
        className={cn(
          "relative h-[calc(100vh-3rem)] -m-4 md:-m-6 bg-black overflow-hidden",
          "pt-safe pb-safe"
        )}
      >
        <WrappedPreloader
          stats={stats}
          personalStats={personalStats}
          allYearEmojis={allYearEmojis}
          workspaceName={workspaceName}
          year={stats.year}
          onComplete={() => setIsPreloading(false)}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative h-[calc(100vh-3rem)] -m-4 md:-m-6 bg-black overflow-hidden", // Fixed height to fill remaining viewport (100vh - header)
        "pt-safe pb-safe" // Safe area padding for iOS notch/home indicator
      )}
    >
      {/* Liquid Background - layer 0 (deepest) */}
      <LiquidBackground />
      <LiquidFilter />

      {/* Emoji float background - layer 1 (floating in liquid) */}
      <div className="absolute inset-0 overflow-hidden mix-blend-overlay">
        <FloatingEmojisBackground emojis={backgroundEmojis} opacity={shouldReduceAnimations ? 0 : 0.6} />
      </div>

      {/* Vignette overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      {/* Noise texture overlay - using CSS class from globals */}
      <div className="wrapped-noise absolute inset-0 pointer-events-none z-0" />

      {/* Main content wrapper */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top controls */}
        <div className="flex items-center justify-between p-4">
          <Link href="/wrapped" onClick={(e) => { e.preventDefault(); handleExit("close_button"); router.push("/wrapped"); }}>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white hover:bg-white/10 focus:ring-2 focus:ring-white focus:outline-none"
              aria-label="Close wrapped experience"
            >
              <X className="w-5 h-5" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10 focus:ring-2 focus:ring-white focus:outline-none"
            onClick={() => {
              handleExit("skip_to_share")
              onSkipToShare()
            }}
          >
            Skip to Share
          </Button>
        </div>

        {/* Mobile Navigation Overlays - Edge-only tap zones (1/5 width instead of 1/3) */}
        {/* Reduced zone width prevents accidental navigation when interacting with content */}
        <div className="md:hidden absolute inset-0 flex z-20 pointer-events-none">
          {/* Left edge - previous slide */}
          <div
            className="w-1/5 h-full pointer-events-auto active:bg-white/20 transition-colors bg-gradient-to-r from-white/[0.02] to-transparent"
            onClick={(e) => { e.stopPropagation(); goToPrev(); }}
          />
          {/* Center zone - 60% width, passes clicks through for interactables */}
          <div className="w-3/5 h-full" />
          {/* Right edge - next slide */}
          <div
            className="w-1/5 h-full pointer-events-auto active:bg-white/20 transition-colors bg-gradient-to-l from-white/[0.02] to-transparent"
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
          />
        </div>

        {/* Main slide area */}
        <div className="flex-1 flex items-center justify-center relative w-full h-full">
          {/* Navigation arrows (desktop) - Always visible, larger */}
          <div className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-30">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous slide"
              className={cn(
                "w-12 h-12 rounded-full bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-all backdrop-blur-sm focus:ring-2 focus:ring-white focus:outline-none",
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
          <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-30">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next slide"
              className={cn(
                "w-12 h-12 rounded-full bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-all backdrop-blur-sm focus:ring-2 focus:ring-white focus:outline-none",
                currentSlide === totalSlides - 1 && "opacity-0 pointer-events-none"
              )}
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
              className="w-full h-full flex items-center justify-center p-4 sm:p-6 pb-12 sm:pb-16" // added padding bottom for fixed dots
            >
              {renderSlide()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots - Fixed Absolute Position at Bottom */}
        <div className="absolute bottom-safe z-30 w-full flex items-center justify-center pointer-events-none pb-safe">
          <div className="flex items-center justify-center gap-1 p-4 pointer-events-auto">
            {SLIDES.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation()
                  goToSlide(index)
                }}
                aria-label={`Go to slide ${index + 1} of ${SLIDES.length}`}
                className="p-3 -m-2 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full"
              >
                <div
                  className={cn(
                    "rounded-full transition-all duration-300 shadow-sm",
                    index === currentSlide
                      ? "bg-white w-6 h-1.5 sm:w-8 sm:h-2 box-shadow-glow"
                      : index < currentSlide
                        ? "bg-white/60 w-1.5 h-1.5 sm:w-2 sm:h-2 hover:bg-white/80"
                        : "bg-white/20 w-1.5 h-1.5 sm:w-2 sm:h-2 hover:bg-white/40"
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Tap hint on intro */}
        {currentSlide === 0 && (
          <motion.div
            className="text-center text-[var(--wrapped-text-muted)] text-sm pb-4"
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
