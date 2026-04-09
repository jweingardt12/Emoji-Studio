"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTrack } from "@/lib/hooks/use-track"
import { useIsMobile } from "@/hooks/use-mobile"
import { SparklesText } from "@/src/components/magicui/sparkles-text"
import { RainbowButton } from "@/src/components/magicui/rainbow-button"
import { FlickeringGrid } from "@/src/components/magicui/flickering-grid"
import { AnimatedShinyText } from "@/src/components/magicui/animated-shiny-text"
import { BorderBeam } from "@/src/components/magicui/border-beam"
import { ConfettiSideCannons } from "@/src/components/magicui/confetti"
import {
  Chrome,
  Play,
  ArrowRight,
  Sparkles,
  Gift,
  Shield,
  User,
  Smartphone,
  Zap,
  Bell,
  Mail,
  Crown,
  Medal,
  Award,
  Calendar,
  Flame,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { EmailExtensionModal } from "@/components/email-extension-modal"
import { ConnectWorkspaceModal } from "@/components/wrapped/connect-workspace-modal"
import { GridBackground } from "@/components/ui/grid-background"
import { GradientText } from "@/components/ui/gradient-text"
import { hasSlackConnection } from "@/lib/utils/slack-upload"

// Sample emojis from Slackmojis for preview cards
// Using /download URLs which work (CDN domain emojis.slackmojis.com blocks requests)
const SAMPLE_EMOJIS = [
  { name: "party-blob", url: "https://slackmojis.com/emojis/7808-party-blob/download" },
  { name: "meow-party", url: "https://slackmojis.com/emojis/5999-meow_party/download" },
  { name: "blob-aww", url: "https://slackmojis.com/emojis/6827-blob_aww/download" },
  { name: "kirby-jam", url: "https://slackmojis.com/emojis/20573-kirby_jam/download" },
  { name: "dumpster-fire", url: "https://slackmojis.com/emojis/6248-dumpster-fire/download" },
  { name: "partyparrot", url: "https://slackmojis.com/emojis/7500-partyparrot/download" },
  { name: "this-is-fine", url: "https://slackmojis.com/emojis/8559-this_is_fine/download" },
  { name: "stonks", url: "https://slackmojis.com/emojis/9036-stonks/download" },
]

const SAMPLE_AVATARS = [
  "https://slackmojis.com/emojis/4979-thinking/download",
  "https://slackmojis.com/emojis/6843-blob_detective/download",
  "https://slackmojis.com/emojis/4594-blob-wave/download",
  "https://slackmojis.com/emojis/3643-cool-doge/download",
]

// Preview slide data for stacked deck preview - gradients match actual wrapped slides
const PREVIEW_SLIDES = [
  {
    id: "count",
    gradient: "from-slate-900 via-purple-950 to-slate-900",
    glowColor: "rgba(147, 51, 234, 0.3)",
    type: "count" as const,
  },
  {
    id: "peak",
    gradient: "from-slate-900 via-cyan-950 to-slate-900",
    glowColor: "rgba(34, 211, 238, 0.3)",
    type: "peak" as const,
  },
  {
    id: "stats",
    gradient: "from-purple-950 via-slate-900 to-cyan-950",
    glowColor: "rgba(168, 85, 247, 0.3)",
    type: "stats" as const,
  },
  {
    id: "creators",
    gradient: "from-amber-950 via-slate-900 to-yellow-950",
    glowColor: "rgba(251, 191, 36, 0.3)",
    type: "creators" as const,
  },
]

// Mini preview content components
function CountPreviewContent({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <p className="text-white/60 text-xs mb-1">This year you created</p>
      {/* Hero number with dark backdrop like actual slide */}
      <div className="relative my-2">
        <div
          className="absolute inset-0 -inset-x-4 rounded-xl"
          style={{ background: "radial-gradient(ellipse 80% 120% at center, rgba(0,0,0,0.6) 0%, transparent 70%)" }}
        />
        <div
          className={`relative ${isMobile ? 'text-4xl' : 'text-5xl'} font-black text-white`}
          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
        >
          847
        </div>
      </div>
      <GradientText
        colors={["#22d3ee", "#a855f7", "#f97316", "#22d3ee"]}
        className={`${isMobile ? 'text-base' : 'text-lg'} font-bold`}
        animationSpeed={4}
      >
        custom emojis
      </GradientText>
      {/* Mini emoji grid with real emojis */}
      <div className={`flex flex-wrap justify-center gap-1.5 mt-3 ${isMobile ? 'max-w-[160px]' : 'max-w-[200px]'}`}>
        {SAMPLE_EMOJIS.map((emoji, i) => (
          <img
            key={i}
            src={emoji.url}
            alt={emoji.name}
            className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} rounded-md object-contain`}
          />
        ))}
      </div>
    </div>
  )
}

function PeakPreviewContent({ isMobile }: { isMobile: boolean }) {
  const barHeights = [20, 35, 45, 30, 80, 65, 40, 55, 70, 100, 50, 25]
  return (
    <div className="flex flex-col items-center justify-center h-full px-3">
      {/* Mini headline */}
      <GradientText
        colors={["#22d3ee", "#a855f7", "#f97316", "#22d3ee"]}
        className="text-[10px] font-bold mb-2"
        animationSpeed={6}
      >
        When Creativity Peaked
      </GradientText>
      {/* Glass card for best day */}
      <div className="bg-white/5 border border-cyan-500/30 rounded-lg px-3 py-2 mb-2">
        <p className="text-white/60 text-[10px] mb-1 flex items-center justify-center gap-1">
          <Calendar className="w-3 h-3" />
          Best Day
        </p>
        <div
          className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-black text-cyan-400`}
          style={{ textShadow: "0 0 20px rgba(34, 211, 238, 0.4)" }}
        >
          47
        </div>
        <p className="text-white/50 text-[10px]">Dec 15</p>
      </div>
      {/* Mini bar chart */}
      <div className={`flex items-end gap-0.5 ${isMobile ? 'h-8' : 'h-10'}`}>
        {barHeights.map((h, i) => (
          <div
            key={i}
            className={`${isMobile ? 'w-1.5' : 'w-2'} rounded-t ${i === 9 ? 'bg-cyan-400' : 'bg-white/20'}`}
            style={{
              height: `${h}%`,
              boxShadow: i === 9 ? "0 0 8px rgba(34, 211, 238, 0.5)" : "none"
            }}
          />
        ))}
      </div>
      <div className={`flex justify-between ${isMobile ? 'w-[78px]' : 'w-[104px]'} text-[8px] text-white/30 mt-1`}>
        <span>Jan</span><span>Dec</span>
      </div>
    </div>
  )
}

function StatsPreviewContent({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-3">
      {/* Mini headline */}
      <GradientText
        colors={["#22d3ee", "#a855f7", "#f97316", "#22d3ee"]}
        className="text-[10px] font-bold mb-2"
        animationSpeed={6}
      >
        The Deep Dive
      </GradientText>
      {/* Mini donut chart */}
      <div className={`relative ${isMobile ? 'w-12 h-12' : 'w-14 h-14'} mb-2`}>
        <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
          <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="#a855f7" strokeWidth="12"
            strokeDasharray="220" strokeDashoffset="0" />
          <circle
            cx="50" cy="50" r="35" fill="none" stroke="#22d3ee" strokeWidth="12"
            strokeDasharray="220" strokeDashoffset="143"
            style={{ filter: "drop-shadow(0 0 4px rgba(34, 211, 238, 0.6))" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">35%</span>
      </div>
      <div className="flex gap-3 text-[9px]">
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-400"/>GIFs</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"/>Static</span>
      </div>
      {/* Streak with glass styling */}
      <div className={`mt-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 ${isMobile ? 'text-[9px]' : 'text-[10px]'} text-white/80 flex items-center gap-1`}>
        <Flame className="w-3 h-3 text-orange-400" />
        <span className="font-bold text-white">12</span> day streak
      </div>
    </div>
  )
}

function CreatorsPreviewContent({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-2">
      {/* Mini headline */}
      <GradientText
        colors={["#fbbf24", "#f97316", "#a855f7", "#fbbf24"]}
        className="text-[10px] font-bold mb-3"
        animationSpeed={6}
      >
        The Emoji Architects
      </GradientText>
      {/* Mini podium - 3 columns (2-1-3 order) */}
      <div className="flex items-end justify-center gap-1">
        {/* #2 - Silver */}
        <div className="flex flex-col items-center">
          <img
            src={SAMPLE_AVATARS[1]}
            alt="creator 2"
            className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} rounded-full object-contain mb-1`}
          />
          <div className={`${isMobile ? 'w-8 h-6' : 'w-10 h-8'} rounded-t bg-linear-to-b from-gray-400/30 to-gray-500/10 border-t border-x border-gray-400/40 flex items-center justify-center`}>
            <Medal className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-300`} />
          </div>
        </div>
        {/* #1 - Gold (tallest) */}
        <div className="flex flex-col items-center">
          <img
            src={SAMPLE_AVATARS[0]}
            alt="creator 1"
            className={`${isMobile ? 'w-6 h-6' : 'w-7 h-7'} rounded-full object-contain mb-1 ring-2 ring-yellow-400/50`}
          />
          <div
            className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-t bg-linear-to-b from-yellow-500/30 to-yellow-600/10 border-t border-x border-yellow-500/50 flex items-center justify-center`}
            style={{ boxShadow: "0 0 20px rgba(234, 179, 8, 0.3)" }}
          >
            <Crown className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-yellow-400`} />
          </div>
        </div>
        {/* #3 - Bronze */}
        <div className="flex flex-col items-center">
          <img
            src={SAMPLE_AVATARS[2]}
            alt="creator 3"
            className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} rounded-full object-contain mb-1`}
          />
          <div className={`${isMobile ? 'w-8 h-5' : 'w-10 h-6'} rounded-t bg-linear-to-b from-amber-600/30 to-amber-700/10 border-t border-x border-amber-600/40 flex items-center justify-center`}>
            <Award className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-amber-500`} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Render content based on slide type
function renderSlideContent(type: string, isMobile: boolean) {
  switch (type) {
    case "count":
      return <CountPreviewContent isMobile={isMobile} />
    case "peak":
      return <PeakPreviewContent isMobile={isMobile} />
    case "stats":
      return <StatsPreviewContent isMobile={isMobile} />
    case "creators":
      return <CreatorsPreviewContent isMobile={isMobile} />
    default:
      return null
  }
}

// Floating emoji images from Slackmojis (using /download URLs)
const FLOATING_EMOJIS = [
  { url: "https://slackmojis.com/emojis/7808-party-blob/download", name: "party-blob" },
  { url: "https://slackmojis.com/emojis/7500-partyparrot/download", name: "partyparrot" },
  { url: "https://slackmojis.com/emojis/5999-meow_party/download", name: "meow-party" },
  { url: "https://slackmojis.com/emojis/6827-blob_aww/download", name: "blob-aww" },
  { url: "https://slackmojis.com/emojis/8559-this_is_fine/download", name: "this-is-fine" },
]

// Floating emoji component using real Slackmoji images
function FloatingEmojiImage({
  index,
  delay,
  duration,
  className
}: {
  index: number
  delay: number
  duration: number
  className?: string
}) {
  const emoji = FLOATING_EMOJIS[index % FLOATING_EMOJIS.length]
  return (
    <motion.img
      src={emoji.url}
      alt={emoji.name}
      className={`absolute w-8 h-8 sm:w-10 sm:h-10 select-none pointer-events-none object-contain ${className}`}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1, 1, 0.8],
        y: [0, -10, -5, -15],
      }}
      transition={{
        delay,
        duration,
        repeat: Infinity,
        repeatDelay: delay,
      }}
    />
  )
}


interface WrappedLandingProps {
  hasData?: boolean
  onViewWrapped?: () => void
}

export function WrappedLanding({
  hasData = false,
  onViewWrapped,
}: WrappedLandingProps) {
  const track = useTrack()
  const router = useRouter()
  const isMobile = useIsMobile()
  const wrappedYear = new Date().getFullYear() - 1
  const [pageVisible, setPageVisible] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0)

  // Cycling preview slides
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPreviewIndex((prev) => (prev + 1) % PREVIEW_SLIDES.length)
    }, 4000) // 4 seconds per slide

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Trigger fade in animation
    const timer = setTimeout(() => setPageVisible(true), 100)

    track("wrapped_landing_viewed", {
      year: wrappedYear,
      has_data: hasData,
      referrer: typeof document !== "undefined" ? document.referrer : "",
    })

    return () => clearTimeout(timer)
  }, [track, wrappedYear, hasData])

  const handleGetStarted = () => {
    track("wrapped_landing_cta_clicked", {
      cta: "get_started",
      year: wrappedYear,
    })

    // Check if user has a workspace connected
    if (!hasSlackConnection()) {
      // Show modal to direct them to Chrome extension
      setShowConnectModal(true)
      track("wrapped_connect_modal_opened", { year: wrappedYear })
    } else {
      // Edge case: has connection but no data - go to settings to troubleshoot
      router.push("/settings")
    }
  }

  const handleViewWrapped = () => {
    track("wrapped_landing_cta_clicked", {
      cta: "view_wrapped",
      year: wrappedYear,
    })
    onViewWrapped?.()
  }

  const handleChromeExtension = () => {
    track("wrapped_landing_cta_clicked", {
      cta: "chrome_extension",
      year: wrappedYear,
    })
    window.open(
      "https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa",
      "_blank"
    )
  }

  const handleiOSApp = () => {
    track("wrapped_landing_cta_clicked", {
      cta: "ios_app",
      year: wrappedYear,
    })
    window.open(
      "https://apps.apple.com/us/app/emoji-studio-for-slack/id6751079971",
      "_blank"
    )
  }

  const handleEmailExtension = () => {
    track("wrapped_landing_cta_clicked", {
      cta: "email_extension",
      year: wrappedYear,
    })
    setShowEmailModal(true)
  }

  return (
    <div className={`flex flex-col gap-8 md:gap-12 w-full pb-8 transition-all duration-700 ${
      pageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      {/* Confetti effect on page load */}
      {pageVisible && <ConfettiSideCannons />}
      {/* Hero Card - Larger with preview */}
      <div className="px-0 sm:px-4 lg:px-6 pt-4 md:pt-8">
        <Card className="relative overflow-hidden border-muted/40 rounded-none sm:rounded-lg">
          {/* Flickering grid background - enhanced on mobile */}
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            <FlickeringGrid
              className="absolute inset-0 z-0"
              squareSize={isMobile ? 4 : 4}
              gridGap={isMobile ? 6 : 6}
              color="rgb(59, 130, 246)"
              maxOpacity={isMobile ? 0.12 : 0.1}
              flickerChance={isMobile ? 0.08 : 0.1}
            />
          </div>

          {/* Decorative gradient accents - enhanced for mobile */}
          <div className="absolute -top-24 -right-24 w-56 md:w-64 h-56 md:h-64 bg-linear-to-br from-primary/25 via-primary/15 to-transparent rounded-full blur-3xl pointer-events-none z-10" />
          <div className="absolute -bottom-24 -left-24 w-48 md:w-64 h-48 md:h-64 bg-linear-to-tr from-violet-500/15 to-transparent rounded-full blur-3xl pointer-events-none z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 md:w-96 h-72 md:h-96 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-3xl pointer-events-none z-10" />

          {/* Floating emojis from Slackmojis - fewer on mobile */}
          <FloatingEmojiImage index={0} delay={0} duration={4} className="top-4 right-4 sm:top-8 sm:right-16" />
          <FloatingEmojiImage index={1} delay={0.8} duration={4.5} className="top-12 right-12 sm:top-24 sm:right-24 hidden sm:block" />
          <FloatingEmojiImage index={2} delay={1.5} duration={5} className="top-16 right-24 sm:right-40 hidden md:block" />
          <FloatingEmojiImage index={3} delay={2} duration={4} className="bottom-24 right-16 sm:right-32 hidden lg:block" />
          <FloatingEmojiImage index={4} delay={2.5} duration={5} className="bottom-16 right-8 hidden lg:block" />

          <div className="relative z-20 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 p-6 sm:p-8 md:p-10">
            {/* Left side - Text content */}
            <div className="flex flex-col justify-center">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Badge variant="secondary" className="mb-4 md:mb-5 w-fit">
                  <Gift className="w-3 h-3 mr-1" />
                  <AnimatedShinyText className="text-inherit" shimmerWidth={80}>
                    {wrappedYear} Year in Review
                  </AnimatedShinyText>
                </Badge>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <SparklesText
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight mb-4 md:mb-5"
                  colors={{ first: "#3b82f6", second: "#8b5cf6" }}
                  sparklesCount={isMobile ? 6 : 10}
                >
                  Slack Emojis Wrapped
                </SparklesText>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <CardDescription className="text-base sm:text-lg md:text-xl max-w-md mb-6 md:mb-8">
                  Discover your workspace's emoji story. See top creators, busiest days, and fun stats.
                </CardDescription>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-2 sm:gap-3"
              >
                {hasData ? (
                  <RainbowButton
                    size={isMobile ? "default" : "lg"}
                    onClick={handleViewWrapped}
                    className="w-full sm:w-auto"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    View Your Wrapped
                  </RainbowButton>
                ) : (
                  <Button
                    size={isMobile ? "default" : "lg"}
                    className="w-full sm:w-auto font-semibold"
                    onClick={handleGetStarted}
                  >
                    Get Your Wrapped
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}

                {/* Desktop: Show Chrome extension button */}
                <Button
                  size={isMobile ? "default" : "lg"}
                  variant="outline"
                  className="w-full sm:w-auto hidden sm:flex"
                  onClick={handleChromeExtension}
                >
                  <Chrome className="w-4 h-4 mr-2" />
                  Chrome Extension
                </Button>

                {/* Mobile: Show email extension link button instead */}
                <Button
                  size="default"
                  variant="outline"
                  className="w-full sm:hidden"
                  onClick={handleEmailExtension}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email Extension Link
                </Button>
              </motion.div>

              {/* Mobile helper text */}
              {isMobile && !hasData && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-xs text-muted-foreground text-center sm:hidden mt-2"
                >
                  Emoji Studio works best on desktop. Email yourself the extension link.
                </motion.p>
              )}
            </div>

            {/* Right side - Stacked deck preview (desktop only in grid) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="hidden lg:flex flex-col justify-center items-center"
            >
              <div className="relative w-[340px] h-[340px]">
                {/* Dynamic glow behind deck */}
                <motion.div
                  className="absolute inset-0 -z-10 blur-3xl rounded-2xl"
                  animate={{
                    background: `radial-gradient(circle, ${PREVIEW_SLIDES[currentPreviewIndex].glowColor} 0%, transparent 70%)`,
                  }}
                  transition={{ duration: 0.4 }}
                />

                {/* Stacked cards */}
                {PREVIEW_SLIDES.map((slide, i) => {
                  const position = (i - currentPreviewIndex + PREVIEW_SLIDES.length) % PREVIEW_SLIDES.length

                  return (
                    <motion.div
                      key={slide.id}
                      animate={{
                        x: position * 8,
                        y: position * 8,
                        scale: 1 - position * 0.04,
                        opacity: 1 - position * 0.15,
                        zIndex: 40 - position * 10,
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className={`absolute top-0 left-0 w-[300px] h-[300px] rounded-2xl overflow-hidden bg-linear-to-br ${slide.gradient} shadow-2xl`}
                    >
                      {/* Grid background - only on front card */}
                      {position === 0 && (
                        <GridBackground
                          gridSize={24}
                          gridColor="rgba(255, 255, 255, 0.04)"
                          glowColor={slide.glowColor}
                          glowPosition="center"
                        />
                      )}

                      {/* Header */}
                      <div className="absolute top-4 left-0 right-0 text-center">
                        <p className="text-white/60 text-[10px] tracking-wider font-medium">SLACK EMOJIS WRAPPED</p>
                        <p className="text-white/40 text-[9px]">{wrappedYear}</p>
                      </div>

                      {/* Content */}
                      {renderSlideContent(slide.type, false)}

                      {/* Progress dots - only on front card */}
                      {position === 0 && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                          {PREVIEW_SLIDES.map((_, idx) => (
                            <div
                              key={idx}
                              className={`rounded-full h-1.5 transition-all duration-300 ${
                                idx === currentPreviewIndex ? "bg-white w-5" : "bg-white/30 w-1.5"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </div>

          {/* Stacked deck preview (mobile - below CTA) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:hidden flex justify-center pt-4 pb-8"
          >
            <div className="relative w-[270px] h-[270px]">
              {/* Dynamic glow behind deck */}
              <motion.div
                className="absolute inset-0 -z-10 blur-3xl rounded-2xl"
                animate={{
                  background: `radial-gradient(circle, ${PREVIEW_SLIDES[currentPreviewIndex].glowColor} 0%, transparent 70%)`,
                }}
                transition={{ duration: 0.4 }}
              />

              {/* Stacked cards */}
              {PREVIEW_SLIDES.map((slide, i) => {
                const position = (i - currentPreviewIndex + PREVIEW_SLIDES.length) % PREVIEW_SLIDES.length

                return (
                  <motion.div
                    key={slide.id}
                    animate={{
                      x: position * 6,
                      y: position * 6,
                      scale: 1 - position * 0.04,
                      opacity: 1 - position * 0.15,
                      zIndex: 40 - position * 10,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`absolute top-0 left-0 w-[240px] h-[240px] rounded-2xl overflow-hidden bg-linear-to-br ${slide.gradient} shadow-2xl`}
                  >
                    {/* Grid background - only on front card */}
                    {position === 0 && (
                      <GridBackground
                        gridSize={20}
                        gridColor="rgba(255, 255, 255, 0.04)"
                        glowColor={slide.glowColor}
                        glowPosition="center"
                      />
                    )}

                    {/* Header */}
                    <div className="absolute top-3 left-0 right-0 text-center">
                      <p className="text-white/60 text-[9px] tracking-wider font-medium">SLACK EMOJIS WRAPPED</p>
                      <p className="text-white/40 text-[8px]">{wrappedYear}</p>
                    </div>

                    {/* Content */}
                    {renderSlideContent(slide.type, true)}

                    {/* Progress dots - only on front card */}
                    {position === 0 && (
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
                        {PREVIEW_SLIDES.map((_, idx) => (
                          <div
                            key={idx}
                            className={`rounded-full h-1 transition-all duration-300 ${
                              idx === currentPreviewIndex ? "bg-white w-4" : "bg-white/30 w-1"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

        </Card>
      </div>

      {/* Feature Highlights - hidden on mobile for cleaner experience */}
      <div className="hidden sm:block px-0 sm:px-4 lg:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Interactive Story */}
            <Card className="border-muted/40 group hover:border-primary/30 transition-colors">
              <CardContent className="p-4 sm:p-5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-linear-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                </div>
                <h3 className="font-semibold text-xs sm:text-sm mb-1">Interactive Story</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Tap through slides and learn about your workspace's emoji usage.
                </p>
              </CardContent>
            </Card>

            {/* Privacy */}
            <Card className="border-muted/40 group hover:border-primary/30 transition-colors">
              <CardContent className="p-4 sm:p-5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-linear-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                </div>
                <h3 className="font-semibold text-xs sm:text-sm mb-1">100% Private + Local</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  All analysis happens in your browser
                </p>
              </CardContent>
            </Card>

            {/* Personal Stats */}
            <Card className="border-muted/40 group hover:border-primary/30 transition-colors">
              <CardContent className="p-4 sm:p-5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-linear-to-br from-green-500/20 to-green-600/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                </div>
                <h3 className="font-semibold text-xs sm:text-sm mb-1">Personal Stats</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  See your rank and contributions
                </p>
              </CardContent>
            </Card>

            {/* Fun Facts */}
            <Card className="border-muted/40 group hover:border-primary/30 transition-colors">
              <CardContent className="p-4 sm:p-5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-linear-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                </div>
                <h3 className="font-semibold text-xs sm:text-sm mb-1">Fun Facts</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Discover streaks and patterns
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>

      {/* iOS App Promotion */}
      <div className="px-4 sm:px-4 lg:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <Card className="relative overflow-hidden border-muted/40">
            <BorderBeam
              size={200}
              duration={10}
              colorFrom="#3b82f6"
              colorTo="#8b5cf6"
              borderWidth={2}
            />

            <div className="relative z-10 p-6 sm:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                {/* Left side - Content */}
                <div>
                  <Badge variant="secondary" className="mb-3 w-fit">
                    <Smartphone className="w-3 h-3 mr-1" />
                    <AnimatedShinyText className="text-inherit" shimmerWidth={60}>
                      Now on iOS
                    </AnimatedShinyText>
                  </Badge>

                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
                    Take Emoji Studio Mobile
                  </h3>

                  <p className="text-sm text-muted-foreground mb-4 max-w-md">
                    Explore your company culture through emojis, and create perfectly formatted ones on the go. Take photos, record videos, or generate with AI.
                  </p>

                  {/* Feature pills */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-medium">
                      <Zap className="w-3 h-3 text-primary" />
                      AI Generation
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-medium">
                      <Sparkles className="w-3 h-3 text-primary" />
                      Native iOS
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-medium">
                      <Bell className="w-3 h-3 text-primary" />
                      100% Free
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      size="lg"
                      onClick={handleiOSApp}
                      className="gap-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      Download on App Store
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      asChild
                      onClick={() => {
                        track("wrapped_landing_cta_clicked", {
                          cta: "learn_more_ios",
                          year: wrappedYear,
                        })
                      }}
                    >
                      <a href="https://emojistudio.xyz/mobile" target="_blank" rel="noopener noreferrer">
                        Learn More
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Right side - Phone mockup */}
                <div className="hidden lg:flex justify-center">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.6 }}
                    className="relative"
                  >
                    <Image
                      src="/ios-mockup.png"
                      alt="Emoji Studio iOS App"
                      width={280}
                      height={560}
                      className="relative z-10 drop-shadow-2xl"
                      priority
                    />
                    {/* Glow effect */}
                    <div className="absolute inset-0 -z-10 bg-linear-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 blur-3xl scale-110" />
                  </motion.div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* How it works - only for users without data */}
      {!hasData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="px-0 sm:px-4 lg:px-6"
        >
          <Card className="border-muted/40 bg-muted/20 rounded-none sm:rounded-lg">
            <CardContent className="p-4 sm:p-6">
              <p className="text-sm font-medium mb-4">How to get your Wrapped</p>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">1</span>
                  <span>Install the Chrome extension from the button above</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">2</span>
                  <span>Open your Slack workspace in Chrome</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">3</span>
                  <span>Click "Sync" to import your emoji data</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Email Extension Modal */}
      <EmailExtensionModal
        open={showEmailModal}
        onClose={() => setShowEmailModal(false)}
      />

      {/* Connect Workspace Modal */}
      <ConnectWorkspaceModal
        open={showConnectModal}
        onOpenChange={setShowConnectModal}
      />
    </div>
  )
}
