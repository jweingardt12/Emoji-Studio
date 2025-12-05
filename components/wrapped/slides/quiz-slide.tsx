"use client"

import { useState, useMemo, useRef } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, XCircle } from "lucide-react"
import { WrappedStats, PersonalWrappedStats } from "@/lib/services/wrapped-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { useTrack } from "@/lib/hooks/use-track"
import { SlideBranding } from "../slide-branding"
import { SlideHeader } from "../slide-header"
import { Confetti, ConfettiRef } from "@/components/ui/confetti"
import { GridBackground } from "@/components/ui/grid-background"
import { GradientText } from "@/components/ui/gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"

interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  emoji?: { name: string; url: string }
}

interface QuizSlideProps {
  stats: WrappedStats
  personalStats?: PersonalWrappedStats | null
  workspaceName: string
  year: number
  quizType: "workspace" | "funfacts"
  onAnswered?: () => void
  captureMode?: boolean
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

// Generate workspace quiz question
function generateWorkspaceQuestion(stats: WrappedStats, workspaceName: string): QuizQuestion {
  // Fallback question - peak day of week
  const fallbackQuestion = (): QuizQuestion => {
    const correct = stats.peakDayOfWeek?.day || "Monday"
    const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    const wrongAnswers = allDays.filter(d => d !== correct).sort(() => Math.random() - 0.5).slice(0, 3)
    const options = [correct, ...wrongAnswers].sort(() => Math.random() - 0.5)
    return {
      question: "What day of the week had the most emoji creation?",
      options,
      correctIndex: options.indexOf(correct),
    }
  }

  const questionTypes = [
    // Peak day of week (fallback)
    fallbackQuestion,
    // Top creator question
    () => {
      if (!stats.topCreators || stats.topCreators.length < 2) return null
      const correct = stats.topCreators[0].displayName
      const wrongAnswers = stats.topCreators.slice(1, 4).map(c => c.displayName)
      while (wrongAnswers.length < 3) {
        wrongAnswers.push(`User ${wrongAnswers.length + 2}`)
      }
      const options = [correct, ...wrongAnswers.slice(0, 3)].sort(() => Math.random() - 0.5)
      return {
        question: "Who was the #1 emoji creator this year?",
        options,
        correctIndex: options.indexOf(correct),
        emoji: stats.topCreators[0].topEmojis?.[0],
      }
    },
    // Busiest month question
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
        question: "What month had the most emoji creation?",
        options,
        correctIndex: options.indexOf(correct),
      }
    },
    // GIF percentage question
    () => {
      const correct = stats.overview?.gifPercentage
      if (correct === undefined) return null
      const options = generateNumericOptions(correct).map(n => `${n}%`)
      const correctStr = `${correct.toLocaleString()}%`
      return {
        question: `What percentage of ${workspaceName}'s emojis are GIFs?`,
        options,
        correctIndex: options.indexOf(correctStr),
      }
    },
    // Total creators question
    () => {
      const correct = stats.overview?.totalCreators
      if (!correct || correct < 3) return null
      const options = generateNumericOptions(correct)
      return {
        question: `How many people contributed emojis to ${workspaceName}?`,
        options,
        correctIndex: options.indexOf(correct.toLocaleString()),
      }
    },
  ]

  // Try each question type until one works (skip first as it's the fallback)
  const shuffled = questionTypes.slice(1).sort(() => Math.random() - 0.5)
  for (const generator of shuffled) {
    const question = generator()
    if (question) return question
  }

  // Use fallback
  return fallbackQuestion()
}

// Generate fun facts quiz question
function generateFunFactsQuestion(stats: WrappedStats, personalStats?: PersonalWrappedStats | null): QuizQuestion {
  // Fallback question that always works
  const fallbackQuestion = (): QuizQuestion => {
    const correct = stats.busiestDay?.count || 10
    const options = generateNumericOptions(correct)
    return {
      question: "How many emojis were created on the busiest day?",
      options,
      correctIndex: options.indexOf(correct.toLocaleString()),
      emoji: stats.busiestDay?.emojis?.[0],
    }
  }

  const questionTypes = [
    // Busiest day count question (fallback)
    fallbackQuestion,
    // Longest streak question
    () => {
      const streak = stats.funStats?.longestStreak?.days
      if (!streak || streak < 3) return null
      const numOptions = generateNumericOptions(streak)
      const options = numOptions.map(n => `${n} days`)
      return {
        question: "What was the longest streak of consecutive days with new emojis?",
        options,
        correctIndex: options.indexOf(`${streak.toLocaleString()} days`),
      }
    },
    // Late night emoji count
    () => {
      const lateNight = stats.funStats?.lateNightCount
      if (!lateNight || lateNight < 5) return null
      const options = generateNumericOptions(lateNight)
      return {
        question: "How many emojis were created after midnight?",
        options,
        correctIndex: options.indexOf(lateNight.toLocaleString()),
      }
    },
    // Most common word question
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
    // Personal first emoji (if available)
    () => {
      if (!personalStats?.firstEmoji) return null
      const emoji = personalStats.firstEmoji
      const correct = emoji.name
      // Use other personal emojis as wrong answers
      const wrongAnswers = personalStats.topEmojis
        ?.filter(e => e.name !== correct)
        .slice(0, 3)
        .map(e => e.name) || []
      if (wrongAnswers.length < 3) return null
      const options = [correct, ...wrongAnswers].sort(() => Math.random() - 0.5)
      return {
        question: "What was your first emoji of the year?",
        options: options.map(o => `:${o}:`),
        correctIndex: options.findIndex(o => o === correct),
        emoji,
      }
    },
  ]

  // Try each question type until one works (skip first as it's the fallback)
  const shuffled = questionTypes.slice(1).sort(() => Math.random() - 0.5)
  for (const generator of shuffled) {
    const question = generator()
    if (question) return question
  }

  // Use fallback
  return fallbackQuestion()
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
}: {
  label: string
  index: number
  isSelected: boolean
  isCorrect: boolean
  showResult: boolean
  onClick: () => void
  captureMode: boolean
}) {
  const letters = ["A", "B", "C", "D"]

  return (
    <motion.button
      onClick={onClick}
      disabled={showResult}
      className={`w-full p-4 rounded-xl border text-left transition-all ${
        !showResult ? "bg-white/5 border-white/20 hover:bg-white/15 hover:border-white/40" : ""
      } ${showResult && isSelected && isCorrect ? "bg-green-500/30 border-green-500" : ""} ${
        showResult && isSelected && !isCorrect ? "bg-red-500/30 border-red-500" : ""
      } ${showResult && !isSelected && isCorrect ? "bg-green-500/20 border-green-500/50" : ""} ${
        showResult && !isSelected && !isCorrect ? "bg-white/5 border-white/10 opacity-50" : ""
      }`}
      initial={captureMode ? false : { opacity: 0, x: -20 }}
      animate={
        showResult && isSelected && !isCorrect
          ? { opacity: 1, x: [0, -10, 10, -10, 10, 0] }
          : { opacity: 1, x: 0 }
      }
      transition={{
        delay: captureMode ? 0 : 0.3 + index * 0.1,
        x: { duration: 0.4 },
      }}
      whileHover={!showResult ? { scale: 1.02 } : {}}
      whileTap={!showResult ? { scale: 0.98 } : {}}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              showResult && isCorrect
                ? "bg-green-500 text-white"
                : showResult && isSelected && !isCorrect
                ? "bg-red-500 text-white"
                : "bg-white/20 text-white"
            }`}
          >
            {letters[index]}
          </span>
          <span className="text-white font-medium">{label}</span>
        </div>
        {showResult && isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {isCorrect ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
          </motion.div>
        )}
        {showResult && !isSelected && isCorrect && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
          >
            <CheckCircle2 className="w-6 h-6 text-green-500/70" />
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
}: QuizSlideProps) {
  const track = useTrack()
  const confettiRef = useRef<ConfettiRef>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)

  // Generate question based on quiz type (memoized to stay consistent)
  const question = useMemo(() => {
    if (quizType === "workspace") {
      return generateWorkspaceQuestion(stats, workspaceName)
    }
    return generateFunFactsQuestion(stats, personalStats)
  }, [stats, personalStats, workspaceName, quizType])

  const handleAnswer = (index: number) => {
    if (showResult) return

    setSelectedAnswer(index)
    setShowResult(true)

    const isCorrect = index === question.correctIndex

    // Track quiz answer
    track("wrapped_quiz_answered", {
      quiz_type: quizType,
      question: question.question,
      selected_answer: question.options[index],
      correct_answer: question.options[question.correctIndex],
      is_correct: isCorrect,
      year,
    })

    if (isCorrect) {
      // Fire confetti for correct answer
      setTimeout(() => {
        confettiRef.current?.fire({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        })
      }, 200)
    }

    // Notify parent that quiz is answered (after a short delay)
    setTimeout(() => {
      onAnswered?.()
    }, 800)
  }

  const isCorrect = selectedAnswer === question.correctIndex
  const gradientColors =
    quizType === "workspace"
      ? ["#818cf8", "#a78bfa", "#c084fc", "#818cf8"]
      : ["#14b8a6", "#22d3d1", "#06b6d4", "#14b8a6"]

  const glowColor =
    quizType === "workspace" ? "rgba(129, 140, 248, 0.2)" : "rgba(20, 184, 166, 0.2)"

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center px-4">
      {/* Background effects */}
      <GridBackground
        gridSize={30}
        gridColor="rgba(255, 255, 255, 0.04)"
        showGlow={true}
        glowColor={glowColor}
        glowPosition="center"
      />

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
        className={`relative flex flex-col items-center pt-4 pb-4 px-6 w-[600px] ${
          captureMode ? "h-[600px]" : "h-auto min-h-[600px]"
        } overflow-hidden`}
      >
        {/* Header */}
        <SlideHeader year={year} />

        {/* Quiz title */}
        {captureMode ? (
          <div className="mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
              {quizType === "workspace" ? "Workspace Quiz" : "Fun Facts Quiz"}
            </h2>
            <p className="text-white/60 text-sm">Test your emoji knowledge</p>
          </div>
        ) : (
          <BlurFade delay={0.1} className="mb-4">
            <h2 className="text-xl md:text-2xl font-bold mb-1">
              <GradientText colors={gradientColors} animationSpeed={6}>
                {quizType === "workspace" ? "Workspace Quiz" : "Fun Facts Quiz"}
              </GradientText>
            </h2>
            <p className="text-white/60 text-sm">Test your emoji knowledge</p>
          </BlurFade>
        )}

        {/* Emoji display if available */}
        {question.emoji && (
          <motion.div
            initial={captureMode ? false : { scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="mb-4"
          >
            <img
              src={proxyImageUrl(question.emoji.url)}
              alt={question.emoji.name}
              className="w-20 h-20 rounded-xl shadow-lg object-contain"
            />
          </motion.div>
        )}

        {/* Question */}
        <motion.div
          initial={captureMode ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 max-w-md"
        >
          <p className="text-xl md:text-2xl font-bold text-white">{question.question}</p>
        </motion.div>

        {/* Answer options */}
        <div className="w-full max-w-md space-y-3">
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
            />
          ))}
        </div>

        {/* Result message */}
        {showResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.3 }}
            className={`mt-6 px-6 py-3 rounded-full ${
              isCorrect
                ? "bg-green-500/20 border border-green-500/40"
                : "bg-red-500/20 border border-red-500/40"
            }`}
          >
            <p className={`text-lg font-bold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
              {isCorrect ? "Correct! Nice one!" : "Not quite!"}
            </p>
          </motion.div>
        )}

        {/* Continue hint */}
        {showResult && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-4 text-white/50 text-sm"
          >
            Tap to continue
          </motion.p>
        )}

        {/* Branding */}
        <SlideBranding />
      </div>
    </div>
  )
}
