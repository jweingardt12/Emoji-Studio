"use client"

import { useMemo, useEffect, useRef, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Activity, Settings } from "lucide-react"
import Link from "next/link"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { useIsClient } from "@/hooks/use-is-client"
import { useAnalytics } from "@/lib/analytics"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import EmojiOverlay from "@/components/emoji-overlay"
import type { Emoji } from "@/lib/services/emoji-service"
import { useReactionsState } from "./hooks/use-reactions-state"
import { ChannelPicker } from "./components/channel-picker"
import { ScanProgress } from "./components/scan-progress"
import { ReactionStatsCards } from "./components/reaction-stats-cards"
import { TopReactionsChart } from "./components/top-reactions-chart"
import { ReactionTimeline } from "./components/reaction-timeline"
import { YourReactions } from "./components/your-reactions"
import { ChannelBreakdown } from "./components/channel-breakdown"
import dynamic from "next/dynamic"
import { staggerContainer, fadeUp } from "@/lib/motion"
const ShareCardGenerator = dynamic(
  () => import("./components/share-card-generator").then(mod => mod.ShareCardGenerator),
  { ssr: false }
)
import { TopCreators } from "./components/top-creators"
import { TopReactors } from "./components/top-reactors"
import { HowItWorksModal } from "./components/how-it-works-modal"

export default function ReactionsPage() {
  const isClient = useIsClient()
  const { emojiData, hasRealData } = useEmojiData()
  const curlCommand = isClient ? localStorage.getItem("slackCurlCommand") : null
  const currentUserId = isClient ? localStorage.getItem("slackUserId") : null

  // Single pass over emojiData to build all lookup maps
  const { customEmojiNames, customEmojiUrls, emojiByName, userNameMap } = useMemo(() => {
    const names = new Set<string>()
    const urls = new Map<string, string>()
    const byName = new Map<string, Emoji>()
    const users = new Map<string, string>()
    for (const emoji of emojiData) {
      if (!emoji.is_alias) {
        byName.set(emoji.name, emoji)
        if (emoji.url) {
          names.add(emoji.name)
          urls.set(emoji.name, emoji.url)
        }
        if (emoji.user_id && emoji.user_display_name && !users.has(emoji.user_id)) {
          users.set(emoji.user_id, emoji.user_display_name)
        }
      }
    }
    return { customEmojiNames: names, customEmojiUrls: urls, emojiByName: byName, userNameMap: users }
  }, [emojiData])

  const [selectedEmoji, setSelectedEmoji] = useState<Emoji | null>(null)

  const handleEmojiClick = useCallback((name: string) => {
    const emoji = emojiByName.get(name)
    if (emoji) setSelectedEmoji(emoji)
  }, [emojiByName])

  const analytics = useAnalytics()
  const state = useReactionsState(curlCommand, customEmojiNames)

  const hasData = state.reactionEvents.length > 0

  // Track scan completion
  const prevStatusRef = useRef(state.scanProgress.status)
  useEffect(() => {
    if (prevStatusRef.current === "scanning" && state.scanProgress.status === "complete") {
      analytics.trackReactionsScanCompleted(
        state.scanProgress.channels_done,
        state.scanProgress.reactions_found,
        state.dateRange
      )
    }
    prevStatusRef.current = state.scanProgress.status
  }, [state.scanProgress.status, state.scanProgress.channels_done, state.scanProgress.reactions_found, state.dateRange, analytics])

  const channelNames = useMemo(
    () => state.selectedChannels.map(id => state.channels.find(c => c.id === id)?.name ?? id),
    [state.selectedChannels, state.channels]
  )

  if (!isClient) {
    return (
      <div className="flex flex-col gap-6 md:gap-8 w-full pb-8">
        <div className="px-3 sm:px-4 lg:px-6 pt-4 md:pt-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-10 w-full mt-4" />
        </div>
        <div className="px-3 sm:px-4 lg:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="px-3 sm:px-4 lg:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <Skeleton className="h-[400px] w-full rounded-xl lg:col-span-2" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </div>
        <div className="px-3 sm:px-4 lg:px-6">
          <Skeleton className="h-[200px] w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="flex flex-col gap-6 md:gap-8 w-full pb-8"
      variants={staggerContainer()}
      initial="hidden"
      animate="show"
    >
      {/* Header + Channel Picker */}
      <motion.div variants={fadeUp} className="px-3 sm:px-4 lg:px-6 pt-4 md:pt-6">
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Usage</h1>
              <HowItWorksModal />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              See how your workspace&apos;s emojis are being used across Slack.
            </p>
          </div>

          <ChannelPicker
            channels={state.channels}
            selectedChannels={state.selectedChannels}
            setSelectedChannels={state.setSelectedChannels}
            channelsLoading={state.channelsLoading}
            fetchChannels={state.fetchChannels}
            dateRange={state.dateRange}
            setDateRange={(range) => {
              analytics.trackReactionsDateRangeChanged(range)
              state.setDateRange(range)
            }}
            onScan={() => {
              analytics.trackReactionsScanStarted(state.selectedChannels.length, state.dateRange)
              state.startScan()
            }}
            scanStatus={state.scanProgress.status}
          />
        </div>
      </motion.div>

      {/* Scan Progress */}
      <motion.div variants={fadeUp} className="px-3 sm:px-4 lg:px-6">
        <ScanProgress
          status={state.scanProgress.status}
          currentChannel={state.scanProgress.current_channel}
          channelsDone={state.scanProgress.channels_done}
          channelsTotal={state.scanProgress.channels_total}
          reactionsFound={state.scanProgress.reactions_found}
          onCancel={state.cancelScan}
          onRetry={state.startScan}
          scannedChannels={state.scanProgress.scanned_channels}
        />
      </motion.div>

      {/* Empty State -- ghost preview showing what scanning reveals */}
      {!hasData && state.scanProgress.status !== "scanning" && state.scanProgress.status !== "complete" && (
        <motion.div variants={fadeUp} className="px-3 sm:px-4 lg:px-6">
          {!hasRealData ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
                <Activity className="h-8 w-8 text-muted-foreground" />
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">Connect to Slack to get started</p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    You&apos;ll need to connect your Slack workspace before scanning emoji usage.
                  </p>
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-1.5 mt-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Go to Settings
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              {/* Ghost preview of what data looks like */}
              <div className="opacity-[0.08] pointer-events-none select-none" aria-hidden="true">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {["Total Reactions", "Unique Emojis", "Most Popular", "This Week"].map((label) => (
                    <Card key={label}>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <div className="h-8 w-20 rounded bg-foreground/20 mt-1" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {[80, 65, 45, 30, 20].map((w, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="h-6 w-6 rounded bg-foreground/20" />
                          <div className="flex-1 h-2 rounded-full bg-foreground/20" style={{ width: `${w}%` }} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              {/* Overlay CTA */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3 bg-background/80 backdrop-blur-xs rounded-xl px-8 py-6">
                  <p className="text-base font-semibold">Ready to scan</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Select channels above and click Scan to discover how your emojis are used.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Data Sections */}
      {hasData && (
        <>
          {/* Stats Cards */}
          <motion.div variants={fadeUp} className="px-3 sm:px-4 lg:px-6">
            <ReactionStatsCards stats={state.stats} customEmojiUrls={customEmojiUrls} onEmojiClick={handleEmojiClick} dateRange={state.dateRange} />
          </motion.div>

          {/* Top Reactions */}
          <motion.div variants={fadeUp} className="px-3 sm:px-4 lg:px-6">
            <TopReactionsChart
              topReactions={state.topReactions}
              emojiFilter={state.emojiFilter}
              setEmojiFilter={(filter) => {
                analytics.trackReactionsFilterChanged(filter)
                state.setEmojiFilter(filter)
              }}
              customEmojiUrls={customEmojiUrls}
              emojiData={emojiData}
              onEmojiClick={handleEmojiClick}
            />
          </motion.div>

          {/* Top Reactors + Top Creators (side by side on desktop) */}
          <motion.div variants={fadeUp} className="px-3 sm:px-4 lg:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <TopReactors
                userStats={state.userStats}
                userNameMap={userNameMap}
                customEmojiUrls={customEmojiUrls}
                onEmojiClick={handleEmojiClick}
              />
              <TopCreators
                topReactions={state.topReactions}
                emojiData={emojiData}
                customEmojiUrls={customEmojiUrls}
              />
            </div>
          </motion.div>

          {/* Timeline */}
          <motion.div variants={fadeUp} className="px-3 sm:px-4 lg:px-6">
            <ReactionTimeline data={state.timelineData} />
          </motion.div>

          {/* Your Emojis + Share Card */}
          <motion.div variants={fadeUp} className="px-3 sm:px-4 lg:px-6">
            <div className={`grid grid-cols-1 gap-4 lg:gap-6 ${currentUserId ? "lg:grid-cols-2" : ""}`}>
              {currentUserId && (
                <YourReactions
                  userStats={state.userStats}
                  currentUserId={currentUserId}
                  customEmojiUrls={customEmojiUrls}
                  onEmojiClick={handleEmojiClick}
                />
              )}
              <ShareCardGenerator
                stats={state.stats}
                topReactions={state.topReactions}
                customEmojiUrls={customEmojiUrls}
                channelNames={channelNames}
                dateRange={state.dateRange}
                onDownload={analytics.trackReactionsShareCardDownloaded}
                onCopy={analytics.trackReactionsShareCardCopied}
              />
            </div>
          </motion.div>

          {/* Channel Breakdown */}
          <motion.div variants={fadeUp} className="px-3 sm:px-4 lg:px-6">
            <ChannelBreakdown
              breakdown={state.channelBreakdown}
              channels={state.channels}
              customEmojiUrls={customEmojiUrls}
              userNameMap={userNameMap}
              onEmojiClick={handleEmojiClick}
            />
          </motion.div>
        </>
      )}

      <EmojiOverlay
        emoji={selectedEmoji}
        onClose={() => setSelectedEmoji(null)}
      />
    </motion.div>
  )
}
