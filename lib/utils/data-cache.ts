/**
 * Simple in-memory cache with TTL support
 */
export class DataCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>()
  private pendingRequests = new Map<string, Promise<T>>()

  constructor(private ttl: number = 5 * 60 * 1000) {} // 5 minutes default

  /**
   * Get data from cache or fetch if not available/expired
   */
  async get(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Check if we have a pending request for this key
    const pending = this.pendingRequests.get(key)
    if (pending) {
      return pending
    }

    // Check cache
    const cached = this.cache.get(key)
    const now = Date.now()

    if (cached && now - cached.timestamp < this.ttl) {
      return cached.data
    }

    // Create new request and deduplicate
    const request = fetcher()
      .then(data => {
        this.cache.set(key, { data, timestamp: now })
        this.pendingRequests.delete(key)
        return data
      })
      .catch(error => {
        this.pendingRequests.delete(key)
        throw error
      })

    this.pendingRequests.set(key, request)
    return request
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string) {
    this.cache.delete(key)
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear()
    this.pendingRequests.clear()
  }

  /**
   * Preload data into cache
   */
  set(key: string, data: T) {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const cached = this.cache.get(key)
    if (!cached) return false
    
    const now = Date.now()
    return now - cached.timestamp < this.ttl
  }
}

/**
 * Request debouncer to prevent rapid repeated requests
 */
export class RequestDebouncer {
  private timers = new Map<string, NodeJS.Timeout>()

  debounce<T>(
    key: string,
    fn: () => Promise<T>,
    delay: number = 300
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const existing = this.timers.get(key)
      if (existing) {
        clearTimeout(existing)
      }

      const timer = setTimeout(async () => {
        this.timers.delete(key)
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, delay)

      this.timers.set(key, timer)
    })
  }

  clear(key?: string) {
    if (key) {
      const timer = this.timers.get(key)
      if (timer) {
        clearTimeout(timer)
        this.timers.delete(key)
      }
    } else {
      this.timers.forEach(timer => clearTimeout(timer))
      this.timers.clear()
    }
  }
}

/**
 * Stale-while-revalidate cache implementation
 */
export class SWRCache<T> {
  private cache = new Map<string, {
    data: T
    timestamp: number
    staleTimestamp: number
  }>()
  private revalidating = new Set<string>()

  constructor(
    private staleTime: number = 60 * 1000, // 1 minute
    private maxAge: number = 24 * 60 * 60 * 1000 // 24 hours
  ) {}

  async get(
    key: string,
    fetcher: () => Promise<T>,
    onUpdate?: (data: T) => void
  ): Promise<T> {
    const cached = this.cache.get(key)
    const now = Date.now()

    // Return stale data immediately if available
    if (cached && now - cached.timestamp < this.maxAge) {
      // Check if data is stale and needs revalidation
      if (now - cached.timestamp > this.staleTime && !this.revalidating.has(key)) {
        this.revalidating.add(key)
        
        // Revalidate in background
        fetcher()
          .then(data => {
            this.cache.set(key, {
              data,
              timestamp: now,
              staleTimestamp: now + this.staleTime
            })
            this.revalidating.delete(key)
            
            // Notify about the update if callback provided
            if (onUpdate) {
              onUpdate(data)
            }
          })
          .catch(error => {
            console.error(`Failed to revalidate ${key}:`, error)
            this.revalidating.delete(key)
          })
      }
      
      return cached.data
    }

    // No cache or expired, fetch new data
    const data = await fetcher()
    this.cache.set(key, {
      data,
      timestamp: now,
      staleTimestamp: now + this.staleTime
    })
    
    return data
  }

  invalidate(key: string) {
    this.cache.delete(key)
    this.revalidating.delete(key)
  }

  clear() {
    this.cache.clear()
    this.revalidating.clear()
  }
}