"use client"

import { useState, useEffect } from "react"
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

function WrappedPageContent() {
  const [isClient, setIsClient] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [storyComplete, setStoryComplete] = useState(false)
  const [showStory, setShowStory] = useState(false)
  const [workspaceName, setWorkspaceName] = useState("")

  const { emojiData, hasRealData, useDemoData, loading } = useEmojiData()
  const track = useTrack()
  const currentYear = new Date().getFullYear()
  const { stats, personalStats, hasMinimumData, availableYears, emojiCount, yearEmojis, error } = useWrappedStats(emojiData, {
    year: currentYear,
  })

  const hasData = hasRealData || useDemoData

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
    })
  }, [])

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
  if (!isClient || loading) {
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

export default function WrappedPage() {
  return <WrappedPageContent />
}
