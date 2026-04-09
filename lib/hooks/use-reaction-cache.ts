"use client"

import { useState, useEffect, useMemo } from "react"
import {
  type ReactionEvent,
  type ReactionScanMeta,
  type ReactionStats,
  aggregateReactions,
  calculateReactionStats,
  reactionStorage,
} from "@/lib/services/reaction-service"

export interface EmojiUsageSummary {
  total_count: number
  unique_users: number
  rank: number
  percentile: number
}

interface ReactionCacheState {
  events: ReactionEvent[]
  meta: ReactionScanMeta | null
  loading: boolean
}

// Module-level singleton to deduplicate concurrent IndexedDB reads
let cachedPromise: Promise<{ events: ReactionEvent[]; meta: ReactionScanMeta | null } | null> | null = null

function loadOnce() {
  if (!cachedPromise) {
    cachedPromise = reactionStorage.loadReactions().catch(() => null)
  }
  return cachedPromise
}

export function invalidateReactionCache() {
  cachedPromise = null
}

export function useReactionCache() {
  const [state, setState] = useState<ReactionCacheState>({
    events: [],
    meta: null,
    loading: true,
  })

  useEffect(() => {
    let cancelled = false
    loadOnce().then((data) => {
      if (cancelled) return
      setState({
        events: data?.events ?? [],
        meta: data?.meta ?? null,
        loading: false,
      })
    })
    return () => { cancelled = true }
  }, [])

  const reactionLookup = useMemo(() => {
    const map = new Map<string, EmojiUsageSummary>()
    if (state.events.length === 0) return map

    const aggregated = aggregateReactions(state.events)
    const sorted = [...aggregated].sort((a, b) => b.total_count - a.total_count)
    const total = sorted.length

    for (let i = 0; i < sorted.length; i++) {
      const { emoji_name, total_count, unique_users } = sorted[i]
      map.set(emoji_name, {
        total_count,
        unique_users,
        rank: i + 1,
        percentile: Math.round((1 - i / total) * 100),
      })
    }

    return map
  }, [state.events])

  const reactionStats = useMemo<ReactionStats | null>(() => {
    if (state.events.length === 0) return null
    return calculateReactionStats(state.events)
  }, [state.events])

  const hasData = state.events.length > 0

  return {
    reactionLookup,
    reactionStats,
    scanMeta: state.meta,
    loading: state.loading,
    hasData,
  }
}
