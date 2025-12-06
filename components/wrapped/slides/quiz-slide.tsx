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
  // Fallback - general emoji trivia
  const fallbackQuestion = (): QuizQuestion => {
    const options = ["2010", "2015", "1999", "2007"]
    return {
      question: "What year did emoji become a Unicode standard?",
      options,
      correctIndex: 0, // 2010 is correct (Unicode 6.0)
    }
  }

  if (!personalStats) return fallbackQuestion()

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
      if (gifPct === undefined) return null
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

  return fallbackQuestion()
}

// Generate personal behavior/pattern questions (Quiz 2)
function generatePersonalBehaviorQuestion(stats: WrappedStats, personalStats: PersonalWrappedStats | null | undefined): QuizQuestion {
  // Fallback - fun emoji trivia
  const fallbackQuestion = (): QuizQuestion => {
    const options = ["😂 Face with Tears of Joy", "❤️ Red Heart", "🔥 Fire", "👍 Thumbs Up"]
    return {
      question: "Which emoji is the most used worldwide?",
      options,
      correctIndex: 0, // Face with tears of joy
    }
  }

  if (!personalStats) return fallbackQuestion()

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
        question: "How many of YOUR emojis were created after midnight?",
        options,
        correctIndex: options.indexOf(lateNight.toLocaleString()),
      }
    },
    // Weekend vs weekday
    () => {
      const weekendPct = personalStats.weekendPercentage
      if (weekendPct === undefined) return null
      const options = generateNumericOptions(weekendPct).map(n => `${n}%`)
      const correctStr = `${weekendPct.toLocaleString()}%`

      return {
        question: "What percentage of YOUR emojis were made on weekends?",
        options,
        correctIndex: options.indexOf(correctStr),
      }
    },
    // Compared to average
    () => {
      const compared = personalStats.comparedToAverage
      if (!compared) return null
      const options = generateNumericOptions(compared).map(n => `${n}%`)
      const correctStr = `${compared.toLocaleString()}%`

      return {
        question: "How did YOUR emoji count compare to the average creator?",
        options,
        correctIndex: options.indexOf(correctStr),
      }
    },
    // Emoji personality question (no wrong answer)
    () => {
      if (!personalStats.topEmojis || personalStats.topEmojis.length < 4) return null
      const emojis = personalStats.topEmojis.slice(0, 4)
      const options = emojis.map(e => `:${e.name}:`)

      return {
        question: "Which of YOUR emojis best represents your 2024 vibe?",
        options,
        correctIndex: Math.floor(Math.random() * 4), // Any answer is "correct"
        isPersonalityQuestion: true,
        emoji: emojis[0],
      }
    },
    // Creator style question (no wrong answer)
    () => {
      const options = ["Trendsetter 🚀", "Steady Creator 📊", "Burst Creator ⚡", "Quality over Quantity ✨"]
      return {
        question: "What's your emoji creation style?",
        options,
        correctIndex: Math.floor(Math.random() * 4), // Any answer is "correct"
        isPersonalityQuestion: true,
      }
    },
  ]

  // Try each question type until one works
  const shuffled = questionTypes.sort(() => Math.random() - 0.5)
  for (const generator of shuffled) {
    const question = generator()
    if (question) return question
  }

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

  return (
    <motion.button
      onClick={onClick}
      disabled={showResult}
      className={`w-full p-4 rounded-xl border text-left transition-all ${
        !showResult ? "bg-white/5 border-white/20 hover:bg-white/15 hover:border-white/40" : ""
      } ${showResult && isSelected && effectiveIsCorrect ? (isPersonalityQuestion ? "bg-purple-500/30 border-purple-500" : "bg-green-500/30 border-green-500") : ""} ${
        showResult && isSelected && !effectiveIsCorrect ? "bg-red-500/30 border-red-500" : ""
      } ${showResult && !isSelected && isCorrect && !isPersonalityQuestion ? "bg-green-500/20 border-green-500/50" : ""} ${
        showResult && !isSelected && (!isCorrect || isPersonalityQuestion) ? "bg-white/5 border-white/10 opacity-50" : ""
      }`}
      initial={captureMode ? false : { opacity: 0, x: -20 }}
      animate={
        showResult && isSelected && !effectiveIsCorrect
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
              showResult && effectiveIsCorrect && isSelected
                ? isPersonalityQuestion ? "bg-purple-500 text-white" : "bg-green-500 text-white"
                : showResult && isSelected && !effectiveIsCorrect
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
            {effectiveIsCorrect ? (
              <CheckCircle2 className={`w-6 h-6 ${isPersonalityQuestion ? "text-purple-500" : "text-green-500"}`} />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
          </motion.div>
        )}
        {showResult && !isSelected && isCorrect && !isPersonalityQuestion && (
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

    if (isCorrect) {
      // Fire confetti for correct answer or personality question
      setTimeout(() => {
        confettiRef.current?.fire({
          particleCount: question.isPersonalityQuestion ? 50 : 80,
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

  // For personality questions, the selected answer is always "correct"
  const isCorrect = question.isPersonalityQuestion
    ? true
    : selectedAnswer === question.correctIndex
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
              {quizType === "workspace" ? "Predict Your Stats" : "Know Yourself"}
            </h2>
            <p className="text-white/60 text-sm">
              {quizType === "workspace" ? "How well do you know your emoji habits?" : "Let's see how you roll"}
            </p>
          </div>
        ) : (
          <BlurFade delay={0.1} className="mb-4">
            <h2 className="text-xl md:text-2xl font-bold mb-1">
              <GradientText colors={gradientColors} animationSpeed={6}>
                {quizType === "workspace" ? "Predict Your Stats" : "Know Yourself"}
              </GradientText>
            </h2>
            <p className="text-white/60 text-sm">
              {quizType === "workspace" ? "How well do you know your emoji habits?" : "Let's see how you roll"}
            </p>
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
              isPersonalityQuestion={question.isPersonalityQuestion}
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
              question.isPersonalityQuestion
                ? "bg-purple-500/20 border border-purple-500/40"
                : isCorrect
                  ? "bg-green-500/20 border border-green-500/40"
                  : "bg-red-500/20 border border-red-500/40"
            }`}
          >
            <p className={`text-lg font-bold ${
              question.isPersonalityQuestion
                ? "text-purple-400"
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
