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
  const wrappedYear = new Date().getFullYear() - 1
  const year = options?.year ?? wrappedYear

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
  // Uses unified logic: try user_id match first (mobile), then can_delete (desktop fallback)
  const personalStats = useMemo(() => {
    if (!hasMinimumData || !emojiData || emojiData.length === 0) {
      return null
    }

    let userEmojis: Emoji[] = []

    // Method 1: Filter by explicit userId (mobile auth flow)
    if (options?.userId) {
      userEmojis = emojiData.filter(
        (emoji) => emoji.user_id === options.userId && !emoji.is_alias
      )
    }

    // Method 2: Fallback to localStorage mobileUserId (for page refreshes)
    if (userEmojis.length === 0 && typeof window !== "undefined") {
      const storedMobileUserId = localStorage.getItem("mobileUserId")
      if (storedMobileUserId) {
        userEmojis = emojiData.filter(
          (emoji) => emoji.user_id === storedMobileUserId && !emoji.is_alias
        )
      }
    }

    // Method 3: Use can_delete flag (desktop browser context)
    if (userEmojis.length === 0) {
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
