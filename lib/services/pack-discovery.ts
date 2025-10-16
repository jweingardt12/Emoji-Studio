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
   * Performs client-side filtering on cached/fetched packs with refined matching logic
   */
  async searchAllPacks(query: string): Promise<PackEmoji[]> {
    if (!query.trim()) return []

    const normalizedQuery = query.toLowerCase().trim()
    const terms = normalizedQuery.split(/\s+/).filter(Boolean)
    if (terms.length === 0) return []

    const cacheKey = `all-packs-search-${[...terms].sort().join('-')}`

    const escapeRegex = (value: string) =>
      value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')

    /**
     * Refined matching score calculation
     * Returns null if term doesn't match, or a score (lower is better) if it does
     * Scoring prioritizes:
     * 1. Exact full match (score: 0)
     * 2. Starts with term (score: 10)
     * 3. Word boundary match (score: 100 + position)
     * 4. Contains term (score: 1000 + position)
     * 5. Fuzzy character sequence match (score: 10000 + span length)
     */
    const refinedMatchScore = (term: string, target: string): number | null => {
      if (!term) return 0

      // Exact match - highest priority
      if (target === term) {
        return 0
      }

      // Starts with term
      if (target.startsWith(term)) {
        return 10
      }

      // Word boundary match (term appears at start of word)
      const wordBoundaryRegex = new RegExp(`(^|[\\s_-])${escapeRegex(term)}`, 'i')
      const wordMatch = target.match(wordBoundaryRegex)
      if (wordMatch && wordMatch.index !== undefined) {
        return 100 + wordMatch.index
      }

      // Contains term as substring
      const directIndex = target.indexOf(term)
      if (directIndex >= 0) {
        return 1000 + directIndex
      }

      // Fuzzy character sequence match (all characters of term appear in order)
      const pattern = escapeRegex(term)
        .split('')
        .join('.*?')
      const regex = new RegExp(pattern, 'i')
      const match = target.match(regex)
      if (!match || match.index === undefined) {
        return null // No match at all
      }
      const spanLength = match[0].length
      // Penalize longer spans (characters more spread out)
      return 10000 + match.index + (spanLength - term.length) * 10
    }

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

      // Filter with refined multi-term matching and rank results
      const scored = unique
        .map((emoji) => {
          // Normalize name: convert underscores and hyphens to spaces for better word matching
          const normalizedName = emoji.name.toLowerCase().replace(/[_-]/g, ' ')
          let totalScore = 0
          let matchedTerms = 0

          // All terms must match for emoji to be included
          for (const term of terms) {
            const score = refinedMatchScore(term, normalizedName)
            if (score === null) {
              return null // Skip if any term doesn't match
            }
            totalScore += score
            matchedTerms++
          }

          // Only include if all terms matched
          if (matchedTerms !== terms.length) {
            return null
          }

          return { emoji, score: totalScore }
        })
        .filter((entry): entry is { emoji: PackEmoji; score: number } => entry !== null)
        // Sort by score (lower is better), then alphabetically
        .sort((a, b) => {
          if (a.score !== b.score) {
            return a.score - b.score
          }
          return a.emoji.name.localeCompare(b.emoji.name)
        })

      return scored.map((entry) => entry.emoji)
    })
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export const packDiscovery = new PackDiscoveryService()
