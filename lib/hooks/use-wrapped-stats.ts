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
  userId?: string  // Optional: override user identification for mobile auth
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

  // Calculate personal stats for current user
  // If userId is provided (mobile auth), filter by user_id instead of can_delete
  const personalStats = useMemo(() => {
    if (!hasMinimumData || !emojiData || emojiData.length === 0) {
      return null
    }

    let userEmojis: Emoji[]

    if (options?.userId) {
      // Mobile auth: filter by user_id field
      userEmojis = emojiData.filter(
        (emoji) => emoji.user_id === options.userId && !emoji.is_alias
      )
      console.log(`[useWrappedStats] Filtering by userId ${options.userId}: found ${userEmojis.length} emojis`)
    } else {
      // Default: use can_delete flag (indicates ownership in browser context)
      userEmojis = emojiData.filter((emoji) => emoji.can_delete === true && !emoji.is_alias)
    }

    if (userEmojis.length === 0) {
      return null
    }
    return calculatePersonalStats(emojiData, userEmojis, year)
  }, [emojiData, year, hasMinimumData, options?.userId])

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
