// app/reactions/hooks/use-reactions-state.ts
"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { toast } from "sonner"
import {
  type ReactionEvent,
  type ReactionScanMeta,
  aggregateReactions,
  getTopReactions,
  getTrendingReactions,
  getUserReactionStats,
  getChannelBreakdown,
  calculateReactionStats,
  reactionStorage,
} from "@/lib/services/reaction-service"

export interface SlackChannel {
  id: string
  name: string
  is_private: boolean
  num_members: number
}

export type DateRange = "7d" | "30d"
export type EmojiFilter = "all" | "custom"

interface ScanProgress {
  status: "idle" | "scanning" | "complete" | "error"
  current_channel: string
  channels_done: number
  channels_total: number
  reactions_found: number
}

export function useReactionsState(curlCommand: string | null, customEmojiNames: Set<string> = new Set()) {
  // Channel state
  const [channels, setChannels] = useState<SlackChannel[]>([])
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)

  // Scan state
  const [dateRange, setDateRange] = useState<DateRange>("7d")
  const [emojiFilter, setEmojiFilter] = useState<EmojiFilter>("all")
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    status: "idle",
    current_channel: "",
    channels_done: 0,
    channels_total: 0,
    reactions_found: 0,
  })
  const [reactionEvents, setReactionEvents] = useState<ReactionEvent[]>([])
  const abortRef = useRef<AbortController | null>(null)

  // Build curlRequest from stored curl command
  const buildCurlRequest = useCallback(
    (url: string, formData?: Record<string, string>) => {
      if (!curlCommand) return null
      const headerRegex = /-H\s+'([^:]+):\s*([^']+)'/g
      const headers: Record<string, string> = {}
      let match
      while ((match = headerRegex.exec(curlCommand)) !== null) {
        headers[match[1]] = match[2]
      }
      const headerRegex2 = /-H\s+"([^:]+):\s*([^"]+)"/g
      while ((match = headerRegex2.exec(curlCommand)) !== null) {
        headers[match[1]] = match[2]
      }
      return { url, headers, formData }
    },
    [curlCommand]
  )

  // Fetch channel list
  const fetchChannels = useCallback(async () => {
    if (!curlCommand) return
    setChannelsLoading(true)
    try {
      const workspaceMatch = curlCommand.match(/https:\/\/([^.]+)\.slack\.com/)
      const workspace = workspaceMatch ? workspaceMatch[1] : ""
      if (!workspace) {
        toast.error("Could not determine workspace from settings")
        return
      }

      const url = `https://${workspace}.slack.com/api/conversations.list`
      const tokenMatch = curlCommand.match(/token=([^&\s'"]+)/)
      const token = tokenMatch ? tokenMatch[1] : ""

      if (!token) {
        toast.error("Could not extract auth token from Slack settings")
        setChannelsLoading(false)
        return
      }

      const curlRequest = buildCurlRequest(url, {
        token,
        types: "public_channel,private_channel",
        exclude_archived: "true",
        limit: "200",
      })
      if (!curlRequest) return

      const response = await fetch("/api/slack-reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curlRequest }),
      })

      const data = await response.json()
      if (data.ok && data.channels) {
        setChannels(data.channels.sort((a: SlackChannel, b: SlackChannel) => b.num_members - a.num_members))
      } else {
        toast.error(data.error || "Failed to fetch channels")
      }
    } catch (error) {
      console.error("Failed to fetch channels:", error)
      toast.error("Failed to fetch channels")
    } finally {
      setChannelsLoading(false)
    }
  }, [curlCommand, buildCurlRequest])

  // Load cached data on mount
  useEffect(() => {
    async function loadCache() {
      const cached = await reactionStorage.loadReactions()
      if (cached) {
        setReactionEvents(cached.events)
        const channelIds = cached.meta?.channel_ids ?? []
        setSelectedChannels(channelIds)
        setScanProgress({ status: "complete", current_channel: "", channels_done: channelIds.length, channels_total: channelIds.length, reactions_found: cached.events.length })
      }
    }
    loadCache()
  }, [])

  // Scan a single channel for reactions
  const scanChannel = useCallback(
    async (channelId: string, channelName: string, signal: AbortSignal): Promise<ReactionEvent[]> => {
      const events: ReactionEvent[] = []
      const workspaceMatch = curlCommand?.match(/https:\/\/([^.]+)\.slack\.com/)
      const workspace = workspaceMatch ? workspaceMatch![1] : ""
      const tokenMatch = curlCommand?.match(/token=([^&\s'"]+)/)
      const token = tokenMatch ? tokenMatch[1] : ""

      if (!token) return events  // silently return empty — error shown by fetchChannels

      const daysBack = dateRange === "7d" ? 7 : 30
      const oldest = Math.floor(Date.now() / 1000) - daysBack * 86400
      let cursor: string | undefined

      do {
        if (signal.aborted) break

        const url = `https://${workspace}.slack.com/api/conversations.history`
        const formData: Record<string, string> = {
          token,
          channel: channelId,
          oldest: String(oldest),
          limit: "200",
        }
        if (cursor) formData.cursor = cursor

        const curlRequest = buildCurlRequest(url, formData)
        if (!curlRequest) break

        // Rate limit: 1.2s between requests (abort-aware)
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 1200)
          signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')) }, { once: true })
        })

        const response = await fetch("/api/slack-reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ curlRequest }),
          signal,
        })

        const data = await response.json()
        if (!data.ok) {
          console.error(`Scan error for #${channelName}:`, data.error)
          break
        }

        for (const reaction of data.reactions || []) {
          events.push({
            emoji_name: reaction.emoji_name,
            count: reaction.count,
            user_ids: reaction.users,
            channel_id: channelId,
            timestamp: reaction.timestamp,
          })
        }

        cursor = data.has_more ? data.response_metadata?.next_cursor : undefined
      } while (cursor)

      return events
    },
    [curlCommand, dateRange, buildCurlRequest]
  )

  // Start scan across selected channels
  const startScan = useCallback(async () => {
    if (selectedChannels.length === 0) {
      toast.error("Select at least one channel to scan")
      return
    }
    if (!curlCommand) {
      toast.error("Connect to Slack in Settings first")
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const allEvents: ReactionEvent[] = []
    setScanProgress({
      status: "scanning",
      current_channel: "",
      channels_done: 0,
      channels_total: selectedChannels.length,
      reactions_found: 0,
    })
    setReactionEvents([])

    const channelNames = new Map(channels.map(c => [c.id, c.name]))

    for (let i = 0; i < selectedChannels.length; i++) {
      if (controller.signal.aborted) break

      const channelId = selectedChannels[i]
      const channelName = channelNames.get(channelId) || channelId

      setScanProgress(prev => ({
        ...prev,
        current_channel: channelName,
        channels_done: i,
      }))

      try {
        const channelEvents = await scanChannel(channelId, channelName, controller.signal)
        allEvents.push(...channelEvents)

        setReactionEvents([...allEvents])
        setScanProgress(prev => ({
          ...prev,
          channels_done: i + 1,
          reactions_found: allEvents.length,
        }))
      } catch (error) {
        if ((error as Error).name === "AbortError") break
        console.error(`Error scanning #${channelName}:`, error)
      }
    }

    if (!controller.signal.aborted) {
      setScanProgress(prev => ({ ...prev, status: "complete" }))

      const meta: ReactionScanMeta = {
        channel_ids: selectedChannels,
        scanned_at: Date.now(),
        event_count: allEvents.length,
      }
      await reactionStorage.saveReactions(allEvents, meta)
      toast.success(`Scan complete! Found ${allEvents.length} reactions.`)
    }
  }, [selectedChannels, curlCommand, channels, dateRange, scanChannel])

  // Cancel scan
  const cancelScan = useCallback(() => {
    abortRef.current?.abort()
    setScanProgress(prev => ({ ...prev, status: "idle" }))
  }, [])

  // Computed data
  const filteredEvents = useMemo(() => {
    if (emojiFilter !== "custom") return reactionEvents
    return reactionEvents.filter(e => customEmojiNames.has(e.emoji_name))
  }, [reactionEvents, emojiFilter, customEmojiNames])

  const stats = useMemo(() => calculateReactionStats(filteredEvents), [filteredEvents])
  const aggregated = useMemo(() => aggregateReactions(filteredEvents), [filteredEvents])
  const topReactions = useMemo(() => getTopReactions(aggregated, 20), [aggregated])
  const trending = useMemo(() => getTrendingReactions(filteredEvents, 7 * 86400), [filteredEvents])
  const userStats = useMemo(() => getUserReactionStats(filteredEvents), [filteredEvents])
  const channelBreakdown = useMemo(() => getChannelBreakdown(filteredEvents, 10), [filteredEvents])

  // Timeline data for chart (daily buckets)
  const timelineData = useMemo(() => {
    if (filteredEvents.length === 0) return []
    const days = dateRange === "7d" ? 7 : 30
    const now = Math.floor(Date.now() / 1000)
    const buckets: { date: string; count: number }[] = []

    for (let d = days - 1; d >= 0; d--) {
      const dayStart = now - (d + 1) * 86400
      const dayEnd = now - d * 86400
      const dayEvents = filteredEvents.filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd)
      const count = dayEvents.reduce((sum, e) => sum + e.count, 0)
      const date = new Date(dayStart * 1000)
      buckets.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count,
      })
    }
    return buckets
  }, [filteredEvents, dateRange])

  return {
    channels,
    selectedChannels,
    setSelectedChannels,
    channelsLoading,
    fetchChannels,
    dateRange,
    setDateRange,
    emojiFilter,
    setEmojiFilter,
    scanProgress,
    startScan,
    cancelScan,
    reactionEvents: filteredEvents,
    stats,
    topReactions,
    trending,
    userStats,
    channelBreakdown,
    timelineData,
    aggregated,
  }
}
