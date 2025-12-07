/**
 * Utility to collect all emoji URLs that need to be preloaded for the Wrapped experience.
 * This ensures a smooth, uninterrupted viewing experience by loading all assets upfront.
 */

import { WrappedStats, PersonalWrappedStats } from "@/lib/services/wrapped-service"
import { Emoji } from "@/lib/services/emoji-service"
import { proxyImageUrl, hasValidUrl } from "@/lib/utils/image-proxy"

export interface CollectedAssets {
  /** All unique proxied URLs to preload */
  urls: string[]
  /** Count by priority group for progress tracking */
  breakdown: {
    intro: number
    count: number
    creators: number
    background: number
    finale: number
  }
}

/**
 * Collects all emoji URLs from Wrapped stats that need to be preloaded.
 * Returns unique, proxied URLs sorted by visual priority.
 */
export function collectWrappedAssets(
  stats: WrappedStats,
  allYearEmojis: Emoji[] = [],
  personalStats?: PersonalWrappedStats | null
): CollectedAssets {
  const urls = new Set<string>()
  const breakdown = {
    intro: 0,
    count: 0,
    creators: 0,
    background: 0,
    finale: 0,
  }

  // Helper to add a valid emoji URL
  const addEmojiUrl = (emoji: Emoji | undefined | null, category: keyof typeof breakdown): boolean => {
    if (!emoji || !hasValidUrl(emoji)) return false
    const proxiedUrl = proxyImageUrl(emoji.url)
    if (proxiedUrl && !proxiedUrl.includes("placeholder") && !urls.has(proxiedUrl)) {
      urls.add(proxiedUrl)
      breakdown[category]++
      return true
    }
    return false
  }

  // Priority 1: Creator top emojis (used in intro orbit, podium, leaderboard)
  // These are the most visually prominent emojis
  stats.topCreators.forEach((creator) => {
    creator.topEmojis.slice(0, 5).forEach((emoji) => {
      addEmojiUrl(emoji, "creators")
    })
  })

  // Priority 2: Personal top emojis if available
  if (personalStats?.topEmojis) {
    personalStats.topEmojis.slice(0, 5).forEach((emoji) => {
      addEmojiUrl(emoji, "intro")
    })
  }

  // Priority 3: Busiest day emojis (peak slide)
  stats.busiestDay.emojis.slice(0, 10).forEach((emoji) => {
    addEmojiUrl(emoji, "intro")
  })

  // Priority 4: Fun stats emojis
  addEmojiUrl(stats.funStats.firstEmojiOfYear, "intro")
  addEmojiUrl(stats.funStats.lastEmojiOfYear, "intro")
  addEmojiUrl(stats.funStats.longestName?.emoji, "intro")

  // Priority 5: Background/floating emojis (subset of allYearEmojis)
  // Limit to 20 for performance
  const bgEmojis = allYearEmojis.slice(0, 20)
  bgEmojis.forEach((emoji) => {
    addEmojiUrl(emoji, "background")
  })

  // Priority 6: Additional emojis for count marquee and finale
  // These are less critical but nice to have preloaded
  const additionalEmojis = allYearEmojis.slice(20, 60)
  additionalEmojis.forEach((emoji) => {
    if (urls.size < 100) { // Cap at 100 total URLs for performance
      addEmojiUrl(emoji, "count")
    }
  })

  // Priority 7: Finale emojis (remaining pool)
  const finaleEmojis = allYearEmojis.slice(60, 100)
  finaleEmojis.forEach((emoji) => {
    if (urls.size < 120) {
      addEmojiUrl(emoji, "finale")
    }
  })

  return {
    urls: Array.from(urls),
    breakdown,
  }
}

/**
 * Preloads an image URL and returns a promise that resolves when loaded.
 * Resolves on both success and error to ensure we don't block on failed images.
 */
export function preloadImage(url: string): Promise<{ url: string; success: boolean }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ url, success: true })
    img.onerror = () => resolve({ url, success: false })
    img.src = url
  })
}

/**
 * Preloads multiple images with concurrency control.
 * @param urls Array of URLs to preload
 * @param concurrency Number of concurrent requests (default: 6)
 * @param onProgress Callback for progress updates
 */
export async function preloadImages(
  urls: string[],
  concurrency = 6,
  onProgress?: (loaded: number, total: number, successCount: number) => void
): Promise<{ loaded: number; failed: number }> {
  let loaded = 0
  let successCount = 0

  const loadBatch = async (batch: string[]) => {
    const results = await Promise.all(batch.map(preloadImage))
    results.forEach((result) => {
      loaded++
      if (result.success) successCount++
      onProgress?.(loaded, urls.length, successCount)
    })
  }

  // Process in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    await loadBatch(batch)
  }

  return {
    loaded,
    failed: loaded - successCount,
  }
}
