"use client"

import { useMemo, useEffect, useRef, useState } from "react"
import { Activity, Hash, Settings, Info, Shield, Globe, HardDrive, Zap } from "lucide-react"
import Link from "next/link"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { useIsClient } from "@/hooks/use-is-client"
import { useAnalytics } from "@/lib/analytics"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InfoDrawerResponsive } from "@/components/info-drawer-responsive"
import { useReactionsState } from "./hooks/use-reactions-state"
import { ChannelPicker } from "./components/channel-picker"
import { ScanProgress } from "./components/scan-progress"
import { ReactionStatsCards } from "./components/reaction-stats-cards"
import { TopReactionsChart } from "./components/top-reactions-chart"
import { ReactionTimeline } from "./components/reaction-timeline"
import { YourReactions } from "./components/your-reactions"
import { ChannelBreakdown } from "./components/channel-breakdown"
import { ShareCardGenerator } from "./components/share-card-generator"
import { TopCreators } from "./components/top-creators"

export default function ReactionsPage() {
  const isClient = useIsClient()
  const { emojiData, hasRealData } = useEmojiData()
  const [pageVisible, setPageVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setPageVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const curlCommand = isClient ? localStorage.getItem("slackCurlCommand") : null
  const currentUserId = isClient ? localStorage.getItem("slackUserId") : null

  // Single pass over emojiData to build both the name set and URL map
  const { customEmojiNames, customEmojiUrls } = useMemo(() => {
    const names = new Set<string>()
    const urls = new Map<string, string>()
    for (const emoji of emojiData) {
      if (!emoji.is_alias && emoji.url) {
        names.add(emoji.name)
        urls.set(emoji.name, emoji.url)
      }
    }
    return { customEmojiNames: names, customEmojiUrls: urls }
  }, [emojiData])

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
    <div className="flex flex-col gap-6 md:gap-8 w-full pb-8">
      {/* Header + Channel Picker */}
      <div className={`px-3 sm:px-4 lg:px-6 pt-4 md:pt-6 transition-all duration-500 ease-out ${pageVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Usage</h1>
              <InfoDrawerResponsive
                trigger={
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <Info className="h-4 w-4" />
                    <span className="sr-only">How this works</span>
                  </Button>
                }
                title="How Usage Scanning Works"
                description="Understand how Emoji Studio scans your Slack workspace and keeps your data secure."
              >
                <div className="space-y-6 text-sm">
                  <div className="flex gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 h-fit shrink-0">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">How it works</p>
                      <p className="text-muted-foreground mt-1">
                        Usage scanning reads message history from the Slack channels you select using the
                        Slack <code className="text-xs bg-muted px-1 py-0.5 rounded">conversations.history</code> API.
                        It looks at emoji reactions on messages and aggregates them into charts
                        and leaderboards &mdash; it does not read or store message content.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="rounded-lg bg-green-500/10 p-2 h-fit shrink-0">
                      <Shield className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Your credentials</p>
                      <p className="text-muted-foreground mt-1">
                        Authentication uses the same Slack session you set up in Settings.
                        Your token is stored only in your browser&apos;s local storage and is never
                        sent to any third-party server. API calls are proxied through a
                        server-side route that <strong>only</strong> allows
                        {" "}<code className="text-xs bg-muted px-1 py-0.5 rounded">conversations.list</code> and
                        {" "}<code className="text-xs bg-muted px-1 py-0.5 rounded">conversations.history</code> &mdash;
                        no other Slack endpoints are reachable.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="rounded-lg bg-blue-500/10 p-2 h-fit shrink-0">
                      <HardDrive className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Data storage</p>
                      <p className="text-muted-foreground mt-1">
                        All reaction data is processed entirely in your browser. Scan results are
                        cached locally so you don&apos;t have to re-scan every time. Nothing is uploaded
                        to any external server or database &mdash; your data stays on your device.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="rounded-lg bg-orange-500/10 p-2 h-fit shrink-0">
                      <Globe className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium">Rate limiting</p>
                      <p className="text-muted-foreground mt-1">
                        Scans are rate-limited to avoid hitting Slack&apos;s API limits. Each channel
                        is scanned sequentially with a delay between requests. Larger channels or
                        longer date ranges will take more time.
                      </p>
                    </div>
                  </div>
                </div>
              </InfoDrawerResponsive>
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
      </div>

      {/* Scan Progress */}
      <div className="px-3 sm:px-4 lg:px-6">
        <ScanProgress
          status={state.scanProgress.status}
          currentChannel={state.scanProgress.current_channel}
          channelsDone={state.scanProgress.channels_done}
          channelsTotal={state.scanProgress.channels_total}
          reactionsFound={state.scanProgress.reactions_found}
          onCancel={state.cancelScan}
          scannedChannels={state.scanProgress.scanned_channels}
        />
      </div>

      {/* Empty State */}
      {!hasData && state.scanProgress.status !== "scanning" && (
        <div className={`px-3 sm:px-4 lg:px-6 transition-all duration-500 ease-out delay-100 ${pageVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
              <div className="rounded-full bg-muted p-4">
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
              {!hasRealData ? (
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
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-sm font-medium">Ready to scan</p>
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                      <span>Select channels above</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                      <span>Pick a date range</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                      <span>Click <strong>Scan Channels</strong> to see usage data</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Sections */}
      {hasData && (
        <>
          {/* Stats Cards */}
          <div className={`px-3 sm:px-4 lg:px-6 transition-all duration-500 ease-out delay-100 ${pageVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            <ReactionStatsCards stats={state.stats} customEmojiUrls={customEmojiUrls} />
          </div>

          {/* Top Reactions + Top Creators (2/3 + 1/3 on desktop) */}
          <div className={`px-3 sm:px-4 lg:px-6 transition-all duration-500 ease-out delay-150 ${pageVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-[0.98]"}`}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="lg:col-span-2">
                <TopReactionsChart
                  topReactions={state.topReactions}
                  emojiFilter={state.emojiFilter}
                  setEmojiFilter={(filter) => {
                    analytics.trackReactionsFilterChanged(filter)
                    state.setEmojiFilter(filter)
                  }}
                  customEmojiUrls={customEmojiUrls}
                  emojiData={emojiData}
                />
              </div>
              <div className="lg:col-span-1">
                <TopCreators
                  topReactions={state.topReactions}
                  emojiData={emojiData}
                  customEmojiUrls={customEmojiUrls}
                />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className={`px-3 sm:px-4 lg:px-6 transition-all duration-500 ease-out delay-200 ${pageVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-[0.98]"}`}>
            <ReactionTimeline data={state.timelineData} />
          </div>

          {/* Your Emojis + Share Card (1/2 + 1/2 on desktop) */}
          <div className={`px-3 sm:px-4 lg:px-6 transition-all duration-500 ease-out delay-300 ${pageVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <YourReactions
                userStats={state.userStats}
                currentUserId={currentUserId}
                customEmojiUrls={customEmojiUrls}
              />
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
          </div>

          {/* Channel Breakdown */}
          <div className={`px-3 sm:px-4 lg:px-6 transition-all duration-500 ease-out delay-300 ${pageVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            <ChannelBreakdown
              breakdown={state.channelBreakdown}
              channels={state.channels}
              customEmojiUrls={customEmojiUrls}
            />
          </div>
        </>
      )}
    </div>
  )
}
