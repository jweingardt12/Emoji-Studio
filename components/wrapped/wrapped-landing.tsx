"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTrack } from "@/lib/hooks/use-track"
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
  Users,
  Calendar,
  TrendingUp,
  Sparkles,
  Gift,
  Trophy,
  Flame,
  Moon,
  Share2,
  User,
  Smartphone,
  Zap,
  Bell,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

// Floating emoji component for visual interest
function FloatingEmoji({
  emoji,
  delay,
  duration,
  className
}: {
  emoji: string
  delay: number
  duration: number
  className?: string
}) {
  return (
    <motion.div
      className={`absolute text-2xl sm:text-3xl select-none pointer-events-none ${className}`}
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
    >
      {emoji}
    </motion.div>
  )
}

// Mini slide preview component
function SlidePreview({
  icon: Icon,
  label,
  value,
  delay
}: {
  icon: React.ElementType
  label: string
  value: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50"
    >
      <div className="p-2 rounded-md bg-primary/10">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </motion.div>
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
  const currentYear = new Date().getFullYear()
  const [pageVisible, setPageVisible] = useState(false)

  useEffect(() => {
    // Trigger fade in animation
    const timer = setTimeout(() => setPageVisible(true), 100)

    track("wrapped_landing_viewed", {
      year: currentYear,
      has_data: hasData,
      referrer: typeof document !== "undefined" ? document.referrer : "",
    })

    return () => clearTimeout(timer)
  }, [track, currentYear, hasData])

  const handleGetStarted = () => {
    track("wrapped_landing_cta_clicked", {
      cta: "get_started",
      year: currentYear,
    })
  }

  const handleViewWrapped = () => {
    track("wrapped_landing_cta_clicked", {
      cta: "view_wrapped",
      year: currentYear,
    })
    onViewWrapped?.()
  }

  const handleChromeExtension = () => {
    track("wrapped_landing_cta_clicked", {
      cta: "chrome_extension",
      year: currentYear,
    })
    window.open(
      "https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa",
      "_blank"
    )
  }

  const handleiOSApp = () => {
    track("wrapped_landing_cta_clicked", {
      cta: "ios_app",
      year: currentYear,
    })
    window.open(
      "https://apps.apple.com/us/app/emoji-studio-for-slack/id6751079971",
      "_blank"
    )
  }

  return (
    <div className={`flex flex-col gap-6 md:gap-8 w-full pb-8 transition-all duration-700 ${
      pageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      {/* Confetti effect on page load */}
      {pageVisible && <ConfettiSideCannons />}
      {/* Hero Card - Larger with preview */}
      <div className="px-3 sm:px-4 lg:px-6 pt-4 md:pt-8">
        <Card className="relative overflow-hidden border-muted/40">
          {/* Flickering grid background */}
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            <FlickeringGrid
              className="absolute inset-0 z-0"
              squareSize={4}
              gridGap={6}
              color="rgb(59, 130, 246)"
              maxOpacity={0.1}
              flickerChance={0.1}
            />
          </div>

          {/* Subtle decorative gradient accents */}
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-full blur-3xl pointer-events-none z-10" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-violet-500/10 to-transparent rounded-full blur-3xl pointer-events-none z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl pointer-events-none z-10" />

          {/* Floating emojis */}
          <FloatingEmoji emoji="🎉" delay={0} duration={4} className="top-8 right-8 sm:right-16" />
          <FloatingEmoji emoji="🏆" delay={1.5} duration={5} className="top-16 right-24 sm:right-40" />
          <FloatingEmoji emoji="✨" delay={0.8} duration={4.5} className="top-24 right-12 sm:right-24" />
          <FloatingEmoji emoji="🔥" delay={2} duration={4} className="bottom-24 right-16 sm:right-32 hidden sm:block" />
          <FloatingEmoji emoji="💜" delay={2.5} duration={5} className="bottom-16 right-8 hidden sm:block" />

          <div className="relative z-20 grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 sm:p-8">
            {/* Left side - Text content */}
            <div className="flex flex-col justify-center">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Badge variant="secondary" className="mb-4 w-fit">
                  <Gift className="w-3 h-3 mr-1" />
                  <AnimatedShinyText className="text-inherit" shimmerWidth={80}>
                    {currentYear} Year in Review
                  </AnimatedShinyText>
                </Badge>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <SparklesText
                  className="text-3xl sm:text-4xl md:text-5xl tracking-tight mb-4"
                  colors={{ first: "#3b82f6", second: "#8b5cf6" }}
                  sparklesCount={10}
                >
                  Slack Emojis Wrapped
                </SparklesText>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <CardDescription className="text-base sm:text-lg max-w-md mb-6">
                  Discover your Slack workspace's emoji story. See top creators, busiest days, and fun stats from your year.
                </CardDescription>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                {hasData ? (
                  <RainbowButton
                    size="lg"
                    onClick={handleViewWrapped}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    View Your Wrapped
                  </RainbowButton>
                ) : (
                  <Button
                    size="lg"
                    className="w-full sm:w-auto font-semibold"
                    onClick={handleGetStarted}
                    asChild
                  >
                    <Link href="/settings">
                      Get Your Wrapped
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                )}

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleChromeExtension}
                >
                  <Chrome className="w-4 h-4 mr-2" />
                  Chrome Extension
                </Button>
              </motion.div>
            </div>

            {/* Right side - Preview mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="hidden lg:flex flex-col justify-center"
            >
              <div className="relative">
                {/* Mock wrapped story preview */}
                <div className="relative bg-gradient-to-br from-muted/80 to-muted/40 backdrop-blur rounded-xl border border-border/50 p-6 shadow-2xl">
                  {/* Mock story header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-sm">🎊</span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Your Workspace</p>
                        <p className="text-sm font-medium">{currentYear} Wrapped</p>
                      </div>
                    </div>
                    {/* Progress dots */}
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          className={`rounded-full ${i === 0 ? "bg-primary w-4" : "bg-muted-foreground/30 w-1.5"} h-1.5`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Preview slides content */}
                  <div className="space-y-3">
                    <SlidePreview
                      icon={TrendingUp}
                      label="Total Emojis"
                      value="847 created"
                      delay={0.6}
                    />
                    <SlidePreview
                      icon={Trophy}
                      label="Top Creator"
                      value="#1 in your team"
                      delay={0.7}
                    />
                    <SlidePreview
                      icon={Flame}
                      label="Longest Streak"
                      value="12 days straight"
                      delay={0.8}
                    />
                    <SlidePreview
                      icon={Moon}
                      label="Late Night Uploads"
                      value="23 after midnight"
                      delay={0.9}
                    />
                  </div>

                  {/* Decorative corner emojis */}
                  <motion.div
                    className="absolute -top-3 -right-3 text-2xl"
                    initial={{ opacity: 0, rotate: -20 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{ delay: 1, type: "spring" }}
                  >
                    🚀
                  </motion.div>
                </div>

                {/* Glow effect behind preview */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-2xl rounded-xl" />
              </div>
            </motion.div>
          </div>

          {/* Mobile preview - simplified */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:hidden relative z-20 px-6 pb-6"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
                <TrendingUp className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Emojis</p>
                  <p className="text-sm font-semibold">847+</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
                <Users className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Creators</p>
                  <p className="text-sm font-semibold">Top 10</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
                <Flame className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Streaks</p>
                  <p className="text-sm font-semibold">12 days</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
                <Calendar className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Peak Day</p>
                  <p className="text-sm font-semibold">Friday</p>
                </div>
              </div>
            </div>
          </motion.div>
        </Card>
      </div>

      {/* Feature Highlights */}
      <div className="px-3 sm:px-4 lg:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Interactive Story */}
            <Card className="border-muted/40 group hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Interactive Story</h3>
                <p className="text-xs text-muted-foreground">
                  Tap through slides like Instagram Stories to explore your year
                </p>
              </CardContent>
            </Card>

            {/* Shareable Cards */}
            <Card className="border-muted/40 group hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Share2 className="w-5 h-5 text-purple-500" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Shareable Cards</h3>
                <p className="text-xs text-muted-foreground">
                  Download and share beautiful summary cards on social media
                </p>
              </CardContent>
            </Card>

            {/* Personal Stats */}
            <Card className="border-muted/40 group hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <User className="w-5 h-5 text-green-500" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Personal Stats</h3>
                <p className="text-xs text-muted-foreground">
                  See your own rank, contributions, and favorite creation times
                </p>
              </CardContent>
            </Card>

            {/* Fun Facts */}
            <Card className="border-muted/40 group hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Fun Facts</h3>
                <p className="text-xs text-muted-foreground">
                  Discover streaks, late-night uploads, and quirky patterns
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>

      {/* iOS App Promotion */}
      <div className="px-3 sm:px-4 lg:px-6">
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
                          year: currentYear,
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
                    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 blur-3xl scale-110" />
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
          className="px-3 sm:px-4 lg:px-6"
        >
          <Card className="border-muted/40 bg-muted/20">
            <CardContent className="p-6">
              <p className="text-sm font-medium mb-4">How to get your Wrapped</p>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">1</span>
                  <span>Install the Chrome extension from the button above</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">2</span>
                  <span>Open your Slack workspace in Chrome</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">3</span>
                  <span>Click "Sync" to import your emoji data</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
