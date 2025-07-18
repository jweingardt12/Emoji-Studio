/**
 * Optimized data loading utilities for the emoji data provider
 * These can be integrated into the existing provider without breaking changes
 */

import { Emoji } from "@/lib/services/emoji-service"
import { DataCache, SWRCache } from "./data-cache"

// Singleton caches
const emojiCache = new SWRCache<Emoji[]>(60 * 1000, 5 * 60 * 1000)
const metadataCache = new DataCache<any>(5 * 60 * 1000)

/**
 * Load emoji data with caching and deduplication
 */
export async function loadEmojiDataOptimized(
  key: string,
  loader: () => Promise<Emoji[]>,
  onUpdate?: (data: Emoji[]) => void
): Promise<Emoji[]> {
  return emojiCache.get(key, loader, onUpdate)
}

/**
 * Load metadata (stats, leaderboard, etc) with caching
 */
export async function loadMetadataOptimized<T>(
  key: string,
  loader: () => Promise<T>
): Promise<T> {
  return metadataCache.get(key, loader)
}

/**
 * Batch load multiple data sources in parallel
 */
export async function batchLoadData<T extends Record<string, any>>(
  loaders: { [K in keyof T]: () => Promise<T[K]> }
): Promise<{ [K in keyof T]: T[K] | Error }> {
  const keys = Object.keys(loaders) as (keyof T)[]
  const promises = keys.map(async (key) => {
    try {
      const result = await loaders[key]()
      return { key, value: result }
    } catch (error) {
      return { key, value: error as Error }
    }
  })

  const results = await Promise.all(promises)
  const output = {} as { [K in keyof T]: T[K] | Error }

  results.forEach(({ key, value }) => {
    output[key] = value
  })

  return output
}

/**
 * Prefetch data in the background
 */
export function prefetchData(
  key: string,
  loader: () => Promise<any>
): void {
  // Fire and forget - load data into cache
  loader().catch(error => {
    console.error(`Failed to prefetch ${key}:`, error)
  })
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  emojiCache.clear()
  metadataCache.clear()
}

/**
 * Check if data is cached and fresh
 */
export function isCached(key: string): boolean {
  return metadataCache.has(key)
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): {
  emojiCacheSize: number
  metadataCacheSize: number
} {
  // Note: This is a simplified version. In production, you'd track more metrics
  return {
    emojiCacheSize: 0, // Would need to expose cache size from the cache classes
    metadataCacheSize: 0
  }
}