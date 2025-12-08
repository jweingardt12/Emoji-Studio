"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, XCircle } from "lucide-react"
import { WrappedStats, PersonalWrappedStats } from "@/lib/services/wrapped-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { useTrack } from "@/lib/hooks/use-track"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { EmojiHero } from "../emoji-hero"
import { Confetti, ConfettiRef } from "@/components/ui/confetti"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { useShouldReduceAnimations, getStaggerDelay, DRAMATIC_PRESETS } from "@/hooks/use-animation-tier"

interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  emoji?: { name: string; url: string }
  isPersonalityQuestion?: boolean // No wrong answer - all answers are valid
}

interface QuizSlideProps {
  stats: WrappedStats
  personalStats?: PersonalWrappedStats | null
  workspaceName: string
  year: number
  quizType: "workspace" | "funfacts"
  onAnswered?: () => void
  captureMode?: boolean
  needsAttention?: boolean
}

// Generate plausible wrong answers for numeric questions
function generateNumericOptions(correct: number): string[] {
  const options: number[] = [correct]
  const variance = Math.max(Math.floor(correct * 0.3), 5) // At least 30% variance or 5

  while (options.length < 4) {
    const offset = Math.floor(Math.random() * variance * 2) - variance
    const candidate = Math.max(1, correct + offset + (options.length * (Math.random() > 0.5 ? 1 : -1) * Math.floor(variance / 2)))
    if (!options.includes(Math.round(candidate)) && Math.round(candidate) !== correct) {
      options.push(Math.round(candidate))
    }
  }

  // Shuffle options
  return options.sort(() => Math.random() - 0.5).map(n => n.toLocaleString())
}

// Get rank category label
function getRankCategory(rank: number, totalCreators: number): string {
  const percentile = (rank / totalCreators) * 100
  if (rank <= 3) return "Top 3"
  if (rank <= 10) return "Top 10"
  if (percentile <= 25) return "Top 25%"
  if (percentile <= 50) return "Top 50%"
  return "Bottom Half"
}

// Generate personal behavior prediction questions (Quiz 1)
function generatePersonalPredictionQuestion(stats: WrappedStats, personalStats: PersonalWrappedStats | null | undefined): QuizQuestion {
  // Workspace-based fallback questions (when no personal stats)
  const workspaceFallbacks = [
    // Total emojis created
    () => {
      const total = stats.overview?.totalEmojis
      if (!total) return null
      const options = generateNumericOptions(total)
      return {
        question: "How many total emojis did the workspace create this year?",
        options,
        correctIndex: options.indexOf(total.toLocaleString()),
      }
    },
    // Busiest month
    () => {
      if (!stats.monthlyBreakdown || stats.monthlyBreakdown.length < 4) return null
      const peakMonth = stats.monthlyBreakdown.reduce((max, m) => m.count > max.count ? m : max, stats.monthlyBreakdown[0])
      const correct = peakMonth.month
      const wrongAnswers = stats.monthlyBreakdown
        .filter(m => m.month !== correct)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(m => m.month)
      const options = [correct, ...wrongAnswers].sort(() => Math.random() - 0.5)
      return {
        question: "What was the workspace's busiest month for emoji creation?",
        options,
        correctIndex: options.indexOf(correct),
      }
    },
    // Peak day of week
    () => {
      const correct = stats.peakDayOfWeek?.day
      if (!correct) return null
      const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
      const wrongDays = allDays.filter(d => d !== correct).sort(() => Math.random() - 0.5).slice(0, 3)
      const options = [correct, ...wrongDays].sort(() => Math.random() - 0.5)
      return {
        question: "What day of the week had the most emoji creation?",
        options,
        correctIndex: options.indexOf(correct),
      }
    },
  ]

  // If no personal stats, use workspace fallback
  if (!personalStats) {
    const shuffled = workspaceFallbacks.sort(() => Math.random() - 0.5)
    for (const generator of shuffled) {
      const question = generator()
      if (question) return question
    }
    // Ultimate fallback - total emojis (always works)
    const total = stats.overview?.totalEmojis || 100
    const options = generateNumericOptions(total)
    return {
      question: "How many total emojis did the workspace create this year?",
      options,
      correctIndex: options.indexOf(total.toLocaleString()),
    }
  }

  const questionTypes = [
    // Predict your rank
    () => {
      const rank = personalStats.rank
      const totalCreators = personalStats.totalCreators
      if (!rank || !totalCreators || totalCreators < 5) return null

      const correctCategory = getRankCategory(rank, totalCreators)
      const allCategories = ["Top 3", "Top 10", "Top 25%", "Top 50%", "Bottom Half"]
      const wrongCategories = allCategories.filter(c => c !== correctCategory)
      const options = [correctCategory, ...wrongCategories.slice(0, 3)].sort(() => Math.random() - 0.5)

      return {
        question: "How do you think you ranked among emoji creators?",
        options,
        correctIndex: options.indexOf(correctCategory),
      }
    },
    // Predict your busiest month
    () => {
      if (!personalStats.monthlyBreakdown || personalStats.monthlyBreakdown.length < 4) return null
      const peakMonth = personalStats.monthlyBreakdown.reduce((max, m) => m.count > max.count ? m : max, personalStats.monthlyBreakdown[0])
      if (peakMonth.count < 2) return null

      const correct = peakMonth.month
      const wrongAnswers = personalStats.monthlyBreakdown
        .filter(m => m.month !== correct)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(m => m.month)
      const options = [correct, ...wrongAnswers].sort(() => Math.random() - 0.5)

      return {
        question: "What was YOUR busiest month for creating emojis?",
        options,
        correctIndex: options.indexOf(correct),
      }
    },
    // Predict your favorite day of week
    () => {
      if (!personalStats.favoriteDayOfWeek) return null
      const correct = personalStats.favoriteDayOfWeek.day
      const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
      const wrongDays = allDays.filter(d => d !== correct).sort(() => Math.random() - 0.5).slice(0, 3)
      const options = [correct, ...wrongDays].sort(() => Math.random() - 0.5)

      return {
        question: "What day of the week did YOU create the most emojis?",
        options,
        correctIndex: options.indexOf(correct),
      }
    },
    // Predict your GIF percentage
    () => {
      const gifPct = personalStats.gifPercentage
      // Skip if undefined or 0% (not an interesting question)
      if (gifPct === undefined || gifPct < 1) return null
      const options = generateNumericOptions(gifPct).map(n => `${n}%`)
      const correctStr = `${gifPct.toLocaleString()}%`

      return {
        question: "What percentage of YOUR emojis are GIFs?",
        options,
        correctIndex: options.indexOf(correctStr),
      }
    },
    // Predict your contribution percentage
    () => {
      const pct = personalStats.percentageOfTotal
      if (!pct || pct < 1) return null
      const options = generateNumericOptions(pct).map(n => `${n}%`)
      const correctStr = `${pct.toLocaleString()}%`

      return {
        question: "What percentage of the workspace's emojis did YOU create?",
        options,
        correctIndex: options.indexOf(correctStr),
      }
    },
  ]

  // Try each question type until one works
  const shuffled = questionTypes.sort(() => Math.random() - 0.5)
  for (const generator of shuffled) {
    const question = generator()
    if (question) return question
  }

  // Use workspace fallback if personal questions failed
  const workspaceShuffled = workspaceFallbacks.sort(() => Math.random() - 0.5)
  for (const generator of workspaceShuffled) {
    const question = generator()
    if (question) return question
  }

  // Ultimate fallback
  const total = stats.overview?.totalEmojis || 100
  const options = generateNumericOptions(total)
  return {
    question: "How many total emojis did the workspace create this year?",
    options,
    correctIndex: options.indexOf(total.toLocaleString()),
  }
}

// Generate personal behavior/pattern questions (Quiz 2)
function generatePersonalBehaviorQuestion(stats: WrappedStats, personalStats: PersonalWrappedStats | null | undefined): QuizQuestion {
  // Workspace-based fallback questions (when no personal stats)
  const workspaceFallbacks = [
    // Workspace late night count
    () => {
      const lateNight = stats.funStats?.lateNightCount
      if (!lateNight || lateNight < 1) return null
      const options = generateNumericOptions(lateNight)
      return {
        question: "How many emojis were created between midnight and 5am?",
        options,
        correctIndex: options.indexOf(lateNight.toLocaleString()),
      }
    },
    // Workspace longest streak
    () => {
      const streak = stats.funStats?.longestStreak?.days
      if (!streak || streak < 2) return null
      const options = generateNumericOptions(streak).map(n => `${n} days`)
      const correctStr = `${streak.toLocaleString()} days`
      return {
        question: "What was the longest streak of consecutive days with new emojis?",
        options,
        correctIndex: options.indexOf(correctStr),
      }
    },
    // Most common word
    () => {
      if (!stats.funStats?.mostCommonWord) return null
      const correct = stats.funStats.mostCommonWord.word
      const topWords = stats.funStats.topWords || []
      const wrongAnswers = topWords
        .filter(w => w.word !== correct)
        .slice(0, 3)
        .map(w => w.word)
      while (wrongAnswers.length < 3) {
        const fillers = ["cat", "dog", "party", "face", "fire", "cool", "love", "happy"]
        const filler = fillers.find(f => f !== correct && !wrongAnswers.includes(f))
        if (filler) wrongAnswers.push(filler)
        else break
      }
      const options = [correct, ...wrongAnswers.slice(0, 3)].sort(() => Math.random() - 0.5)
      return {
        question: "What's the most common word in emoji names?",
        options: options.map(o => `"${o}"`),
        correctIndex: options.findIndex(o => o === correct),
      }
    },
    // GIF percentage
    () => {
      const gifPct = stats.overview?.gifPercentage
      // Skip if undefined or 0% (not an interesting question)
      if (gifPct === undefined || gifPct < 1) return null
      const options = generateNumericOptions(gifPct).map(n => `${n}%`)
      const correctStr = `${gifPct.toLocaleString()}%`
      return {
        question: "What percentage of the workspace's emojis are GIFs?",
        options,
        correctIndex: options.indexOf(correctStr),
      }
    },
  ]

  // If no personal stats, use workspace fallback
  if (!personalStats) {
    const shuffled = workspaceFallbacks.sort(() => Math.random() - 0.5)
    for (const generator of shuffled) {
      const question = generator()
      if (question) return question
    }
    // Ultimate fallback
    const lateNight = stats.funStats?.lateNightCount || 10
    const options = generateNumericOptions(lateNight)
    return {
      question: "How many emojis were created between midnight and 5am?",
      options,
      correctIndex: options.indexOf(lateNight.toLocaleString()),
    }
  }

  const questionTypes = [
    // Your longest streak
    () => {
      const streak = personalStats.personalStreak?.days
      if (!streak || streak < 2) return null
      const options = generateNumericOptions(streak).map(n => `${n} days`)
      const correctStr = `${streak.toLocaleString()} days`

      return {
        question: "What was YOUR longest streak of consecutive days creating emojis?",
        options,
        correctIndex: options.indexOf(correctStr),
      }
    },
    // Your late night count
    () => {
      const lateNight = personalStats.lateNightCount
      if (!lateNight || lateNight < 1) return null
      const options = generateNumericOptions(lateNight)

      return {
        question: "How many of YOUR emojis were created between midnight and 5am?",
        options,
        correctIndex: options.indexOf(lateNight.toLocaleString()),
      }
    },
    // Weekend vs weekday
    () => {
      const weekendPct = personalStats.weekendPercentage
      // Skip if undefined or 0% (not an interesting question)
      if (weekendPct === undefined || weekendPct < 1) return null
      const options = generateNumericOptions(weekendPct).map(n => `${n}%`)
      const correctStr = `${weekendPct.toLocaleString()}%`

      return {
        question: "What percentage of YOUR emojis were made on weekends?",
        options,
        correctIndex: options.indexOf(correctStr),
      }
    },
    // Your most common word in emoji names
    () => {
      // Use pre-calculated topWords from all user emojis (not just top 5)
      if (!personalStats.topWords || personalStats.topWords.length === 0) return null

      const mostCommon = personalStats.topWords[0].word
      const mostCommonCount = personalStats.topWords[0].count

      // Need at least 2 occurrences to be meaningful
      if (mostCommonCount < 2) return null

      // Use remaining personal topWords for wrong answers first, then workspace words
      const personalWrongWords = personalStats.topWords
        .slice(1)
        .map(w => w.word)
      const workspaceWords = stats.funStats?.topWords || []
      const workspaceWrongWords = workspaceWords
        .filter(w => w.word.toLowerCase() !== mostCommon.toLowerCase() && !personalWrongWords.includes(w.word))
        .map(w => w.word)

      const wrongAnswers = [...personalWrongWords, ...workspaceWrongWords].slice(0, 3)

      // Pad with generic words if needed
      const fillers = ["party", "cat", "face", "fire", "love", "cool", "happy", "dog"]
      while (wrongAnswers.length < 3) {
        const filler = fillers.find(f => f.toLowerCase() !== mostCommon.toLowerCase() && !wrongAnswers.includes(f))
        if (filler) wrongAnswers.push(filler)
        else break
      }

      const options = [mostCommon, ...wrongAnswers.slice(0, 3)].sort(() => Math.random() - 0.5)

      return {
        question: "What was the most popular word in YOUR emoji names?",
        options: options.map(o => `"${o}"`),
        correctIndex: options.findIndex(o => o === mostCommon),
      }
    },
    // Your total emojis created
    () => {
      const total = personalStats.totalEmojis
      if (!total || total < 1) return null
      const options = generateNumericOptions(total)

      return {
        question: "How many emojis did YOU create this year?",
        options,
        correctIndex: options.indexOf(total.toLocaleString()),
      }
    },
  ]

  // Try each question type until one works
  const shuffled = questionTypes.sort(() => Math.random() - 0.5)
  for (const generator of shuffled) {
    const question = generator()
    if (question) return question
  }

  // Use workspace fallback if personal questions failed
  const workspaceShuffled = workspaceFallbacks.sort(() => Math.random() - 0.5)
  for (const generator of workspaceShuffled) {
    const question = generator()
    if (question) return question
  }

  // Ultimate fallback
  const lateNight = stats.funStats?.lateNightCount || 10
  const options = generateNumericOptions(lateNight)
  return {
    question: "How many emojis were created between midnight and 5am?",
    options,
    correctIndex: options.indexOf(lateNight.toLocaleString()),
  }
}

// Answer option component
function AnswerOption({
  label,
  index,
  isSelected,
  isCorrect,
  showResult,
  onClick,
  captureMode,
  isPersonalityQuestion,
}: {
  label: string
  index: number
  isSelected: boolean
  isCorrect: boolean
  showResult: boolean
  onClick: () => void
  captureMode: boolean
  isPersonalityQuestion?: boolean
}) {
  const letters = ["A", "B", "C", "D"]

  // For personality questions, the selected option is always "correct"
  const effectiveIsCorrect = isPersonalityQuestion ? isSelected : isCorrect

  // Determine background style
  const getBackgroundStyle = () => {
    if (!showResult) {
      return "wrapped-glass hover:bg-white/15"
    }
    if (isSelected && effectiveIsCorrect) {
      return isPersonalityQuestion
        ? "bg-[var(--wrapped-accent-purple)]/30 border-[var(--wrapped-accent-purple)]"
        : "bg-green-500/30 border-green-500"
    }
    if (isSelected && !effectiveIsCorrect) {
      return "bg-red-500/30 border-red-500"
    }
    if (!isSelected && isCorrect && !isPersonalityQuestion) {
      return "bg-green-500/20 border-green-500/50"
    }
    return "wrapped-glass opacity-50"
  }

  // Alternating animation direction for dramatic cascade effect
  const isFromLeft = index % 2 === 0
  const initialX = isFromLeft ? -50 : 50

  return (
    <motion.button
      onClick={onClick}
      disabled={showResult}
      className={`w-full min-h-[56px] p-4 sm:p-5 rounded-xl border border-white/20 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${getBackgroundStyle()}`}
      initial={captureMode ? false : { opacity: 0, x: initialX, scale: 0.95 }}
      animate={
        showResult && isSelected && !effectiveIsCorrect
          ? { opacity: 1, x: [0, -8, 8, -8, 8, 0], scale: 1 }
          : showResult && isSelected && effectiveIsCorrect
            ? { opacity: 1, x: 0, scale: [1, 1.03, 1] }
            : { opacity: 1, x: 0, scale: 1 }
      }
      transition={{
        delay: captureMode ? 0 : getStaggerDelay(index, 0.3, 0.12),
        type: "spring",
        stiffness: 300,
        damping: 25,
        x: { duration: 0.5 },
        scale: { duration: 0.3 },
      }}
      whileHover={!showResult ? { scale: 1.02, x: isFromLeft ? 5 : -5 } : {}}
      whileTap={!showResult ? { scale: 0.98 } : {}}
    >
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <span
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-bold flex-shrink-0 ${showResult && effectiveIsCorrect && isSelected
              ? isPersonalityQuestion
                ? "bg-[var(--wrapped-accent-purple)] text-white"
                : "bg-green-500 text-white"
              : showResult && isSelected && !effectiveIsCorrect
                ? "bg-red-500 text-white"
                : "bg-white/20 text-white"
              }`}
          >
            {letters[index]}
          </span>
          <span className="text-white text-base sm:text-lg font-medium leading-tight line-clamp-2">{label}</span>
        </div>
        {showResult && isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {effectiveIsCorrect ? (
              <CheckCircle2
                className={`w-6 h-6 sm:w-7 sm:h-7 ${isPersonalityQuestion ? "text-[var(--wrapped-accent-purple)]" : "text-green-500"}`}
                aria-label={isPersonalityQuestion ? "Great choice" : "Correct answer"}
              />
            ) : (
              <XCircle className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" aria-label="Incorrect answer" />
            )}
          </motion.div>
        )}
        {showResult && !isSelected && isCorrect && !isPersonalityQuestion && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
          >
            <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-green-500/70" aria-label="This was the correct answer" />
          </motion.div>
        )}
      </div>
    </motion.button>
  )
}

export function QuizSlide({
  stats,
  personalStats,
  workspaceName,
  year,
  quizType,
  onAnswered,
  captureMode = false,
  needsAttention = false,
}: QuizSlideProps) {
  const track = useTrack()
  const confettiRef = useRef<ConfettiRef>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const shouldReduceAnimations = useShouldReduceAnimations()

  // Hydration tracking for WKWebView compatibility
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  const shouldAnimate = hydrated && !captureMode && !shouldReduceAnimations

  // Generate question based on quiz type (memoized to stay consistent)
  const question = useMemo(() => {
    if (quizType === "workspace") {
      return generatePersonalPredictionQuestion(stats, personalStats)
    }
    return generatePersonalBehaviorQuestion(stats, personalStats)
  }, [stats, personalStats, quizType])

  const handleAnswer = (index: number) => {
    if (showResult) return

    setSelectedAnswer(index)
    setShowResult(true)

    // For personality questions, any answer is correct
    const isCorrect = question.isPersonalityQuestion || index === question.correctIndex

    // Track quiz answer
    track("wrapped_quiz_answered", {
      quiz_type: quizType,
      question: question.question,
      selected_answer: question.options[index],
      correct_answer: question.isPersonalityQuestion ? "any" : question.options[question.correctIndex],
      is_correct: isCorrect,
      is_personality_question: question.isPersonalityQuestion || false,
      year,
    })

    if (isCorrect && !shouldReduceAnimations) {
      // Fire confetti for correct answer or personality question
      setTimeout(() => {
        confettiRef.current?.fire({
          particleCount: question.isPersonalityQuestion ? 50 : 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#a855f7", "#f97316", "#22d3ee"],
        })
      }, 200)
    }

    // Notify parent that quiz is answered (after a short delay)
    setTimeout(() => {
      onAnswered?.()
    }, 800)
  }

  // For personality questions, the selected answer is always "correct"
  const isCorrect = question.isPersonalityQuestion
    ? true
    : selectedAnswer === question.correctIndex

  const gradientColors =
    quizType === "workspace"
      ? ["var(--wrapped-accent-purple)", "var(--wrapped-accent-cyan)", "var(--wrapped-accent-orange)", "var(--wrapped-accent-purple)"]
      : ["var(--wrapped-accent-cyan)", "var(--wrapped-accent-purple)", "var(--wrapped-accent-orange)", "var(--wrapped-accent-cyan)"]

  return (
    <motion.div
      className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden"
      animate={needsAttention ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
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

      {/* Main content */}
      <div
        className={`relative w-full max-w-4xl ${captureMode ? "h-[600px] overflow-hidden" : "h-full max-h-full overflow-y-auto scrollbar-hide"}`}
      >
        <div className={`flex flex-col items-center pt-4 pb-4 px-4 sm:px-6 w-full ${captureMode ? "h-full justify-between" : "min-h-full justify-between"}`}>

          {/* Top Section: Header & Title */}
          <div className="w-full flex flex-col items-center flex-shrink-0">
            <div className="mb-4">
              <SlideHeader year={year} />
            </div>

            {/* Quiz title */}
            {captureMode ? (
              <div className="mb-4">
                <h2 className="wrapped-headline text-white mb-2 text-4xl sm:text-5xl">
                  {quizType === "workspace" ? "Predict Your Stats" : "Know Yourself"}
                </h2>
                <p className="wrapped-body text-lg sm:text-xl">
                  {quizType === "workspace" ? "How well do you know your emoji habits?" : "Let's see how you roll"}
                </p>
              </div>
            ) : (
              <BlurFade delay={0.1} shouldAnimate={shouldAnimate} className="mb-4">
                <h2 className="wrapped-headline mb-2 text-4xl sm:text-5xl">
                  <GradientText colors={gradientColors} animationSpeed={6}>
                    {quizType === "workspace" ? "Predict Your Stats" : "Know Yourself"}
                  </GradientText>
                </h2>
                <p className="wrapped-body text-lg sm:text-xl md:text-2xl">
                  {quizType === "workspace" ? "How well do you know your emoji habits?" : "Let's see how you roll"}
                </p>
              </BlurFade>
            )}
          </div>

          {/* Middle Section: Emoji, Question, Options */}
          <div className="flex-1 flex flex-col items-center justify-center w-full my-4">
            {/* Emoji display if available */}
            {question.emoji && (
              <motion.div
                initial={captureMode ? false : { scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="mb-4"
              >
                <EmojiHero
                  emoji={question.emoji}
                  size="sm"
                  glow="purple"
                  animate={!captureMode}
                  captureMode={captureMode}
                  delay={0.3}
                />
              </motion.div>
            )}

            {/* Question - with suspense blur reveal effect */}
            <motion.div
              initial={captureMode ? false : {
                opacity: 0,
                y: 20,
                filter: shouldAnimate ? "blur(8px)" : "blur(0px)"
              }}
              animate={{
                opacity: 1,
                y: 0,
                filter: "blur(0px)"
              }}
              transition={{
                delay: 0.2,
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1],
                filter: { duration: 1 }
              }}
              className="mb-6 max-w-2xl px-2"
            >
              <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-snug line-clamp-4">{question.question}</p>
            </motion.div>

            {/* Answer options - WIDER */}
            <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl space-y-4">
              {question.options.map((option, index) => (
                <AnswerOption
                  key={index}
                  label={option}
                  index={index}
                  isSelected={selectedAnswer === index}
                  isCorrect={index === question.correctIndex}
                  showResult={showResult}
                  onClick={() => handleAnswer(index)}
                  captureMode={captureMode}
                  isPersonalityQuestion={question.isPersonalityQuestion}
                />
              ))}
            </div>

            {/* Result message - dramatic reveal with glow */}
            {showResult && (
              <motion.div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  boxShadow: isCorrect || question.isPersonalityQuestion
                    ? [
                        "0 0 0 rgba(168, 85, 247, 0)",
                        "0 0 30px rgba(168, 85, 247, 0.5)",
                        "0 0 15px rgba(168, 85, 247, 0.3)"
                      ]
                    : "0 0 0 rgba(239, 68, 68, 0)"
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                  delay: 0.2,
                  boxShadow: { duration: 0.8, ease: "easeOut" }
                }}
                className={`mt-6 px-6 py-3 rounded-full ${question.isPersonalityQuestion
                  ? "bg-[var(--wrapped-accent-purple)]/20 border border-[var(--wrapped-accent-purple)]/40"
                  : isCorrect
                    ? "bg-green-500/20 border border-green-500/40"
                    : "bg-red-500/20 border border-red-500/40"
                  }`}
              >
                <p className={`text-lg font-bold ${question.isPersonalityQuestion
                  ? "text-[var(--wrapped-accent-purple)]"
                  : isCorrect
                    ? "text-green-400"
                    : "text-red-400"
                  }`}>
                  {question.isPersonalityQuestion
                    ? "Love it! ✨"
                    : isCorrect
                      ? "Correct! Nice one!"
                      : "Not quite!"}
                </p>
              </motion.div>
            )}

            {/* Continue hint */}
            {showResult && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-4 wrapped-label text-sm"
              >
                Tap to continue
              </motion.p>
            )}
          </div>

          {/* Bottom Section: Branding */}
          <div className="flex-shrink-0 mb-safe">
            <SlideBranding />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
