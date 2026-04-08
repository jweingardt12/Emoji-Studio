import { idb } from '@/lib/storage/indexed-db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReactionEvent {
  emoji_name: string
  count: number
  user_ids: string[]
  channel_id: string
  timestamp: number // Unix epoch seconds
}

export interface AggregatedReaction {
  emoji_name: string
  total_count: number
  unique_users: number
  events: ReactionEvent[]
}

export interface TrendingReaction {
  emoji_name: string
  recent_count: number
  previous_count: number
  change_percent: number
}

export interface UserReactionStat {
  user_id: string
  reaction_count: number
  top_emojis: string[]
}

export interface ChannelReactorStat {
  user_id: string
  reaction_count: number
}

export interface ChannelReactionBreakdown {
  channel_id: string
  total_count: number
  top_reactions: AggregatedReaction[]
  top_reactors: ChannelReactorStat[]
}

export interface ReactionScanMeta {
  scanned_at: number // Unix epoch ms
  channel_ids: string[]
  event_count: number
}

export interface ReactionStats {
  total_reactions: number
  unique_emojis: number
  unique_users: number
  top_reactions: AggregatedReaction[]
  trending: TrendingReaction[]
}

// ---------------------------------------------------------------------------
// Pure aggregation functions
// ---------------------------------------------------------------------------

/**
 * Combine reaction events into per-emoji aggregates.
 */
export function aggregateReactions(events: ReactionEvent[]): AggregatedReaction[] {
  const map = new Map<string, { total_count: number; user_ids: Set<string>; events: ReactionEvent[] }>()

  for (const event of events) {
    let entry = map.get(event.emoji_name)
    if (!entry) {
      entry = { total_count: 0, user_ids: new Set(), events: [] }
      map.set(event.emoji_name, entry)
    }
    entry.total_count += event.count
    for (const uid of event.user_ids) {
      entry.user_ids.add(uid)
    }
    entry.events.push(event)
  }

  return Array.from(map.entries()).map(([emoji_name, entry]) => ({
    emoji_name,
    total_count: entry.total_count,
    unique_users: entry.user_ids.size,
    events: entry.events,
  }))
}

/**
 * Return the top N reactions sorted by total_count descending.
 */
export function getTopReactions(aggregated: AggregatedReaction[], limit: number): AggregatedReaction[] {
  return [...aggregated].sort((a, b) => b.total_count - a.total_count).slice(0, limit)
}

/**
 * Identify emojis whose usage increased in the recent window vs. the prior
 * window of the same length.
 *
 * @param events   All reaction events.
 * @param windowSeconds  Length of the "recent" period in seconds (e.g. 7 * 86400).
 */
export function getTrendingReactions(events: ReactionEvent[], windowSeconds: number): TrendingReaction[] {
  const now = Math.floor(Date.now() / 1000)
  const recentStart = now - windowSeconds
  const previousStart = recentStart - windowSeconds

  // Bucket counts per emoji
  const recent = new Map<string, number>()
  const previous = new Map<string, number>()

  for (const event of events) {
    if (event.timestamp >= recentStart) {
      recent.set(event.emoji_name, (recent.get(event.emoji_name) ?? 0) + event.count)
    } else if (event.timestamp >= previousStart) {
      previous.set(event.emoji_name, (previous.get(event.emoji_name) ?? 0) + event.count)
    }
  }

  const trending: TrendingReaction[] = []

  for (const [emoji_name, recent_count] of recent.entries()) {
    const previous_count = previous.get(emoji_name) ?? 0

    let change_percent: number
    if (previous_count === 0) {
      change_percent = recent_count > 0 ? 100 : 0
    } else {
      change_percent = Math.round(((recent_count - previous_count) / previous_count) * 100)
    }

    if (change_percent > 0) {
      trending.push({ emoji_name, recent_count, previous_count, change_percent })
    }
  }

  return trending.sort((a, b) => b.change_percent - a.change_percent)
}

/**
 * Aggregate how many distinct events each user appeared in.
 * reaction_count = number of events that include this user's ID.
 */
export function getUserReactionStats(events: ReactionEvent[]): UserReactionStat[] {
  // Track: per user → set of event indices (to count distinct events)
  const userEvents = new Map<string, { eventCount: number; emojis: Map<string, number> }>()

  for (const event of events) {
    for (const uid of event.user_ids) {
      let entry = userEvents.get(uid)
      if (!entry) {
        entry = { eventCount: 0, emojis: new Map() }
        userEvents.set(uid, entry)
      }
      entry.eventCount += 1
      entry.emojis.set(event.emoji_name, (entry.emojis.get(event.emoji_name) ?? 0) + event.count)
    }
  }

  return Array.from(userEvents.entries()).map(([user_id, entry]) => {
    const top_emojis = [...entry.emojis.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name)

    return {
      user_id,
      reaction_count: entry.eventCount,
      top_emojis,
    }
  })
}

/**
 * Group and aggregate reactions by channel, returning the top N reactions
 * per channel sorted by total count.
 */
export function getChannelBreakdown(events: ReactionEvent[], topN: number): ChannelReactionBreakdown[] {
  const channelEvents = new Map<string, ReactionEvent[]>()

  for (const event of events) {
    let list = channelEvents.get(event.channel_id)
    if (!list) {
      list = []
      channelEvents.set(event.channel_id, list)
    }
    list.push(event)
  }

  return Array.from(channelEvents.entries()).map(([channel_id, evts]) => {
    const aggregated = aggregateReactions(evts)
    const sorted = getTopReactions(aggregated, topN)
    const total_count = aggregated.reduce((sum, r) => sum + r.total_count, 0)

    // Compute top reactors for this channel
    const userCounts = new Map<string, number>()
    for (const evt of evts) {
      for (const uid of evt.user_ids) {
        userCounts.set(uid, (userCounts.get(uid) ?? 0) + 1)
      }
    }
    const top_reactors = Array.from(userCounts.entries())
      .map(([user_id, reaction_count]) => ({ user_id, reaction_count }))
      .sort((a, b) => b.reaction_count - a.reaction_count)
      .slice(0, 5)

    return { channel_id, total_count, top_reactions: sorted, top_reactors }
  })
}

/**
 * Compute a high-level stats summary from an array of reaction events.
 */
export function calculateReactionStats(events: ReactionEvent[]): ReactionStats {
  const aggregated = aggregateReactions(events)

  const allUsers = new Set<string>()
  for (const event of events) {
    for (const uid of event.user_ids) allUsers.add(uid)
  }

  return {
    total_reactions: events.reduce((sum, e) => sum + e.count, 0),
    unique_emojis: aggregated.length,
    unique_users: allUsers.size,
    top_reactions: getTopReactions(aggregated, 10),
    trending: getTrendingReactions(events, 7 * 86400),
  }
}

// ---------------------------------------------------------------------------
// Storage helpers (IndexedDB via existing singleton)
// ---------------------------------------------------------------------------

const CACHE_KEY = 'reaction_events'
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export const reactionStorage = {
  async saveReactions(events: ReactionEvent[], meta?: ReactionScanMeta): Promise<void> {
    await idb.setItem('cache', CACHE_KEY, { events, meta: meta ?? null })
  },

  async loadReactions(): Promise<{ events: ReactionEvent[]; meta: ReactionScanMeta | null } | null> {
    // idb.getItem for the 'cache' store returns the value portion only;
    // the timestamp is stored separately in the IndexedDB record.
    // We re-read the raw record by relying on the fact that the cache store
    // attaches a `timestamp` field — but getItem strips it.  To check TTL
    // we store our own scanned_at in the meta object instead.
    const data = await idb.getItem('cache', CACHE_KEY)
    if (!data) return null

    // Check freshness via meta.scanned_at when available
    const scannedAt: number = data.meta?.scanned_at ?? 0
    if (scannedAt && Date.now() - scannedAt > TTL_MS) {
      await idb.removeItem('cache', CACHE_KEY)
      return null
    }

    return data as { events: ReactionEvent[]; meta: ReactionScanMeta | null }
  },

  async clearReactions(): Promise<void> {
    await idb.removeItem('cache', CACHE_KEY)
  },
}
