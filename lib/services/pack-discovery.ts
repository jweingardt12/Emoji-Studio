/**
 * Pack Discovery Service
 * Fetches and caches external emoji packs from Slackmojis.com
 * Uses HTML scraping like the iOS app (no API available)
 */

import type { PackEmoji } from "@/lib/types/emoji-pack"

interface CacheEntry {
  data: PackEmoji[]
  expires: number
}

const CACHE_TTL = 15 * 60 * 1000 // 15 minutes (iOS uses 5 min memory + 24hr disk)

class PackDiscoveryService {
  private cache = new Map<string, CacheEntry>()

  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() < entry.expires
  }

  private async fetchFromAPI(category: string, query?: string): Promise<PackEmoji[]> {
    const params = new URLSearchParams()
    if (query) {
      params.set("query", query)
    } else {
      params.set("category", category)
    }

    const response = await fetch(`/api/scrape-slackmojis?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch emojis: ${response.status}`)
    }

    return response.json()
  }

  private async getCachedOrFetch(
    key: string,
    fetcher: () => Promise<PackEmoji[]>
  ): Promise<PackEmoji[]> {
    const cached = this.cache.get(key)
    if (cached && this.isCacheValid(cached)) {
      return cached.data
    }

    const data = await fetcher()
    this.cache.set(key, {
      data,
      expires: Date.now() + CACHE_TTL,
    })

    return data
  }

  async fetchSlackmojisPopular(): Promise<PackEmoji[]> {
    return this.getCachedOrFetch("slackmojis-popular", async () => {
      return this.fetchFromAPI("popular")
    })
  }

  async fetchSlackmojisRecent(): Promise<PackEmoji[]> {
    return this.getCachedOrFetch("slackmojis-recent", async () => {
      return this.fetchFromAPI("recent")
    })
  }

  async fetchSlackmojisMemes(): Promise<PackEmoji[]> {
    return this.getCachedOrFetch("slackmojis-memes", async () => {
      return this.fetchFromAPI("memes")
    })
  }

  async fetchSlackmojisBlobCats(): Promise<PackEmoji[]> {
    return this.getCachedOrFetch("slackmojis-blobcats", async () => {
      return this.fetchFromAPI("blobcats")
    })
  }

  async fetchSlackmojisPartyParrots(): Promise<PackEmoji[]> {
    return this.getCachedOrFetch("slackmojis-partyparrots", async () => {
      return this.fetchFromAPI("partyparrots")
    })
  }

  async searchSlackmojis(query: string): Promise<PackEmoji[]> {
    if (!query.trim()) return []

    const cacheKey = `slackmojis-search-${query}`
    return this.getCachedOrFetch(cacheKey, async () => {
      return this.fetchFromAPI("", query)
    })
  }

  async fetchBufo(): Promise<PackEmoji[]> {
    return this.getCachedOrFetch("bufo", async () => {
      return this.fetchFromAPI("bufo")
    })
  }

  /**
   * Search across ALL packs (Slackmojis + Bufo)
   * Performs client-side filtering on cached/fetched packs
   */
  async searchAllPacks(query: string): Promise<PackEmoji[]> {
    if (!query.trim()) return []

    const normalizedQuery = query.toLowerCase().trim()
    const cacheKey = `all-packs-search-${normalizedQuery}`

    return this.getCachedOrFetch(cacheKey, async () => {
      // Fetch all packs in parallel
      const [popular, recent, memes, blobcats, partyparrots, bufo] = await Promise.all([
        this.fetchSlackmojisPopular(),
        this.fetchSlackmojisRecent(),
        this.fetchSlackmojisMemes(),
        this.fetchSlackmojisBlobCats(),
        this.fetchSlackmojisPartyParrots(),
        this.fetchBufo(),
      ])

      // Combine all emojis
      const allEmojis = [
        ...popular,
        ...recent,
        ...memes,
        ...blobcats,
        ...partyparrots,
        ...bufo,
      ]

      // Deduplicate by id|name
      const seen = new Set<string>()
      const unique: PackEmoji[] = []
      for (const emoji of allEmojis) {
        const key = `${emoji.id}|${emoji.name}`
        if (!seen.has(key)) {
          seen.add(key)
          unique.push(emoji)
        }
      }

      // Filter by query
      return unique.filter(emoji =>
        emoji.name.toLowerCase().includes(normalizedQuery)
      )
    })
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export const packDiscovery = new PackDiscoveryService()