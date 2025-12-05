import { useMemo } from "react"
import { Emoji } from "@/lib/services/emoji-service"
import {
  WrappedStats,
  PersonalWrappedStats,
  calculateWrappedStats,
  calculatePersonalStats,
  hasMinimumDataForWrapped,
  getAvailableWrappedYears,
  filterEmojisByYear,
} from "@/lib/services/wrapped-service"

export interface UseWrappedStatsOptions {
  year?: number
}

export interface UseWrappedStatsResult {
  stats: WrappedStats | null
  personalStats: PersonalWrappedStats | null
  loading: boolean
  hasMinimumData: boolean
  availableYears: number[]
  year: number
  emojiCount: number
  yearEmojis: Emoji[] // All emojis from the selected year
  error: string | null
}

/**
 * Hook to calculate and memoize Wrapped statistics
 */
export function useWrappedStats(emojiData: Emoji[], options?: UseWrappedStatsOptions): UseWrappedStatsResult {
  const currentYear = new Date().getFullYear()
  const year = options?.year ?? currentYear

  const availableYears = useMemo(() => {
    if (!emojiData || emojiData.length === 0) return []
    return getAvailableWrappedYears(emojiData)
  }, [emojiData])

  const hasMinimumData = useMemo(() => {
    if (!emojiData || emojiData.length === 0) return false
    return hasMinimumDataForWrapped(emojiData, year)
  }, [emojiData, year])

  const yearEmojis = useMemo(() => {
    if (!emojiData || emojiData.length === 0) return []
    return filterEmojisByYear(emojiData, year)
  }, [emojiData, year])

  const emojiCount = yearEmojis.length

  const stats = useMemo(() => {
    if (!hasMinimumData || !emojiData || emojiData.length === 0) {
      return null
    }
    return calculateWrappedStats(emojiData, year)
  }, [emojiData, year, hasMinimumData])

  // Calculate personal stats for current user (emojis with can_delete === true)
  const personalStats = useMemo(() => {
    if (!hasMinimumData || !emojiData || emojiData.length === 0) {
      return null
    }
    // Filter to user's own emojis (can_delete indicates ownership)
    const userEmojis = emojiData.filter((emoji) => emoji.can_delete === true && !emoji.is_alias)
    if (userEmojis.length === 0) {
      return null
    }
    return calculatePersonalStats(emojiData, userEmojis, year)
  }, [emojiData, year, hasMinimumData])

  return {
    stats,
    personalStats,
    loading: false,
    hasMinimumData,
    availableYears,
    year,
    emojiCount,
    yearEmojis,
    error: hasMinimumData ? null : `Not enough emojis for ${year} Wrapped (need at least 10)`,
  }
}
