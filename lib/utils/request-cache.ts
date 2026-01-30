/**
 * Request deduplication utility
 * Prevents duplicate API calls by caching in-flight requests
 */

const inFlightRequests = new Map<string, Promise<unknown>>()

/**
 * Wraps a fetch operation to deduplicate concurrent identical requests.
 * If a request with the same key is already in flight, returns the existing promise.
 *
 * @param key - Unique identifier for the request (e.g., URL or cache key)
 * @param fetcher - Function that returns the promise to fetch data
 * @returns Promise that resolves with the fetched data
 */
export async function deduplicatedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // Check if this exact request is already in flight
  const existing = inFlightRequests.get(key)
  if (existing) {
    return existing as Promise<T>
  }

  // Create the promise and store it
  const promise = fetcher().finally(() => {
    // Clean up after request completes (success or failure)
    inFlightRequests.delete(key)
  })

  inFlightRequests.set(key, promise)
  return promise
}

/**
 * Simple in-memory cache with TTL (time-to-live)
 */
interface CacheEntry<T> {
  data: T
  expiry: number
}

const memoryCache = new Map<string, CacheEntry<unknown>>()

// Periodic cleanup to prevent unbounded memory growth
const CLEANUP_INTERVAL_MS = 60 * 1000 // 1 minute
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCacheCleanup(): void {
  if (cleanupTimer || typeof window === 'undefined') return

  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of memoryCache.entries()) {
      if (now > entry.expiry) {
        memoryCache.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)
}

/**
 * Get cached data if available and not expired
 */
export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key)
  if (!entry) return null

  if (Date.now() > entry.expiry) {
    memoryCache.delete(key)
    return null
  }

  return entry.data as T
}

/**
 * Set cached data with TTL
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttlMs - Time to live in milliseconds (default: 5 minutes)
 */
export function setCached<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
  startCacheCleanup()
  memoryCache.set(key, {
    data,
    expiry: Date.now() + ttlMs,
  })
}

/**
 * Clear a specific cache entry
 */
export function clearCached(key: string): void {
  memoryCache.delete(key)
}

/**
 * Clear all cached data and stop cleanup timer
 */
export function clearAllCache(): void {
  memoryCache.clear()
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
}

/**
 * Fetch with caching - combines deduplication and caching
 * @param key - Cache key
 * @param fetcher - Function to fetch data
 * @param options - Cache options
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttlMs?: number; forceRefresh?: boolean } = {}
): Promise<T> {
  const { ttlMs = 5 * 60 * 1000, forceRefresh = false } = options

  // Check cache first (unless forcing refresh)
  if (!forceRefresh) {
    const cached = getCached<T>(key)
    if (cached !== null) {
      return cached
    }
  }

  // Use deduplicated fetch
  const data = await deduplicatedFetch(key, fetcher)

  // Cache the result
  setCached(key, data, ttlMs)

  return data
}

/**
 * Number of in-flight requests (useful for debugging)
 */
export function getInFlightCount(): number {
  return inFlightRequests.size
}

/**
 * Number of cached entries (useful for debugging)
 */
export function getCacheSize(): number {
  return memoryCache.size
}
