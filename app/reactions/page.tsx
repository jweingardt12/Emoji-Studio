"use client"

import { useMemo } from "react"
import { BarChart3 } from "lucide-react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { useIsClient } from "@/hooks/use-is-client"
import { Skeleton } from "@/components/ui/skeleton"
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

  const state = useReactionsState(curlCommand, customEmojiNames)

  const hasData = state.reactionEvents.length > 0

  const channelNames = useMemo(
    () => state.selectedChannels.map(id => state.channels.find(c => c.id === id)?.name ?? id),
    [state.selectedChannels, state.channels]
  )

  if (!isClient) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6 pb-8 w-full">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 pb-8 w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reactions Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scan Slack channels to explore emoji reaction activity.
        </p>
      </div>

      <ChannelPicker
        channels={state.channels}
        selectedChannels={state.selectedChannels}
        setSelectedChannels={state.setSelectedChannels}
        channelsLoading={state.channelsLoading}
        fetchChannels={state.fetchChannels}
        dateRange={state.dateRange}
        setDateRange={state.setDateRange}
        onScan={state.startScan}
        scanStatus={state.scanProgress.status}
      />

      <ScanProgress
        status={state.scanProgress.status}
        currentChannel={state.scanProgress.current_channel}
        channelsDone={state.scanProgress.channels_done}
        channelsTotal={state.scanProgress.channels_total}
        reactionsFound={state.scanProgress.reactions_found}
        onCancel={state.cancelScan}
      />

      {!hasData && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <BarChart3 className="h-12 w-12 opacity-30" />
          <p className="text-sm">
            {!hasRealData
              ? "Connect to Slack in Settings to get started."
              : "Select channels above and run a scan to see reaction data."}
          </p>
        </div>
      )}

      {hasData && (
        <>
          <ReactionStatsCards stats={state.stats} customEmojiUrls={customEmojiUrls} />
          <TopReactionsChart
            topReactions={state.topReactions}
            emojiFilter={state.emojiFilter}
            setEmojiFilter={state.setEmojiFilter}
            customEmojiUrls={customEmojiUrls}
            emojiData={emojiData}
          />
          <TopCreators
            topReactions={state.topReactions}
            emojiData={emojiData}
            customEmojiUrls={customEmojiUrls}
          />
          <ReactionTimeline data={state.timelineData} />
          <YourReactions
            userStats={state.userStats}
            currentUserId={currentUserId}
            customEmojiUrls={customEmojiUrls}
          />
          <ChannelBreakdown
            breakdown={state.channelBreakdown}
            channels={state.channels}
            customEmojiUrls={customEmojiUrls}
          />
          <ShareCardGenerator
            stats={state.stats}
            topReactions={state.topReactions}
            customEmojiUrls={customEmojiUrls}
            channelNames={channelNames}
            dateRange={state.dateRange}
          />
        </>
      )}
    </div>
  )
}
