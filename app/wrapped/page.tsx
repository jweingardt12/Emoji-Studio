"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { useWrappedStats } from "@/lib/hooks/use-wrapped-stats"
import { useTrack } from "@/lib/hooks/use-track"
import { WrappedStory } from "@/components/wrapped/wrapped-story"
import { WrappedShareModal } from "@/components/wrapped/wrapped-share-modal"
import { WrappedLanding } from "@/components/wrapped/wrapped-landing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchEmojiDataWithMobileAuth, getMobileUserId } from "@/lib/services/mobile-emoji-fetch"

function WrappedPageContent() {
  const [isClient, setIsClient] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [storyComplete, setStoryComplete] = useState(false)
  const [showStory, setShowStory] = useState(false)
  const [workspaceName, setWorkspaceName] = useState("")
  const [mobileAuthLoading, setMobileAuthLoading] = useState(false)
  const [cameFromMobile, setCameFromMobile] = useState(false)

  // Read URL params for mobile auth
  const searchParams = useSearchParams()
  const mobileToken = searchParams.get("token")
  const mobileUserId = searchParams.get("userId")
  const mobileTeamId = searchParams.get("teamId")
  const mobileCookie = searchParams.get("cookie")
  const mobileWorkspace = searchParams.get("workspace")
  const isEmbedded = searchParams.get("embedded") === "true"
  const hasMobileParams = !!(mobileToken && mobileUserId && mobileTeamId)

  const { emojiData, hasRealData, useDemoData, loading } = useEmojiData()
  const track = useTrack()
  const currentYear = new Date().getFullYear()

  // Get stored mobile userId for personal stats filtering
  const storedMobileUserId = isClient ? getMobileUserId() : null

  const { stats, personalStats, hasMinimumData, availableYears, emojiCount, yearEmojis, error } = useWrappedStats(emojiData, {
    year: currentYear,
    userId: storedMobileUserId || undefined,
  })

  const hasData = hasRealData || useDemoData

  // Handle mobile auth params on mount
  useEffect(() => {
    if (!hasMobileParams) return

    const handleMobileAuth = async () => {
      console.log("[Wrapped] Mobile auth params detected, fetching emoji data...")
      setMobileAuthLoading(true)
      setCameFromMobile(true)

      // Set workspace name from mobile params if available
      if (mobileWorkspace) {
        setWorkspaceName(mobileWorkspace)
        localStorage.setItem("workspace", mobileWorkspace)
      }

      try {
        // Store mobile auth for future use
        localStorage.setItem("mobileAuth", JSON.stringify({
          token: mobileToken,
          userId: mobileUserId,
          teamId: mobileTeamId,
          workspace: mobileWorkspace,
          timestamp: Date.now(),
        }))

        // Clean URL to remove sensitive params from browser history
        window.history.replaceState({}, "", "/wrapped")

        // Fetch emoji data with mobile credentials
        await fetchEmojiDataWithMobileAuth({
          token: mobileToken!,
          userId: mobileUserId!,
          teamId: mobileTeamId!,
          cookie: mobileCookie || undefined,
        })

        console.log("[Wrapped] Mobile auth fetch completed")
      } catch (error) {
        console.error("[Wrapped] Mobile auth fetch failed:", error)
      } finally {
        setMobileAuthLoading(false)
      }
    }

    handleMobileAuth()
  }, [hasMobileParams, mobileToken, mobileUserId, mobileTeamId, mobileCookie, mobileWorkspace])

  useEffect(() => {
    setIsClient(true)
    // Get workspace name from localStorage
    const storedName = localStorage.getItem("workspace") || "Your Workspace"
    setWorkspaceName(storedName)

    // Track page view
    track("wrapped_page_viewed", {
      has_data: hasData,
      has_real_data: hasRealData,
      year: currentYear,
      is_mobile_auth: hasMobileParams,
    })
  }, [])

  // Hide app frame (header, sidebar) when:
  // - Explicitly embedded via URL param
  // - Coming from mobile app with auth params
  // - Actively viewing the wrapped story (for immersive experience)
  useEffect(() => {
    const shouldHideFrame = isEmbedded || hasMobileParams || cameFromMobile || showStory

    if (shouldHideFrame) {
      document.body.classList.add("wrapped-embedded")
      return () => {
        document.body.classList.remove("wrapped-embedded")
      }
    }
  }, [isEmbedded, hasMobileParams, cameFromMobile, showStory])

  // Auto-start wrapped experience when coming from mobile app
  useEffect(() => {
    if (cameFromMobile && hasMinimumData && stats && !showStory && !mobileAuthLoading) {
      console.log("[Wrapped] Auto-starting wrapped experience for mobile user")
      setShowStory(true)
    }
  }, [cameFromMobile, hasMinimumData, stats, showStory, mobileAuthLoading])

  // Track when user enters the wrapped experience
  useEffect(() => {
    if (isClient && showStory && hasMinimumData && stats) {
      track("wrapped_experience_started", {
        year: currentYear,
        total_emojis: stats.overview.totalEmojis,
        total_creators: stats.overview.totalCreators,
        has_personal_stats: !!personalStats,
      })
    }
  }, [isClient, showStory, hasMinimumData, stats, personalStats, currentYear, track])

  // Loading state - match app aesthetic
  if (!isClient || loading || mobileAuthLoading) {
    return (
      <div className="flex flex-col gap-6 md:gap-8 w-full pb-8">
        <div className="px-3 sm:px-4 lg:px-6 pt-4 md:pt-8">
          <Card className="border-muted/40">
            <CardHeader>
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-10 w-48 mb-2" />
              <Skeleton className="h-5 w-96" />
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 rounded-lg bg-[var(--wrapped-glass-bg)] border border-[var(--wrapped-glass-border)]">
                <Skeleton className="h-4 w-40 mx-auto mb-3" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <Skeleton className="h-8 w-16 mx-auto mb-1" />
                    <Skeleton className="h-3 w-12 mx-auto" />
                  </div>
                  <div className="text-center">
                    <Skeleton className="h-8 w-16 mx-auto mb-1" />
                    <Skeleton className="h-3 w-12 mx-auto" />
                  </div>
                  <div className="text-center">
                    <Skeleton className="h-8 w-16 mx-auto mb-1" />
                    <Skeleton className="h-3 w-12 mx-auto" />
                  </div>
                </div>
              </div>
              <Skeleton className="h-11 w-48" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // If user clicked "View Wrapped" and has minimum data, show the story
  if (showStory && hasMinimumData && stats) {
    return (
      <>
        <WrappedStory
          stats={stats}
          personalStats={personalStats}
          workspaceName={workspaceName}
          onComplete={() => {
            setStoryComplete(true)
            track("wrapped_story_completed", {
              year: currentYear,
              total_emojis: stats.overview.totalEmojis,
            })
          }}
          onSkipToShare={() => {
            setShowShareModal(true)
            track("wrapped_skip_to_share", {
              year: currentYear,
            })
          }}
          allYearEmojis={yearEmojis}
        />

        <WrappedShareModal
          open={showShareModal}
          onOpenChange={setShowShareModal}
          stats={stats}
          workspaceName={workspaceName}
          yearEmojis={yearEmojis}
          creatorName={personalStats?.displayName}
          userId={personalStats?.userId}
        />
      </>
    )
  }

  // If user clicked "View Wrapped" but doesn't have enough data
  if (showStory && hasData && (!hasMinimumData || !stats)) {
    return (
      <div className="flex flex-col gap-6 md:gap-8 w-full pb-8">
        <div className="px-3 sm:px-4 lg:px-6 pt-4 md:pt-8">
          <Card className="border-muted/40">
            <CardHeader className="text-center pb-2">
              <div className="text-5xl mb-4">🎁</div>
              <CardTitle className="text-2xl">Not Enough Emojis Yet</CardTitle>
              <CardDescription className="text-base">
                Your workspace needs at least 10 emojis created in {currentYear} to generate your Wrapped.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-6">
                Currently: {emojiCount} emoji{emojiCount !== 1 ? "s" : ""} this year
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowStory(false)}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button size="lg" asChild>
                  <Link href="/dashboard">
                    Go to Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Default: Always show the landing page
  return (
    <WrappedLanding
      hasData={hasData && hasMinimumData}
      onViewWrapped={() => setShowStory(true)}
    />
  )
}

// Loading fallback for Suspense
function WrappedLoadingFallback() {
  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full pb-8">
      <div className="px-3 sm:px-4 lg:px-6 pt-4 md:pt-8">
        <Card className="border-muted/40">
          <CardHeader>
            <Skeleton className="h-5 w-32 mb-3" />
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-5 w-96" />
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 rounded-lg bg-muted/30">
              <Skeleton className="h-4 w-40 mx-auto mb-3" />
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <Skeleton className="h-8 w-16 mx-auto mb-1" />
                  <Skeleton className="h-3 w-12 mx-auto" />
                </div>
                <div className="text-center">
                  <Skeleton className="h-8 w-16 mx-auto mb-1" />
                  <Skeleton className="h-3 w-12 mx-auto" />
                </div>
                <div className="text-center">
                  <Skeleton className="h-8 w-16 mx-auto mb-1" />
                  <Skeleton className="h-3 w-12 mx-auto" />
                </div>
              </div>
            </div>
            <Skeleton className="h-11 w-48" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function WrappedPage() {
  return (
    <Suspense fallback={<WrappedLoadingFallback />}>
      <WrappedPageContent />
    </Suspense>
  )
}
