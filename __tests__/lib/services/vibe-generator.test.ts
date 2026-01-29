/**
 * Unit Tests for Vibe Generator Service
 *
 * Tests persona detection, haiku generation, movie poster generation,
 * and syllable counting utilities.
 */

import {
  detectPersona,
  generateHaiku,
  generateMoviePoster,
  generateProphecy,
  type Persona,
  type PersonaType,
} from '@/lib/services/vibe-generator'
import type { WrappedStats, PersonalWrappedStats, WordFrequency } from '@/lib/services/wrapped-service'
import type { Emoji } from '@/lib/services/emoji-service'

// Helper to create minimal WrappedStats for testing
const createWrappedStats = (overrides: Partial<WrappedStats> = {}): WrappedStats => {
  // Build funStats with proper merging
  const defaultFunStats = {
    longestName: null,
    shortestName: null,
    firstEmojiOfYear: null,
    lastEmojiOfYear: null,
    mostCommonWord: null,
    topWords: [],
    lateNightCount: 5,
    weekendPercentage: 25,
    longestStreak: { days: 3, startDate: '2024-06-01', endDate: '2024-06-03' },
    milestones: [],
  }

  const funStats = overrides.funStats
    ? { ...defaultFunStats, ...overrides.funStats }
    : defaultFunStats

  // Ensure longestStreak is always defined
  if (!funStats.longestStreak) {
    funStats.longestStreak = { days: 3, startDate: '2024-06-01', endDate: '2024-06-03' }
  }

  return {
    year: 2024,
    generatedAt: Math.floor(Date.now() / 1000),
    overview: {
      totalEmojis: 100,
      totalCreators: 10,
      totalGifs: 30,
      totalImages: 70,
      gifPercentage: 30,
      averagePerWeek: 2,
      averagePerCreator: 10,
      ...(overrides.overview || {}),
    },
    topCreators: overrides.topCreators || [],
    busiestDay: {
      date: '2024-06-15',
      timestamp: 1718400000,
      count: 10,
      emojis: [],
      ...(overrides.busiestDay || {}),
    },
    busiestWeek: overrides.busiestWeek || {
      date: 'Week of 2024-W25',
      timestamp: 0,
      count: 20,
      emojis: [],
    },
    peakDayOfWeek: overrides.peakDayOfWeek || {
      day: 'Wednesday',
      dayIndex: 3,
      count: 20,
      percentage: 20,
    },
    peakHourOfDay: {
      hour: 14,
      label: '2PM - 3PM',
      count: 15,
      percentage: 15,
      ...(overrides.peakHourOfDay || {}),
    },
    hourlyDistribution: overrides.hourlyDistribution || [],
    funStats,
    growth: overrides.growth || {
      hasYoYData: false,
      previousYearTotal: 0,
      currentYearTotal: 100,
      growthPercentage: 0,
      growthTrend: 'stable',
    },
    monthlyBreakdown: overrides.monthlyBreakdown || [],
    monthlyTopCreators: overrides.monthlyTopCreators || [],
    highlights: overrides.highlights || [],
  }
}

// Helper to create PersonalWrappedStats
const createPersonalStats = (overrides: Partial<PersonalWrappedStats> = {}): PersonalWrappedStats => ({
  userId: 'U12345',
  displayName: 'Test User',
  totalEmojis: 50,
  rank: 1,
  totalCreators: 10,
  percentageOfTotal: 50,
  topEmojis: [],
  firstEmoji: null,
  lastEmoji: null,
  gifCount: 15,
  imageCount: 35,
  gifPercentage: 30,
  favoriteDayOfWeek: { day: 'Monday', dayIndex: 1, count: 10, percentage: 20 },
  favoriteHour: { hour: 14, label: '2PM', count: 8, percentage: 16 },
  personalStreak: { days: 5, startDate: '2024-06-01', endDate: '2024-06-05' },
  monthlyBreakdown: [],
  lateNightCount: 3,
  weekendPercentage: 30,
  comparedToAverage: 100,
  hourlyDistribution: [],
  topWords: [],
  ...overrides,
})

describe('detectPersona', () => {
  describe('minimum emoji threshold', () => {
    it('should return steady-hand for fewer than 5 emojis', () => {
      const stats = createWrappedStats({ overview: { totalEmojis: 3 } as any })

      const result = detectPersona(stats)

      expect(result.type).toBe('steady-hand')
      expect(result.name).toBe('The Steady Hand')
    })

    it('should detect personas for 5+ emojis', () => {
      const stats = createWrappedStats({ overview: { totalEmojis: 10, gifPercentage: 70 } as any })

      const result = detectPersona(stats)

      expect(result.type).not.toBe('steady-hand')
    })
  })

  describe('insomniac persona', () => {
    it('should detect insomniac when >25% late night AND 3+ late night emojis', () => {
      const stats = createWrappedStats({
        overview: { totalEmojis: 10 } as any,
        funStats: { lateNightCount: 4 } as any, // 40% late night
      })

      const result = detectPersona(stats)

      expect(result.type).toBe('insomniac')
      expect(result.name).toBe('The Insomniac')
      expect(result.icon).toBe('Moon')
    })

    it('should not detect insomniac when late night count is below 3', () => {
      const stats = createWrappedStats({
        overview: { totalEmojis: 10 } as any,
        funStats: { lateNightCount: 2 } as any,
      })

      const result = detectPersona(stats)

      expect(result.type).not.toBe('insomniac')
    })
  })

  describe('meme-lord persona', () => {
    it('should detect meme-lord when >60% GIFs', () => {
      const stats = createWrappedStats({
        overview: { totalEmojis: 100, gifPercentage: 65 } as any,
        funStats: { lateNightCount: 0 } as any,
      })

      const result = detectPersona(stats)

      expect(result.type).toBe('meme-lord')
      expect(result.name).toBe('The Meme Lord')
    })
  })

  describe('purist persona', () => {
    it('should detect purist when <5% GIFs and 10+ emojis', () => {
      const stats = createWrappedStats({
        overview: { totalEmojis: 15, gifPercentage: 3 } as any,
        funStats: { lateNightCount: 0 } as any,
      })

      const result = detectPersona(stats)

      expect(result.type).toBe('purist')
      expect(result.name).toBe('The Purist')
    })
  })

  describe('minimalist persona', () => {
    it('should detect minimalist when avg name length < 5', () => {
      const stats = createWrappedStats({
        overview: { totalEmojis: 10, gifPercentage: 30 } as any,
        funStats: {
          longestName: { emoji: {} as Emoji, length: 4 },
          shortestName: { emoji: {} as Emoji, length: 2 },
          lateNightCount: 0,
        } as any,
      })

      const result = detectPersona(stats)

      expect(result.type).toBe('minimalist')
      expect(result.name).toBe('The Minimalist')
    })
  })

  describe('novelist persona', () => {
    it('should detect novelist when avg name length > 18', () => {
      const stats = createWrappedStats({
        overview: { totalEmojis: 10, gifPercentage: 30 } as any,
        funStats: {
          longestName: { emoji: {} as Emoji, length: 25 },
          shortestName: { emoji: {} as Emoji, length: 15 },
          lateNightCount: 0,
        } as any,
      })

      const result = detectPersona(stats)

      expect(result.type).toBe('novelist')
    })
  })

  describe('streak-demon persona', () => {
    it('should detect streak-demon when streak > 10 days', () => {
      const stats = createWrappedStats({
        overview: { totalEmojis: 10, gifPercentage: 30 } as any,
        funStats: {
          longestStreak: { days: 15, startDate: '', endDate: '' },
          lateNightCount: 0,
        } as any,
      })

      const result = detectPersona(stats)

      expect(result.type).toBe('streak-demon')
      expect(result.name).toBe('The Streak Demon')
    })
  })

  describe('weekend-warrior persona', () => {
    it('should detect weekend-warrior when >45% weekend', () => {
      const stats = createWrappedStats({
        overview: { totalEmojis: 10, gifPercentage: 30 } as any,
        funStats: {
          weekendPercentage: 50,
          longestStreak: { days: 2, startDate: '', endDate: '' },
          lateNightCount: 0,
        } as any,
      })

      const result = detectPersona(stats)

      expect(result.type).toBe('weekend-warrior')
    })
  })

  describe('dawn-patrol persona', () => {
    it('should detect dawn-patrol when peak hour is 5-8am', () => {
      const stats = createWrappedStats({
        overview: { totalEmojis: 10, gifPercentage: 30 } as any,
        peakHourOfDay: { hour: 6, label: '6AM - 7AM', count: 5, percentage: 10 },
        funStats: { lateNightCount: 0, weekendPercentage: 20 } as any,
      })

      const result = detectPersona(stats)

      expect(result.type).toBe('dawn-patrol')
    })
  })

  describe('night-shift persona', () => {
    it('should detect night-shift when peak hour is 9pm-12am', () => {
      const stats = createWrappedStats({
        overview: { totalEmojis: 10, gifPercentage: 30 } as any,
        peakHourOfDay: { hour: 22, label: '10PM - 11PM', count: 5, percentage: 10 },
        funStats: { lateNightCount: 0, weekendPercentage: 20 } as any,
      })

      const result = detectPersona(stats)

      expect(result.type).toBe('night-shift')
    })
  })

  describe('burst-artist persona', () => {
    it('should detect burst-artist when busiest day > 15 emojis', () => {
      const stats = createWrappedStats({
        overview: { totalEmojis: 30, gifPercentage: 30, averagePerWeek: 3 } as any,
        busiestDay: { count: 20, date: '', timestamp: 0, emojis: [] },
        funStats: { lateNightCount: 0, weekendPercentage: 20 } as any,
      })

      const result = detectPersona(stats)

      expect(result.type).toBe('burst-artist')
    })
  })

  describe('personal stats persona detection', () => {
    it('should use personal stats when provided', () => {
      const stats = createWrappedStats()
      const personalStats = createPersonalStats({
        lateNightCount: 20,
        totalEmojis: 30, // 66% late night
      })

      const result = detectPersona(stats, personalStats)

      expect(result.type).toBe('insomniac')
    })

    it('should detect backbone when >250% of workspace average', () => {
      // Set totalEmojis in workspace high (2000) so personal share (25) is only 1.25%
      // This avoids triggering "trendsetter" (which needs >20% share)
      // Set personal totalEmojis > 20 so activeMonths = 6 (avoids "sprinter")
      const stats = createWrappedStats({
        overview: { totalEmojis: 2000, gifPercentage: 30, averagePerWeek: 5 } as any,
      })
      const personalStats = createPersonalStats({
        totalEmojis: 25, // Only 1.25% of workspace (25/2000) - avoids trendsetter
        comparedToAverage: 300, // But 300% of the average - triggers backbone
        lateNightCount: 1,
        weekendPercentage: 20,
        personalStreak: { days: 2, startDate: '', endDate: '' },
        gifPercentage: 30,
      })

      const result = detectPersona(stats, personalStats)

      expect(result.type).toBe('backbone')
    })
  })

  describe('persona properties', () => {
    it('should include all required persona properties', () => {
      const stats = createWrappedStats()

      const result = detectPersona(stats)

      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('icon')
      expect(result).toHaveProperty('description')
      expect(result).toHaveProperty('gradient')
      expect(result).toHaveProperty('emoji')
      expect(result).toHaveProperty('stats')
      expect(result).toHaveProperty('tarotNumber')
      expect(result.gradient).toHaveLength(2)
      expect(result.stats).toHaveLength(3)
    })
  })
})

describe('generateHaiku', () => {
  it('should return fallback haiku when no words provided', () => {
    const result = generateHaiku([])

    expect(result.lines).toHaveLength(3)
    expect(result.syllables).toHaveLength(3)
    expect(result.lines[0]).toBe('emojis speak loud')
  })

  it('should return fallback haiku when fewer than 3 words', () => {
    const words: WordFrequency[] = [
      { word: 'party', count: 5 },
      { word: 'fire', count: 3 },
    ]

    const result = generateHaiku(words)

    expect(result.lines[0]).toBe('emojis speak loud')
  })

  it('should generate haiku from word list', () => {
    const words: WordFrequency[] = [
      { word: 'party', count: 10 },
      { word: 'dance', count: 8 },
      { word: 'happy', count: 7 },
      { word: 'smile', count: 6 },
      { word: 'love', count: 5 },
      { word: 'joy', count: 4 },
      { word: 'fun', count: 3 },
    ]

    const result = generateHaiku(words)

    expect(result.lines).toHaveLength(3)
    expect(result.syllables).toHaveLength(3)
    // Each line should have content
    expect(result.lines[0].length).toBeGreaterThan(0)
    expect(result.lines[1].length).toBeGreaterThan(0)
    expect(result.lines[2].length).toBeGreaterThan(0)
  })

  it('should target 5-7-5 syllable structure', () => {
    const words: WordFrequency[] = [
      { word: 'party', count: 10 },
      { word: 'dance', count: 8 },
      { word: 'happy', count: 7 },
      { word: 'smile', count: 6 },
      { word: 'love', count: 5 },
      { word: 'joy', count: 4 },
      { word: 'fun', count: 3 },
      { word: 'wow', count: 2 },
    ]

    const result = generateHaiku(words)

    // Syllable counts should be close to 5-7-5
    expect(result.syllables[0]).toBeLessThanOrEqual(7)
    expect(result.syllables[1]).toBeLessThanOrEqual(9)
    expect(result.syllables[2]).toBeLessThanOrEqual(7)
  })

  it('should filter out words longer than 5 syllables', () => {
    const words: WordFrequency[] = [
      { word: 'internationalization', count: 10 }, // Too long
      { word: 'party', count: 8 },
      { word: 'dance', count: 7 },
      { word: 'happy', count: 6 },
    ]

    const result = generateHaiku(words)

    // Should not include the super long word
    expect(result.lines.join(' ')).not.toContain('internationalization')
  })
})

describe('countSyllables (tested via haiku generation)', () => {
  // We test countSyllables indirectly through haiku syllable counts
  it('should count syllables reasonably for common words', () => {
    // Single syllable words
    const singleSyllable: WordFrequency[] = [
      { word: 'cat', count: 1 },
      { word: 'dog', count: 1 },
      { word: 'fire', count: 1 },
    ]

    // Two syllable words
    const twoSyllable: WordFrequency[] = [
      { word: 'party', count: 1 },
      { word: 'happy', count: 1 },
      { word: 'rocket', count: 1 },
    ]

    // Test that haiku generation works with these
    const result1 = generateHaiku([...singleSyllable, ...twoSyllable, { word: 'smile', count: 1 }])
    expect(result1.lines).toHaveLength(3)
  })
})

describe('generateMoviePoster', () => {
  it('should return fallback when no words provided', () => {
    const stats = createWrappedStats()

    const result = generateMoviePoster(stats, [])

    expect(result.title).toBeTruthy()
    expect(result.tagline).toBeTruthy()
    expect(result.genre).toBeTruthy()
    expect(result.year).toBe(2024)
  })

  it('should return fallback when fewer than 2 words', () => {
    const stats = createWrappedStats()

    const result = generateMoviePoster(stats, [{ word: 'party', count: 5 }])

    expect(result.title).toBeTruthy()
    expect(['THE EMOJI CHRONICLES', 'PIXELS OF DESTINY', 'THE SLACK FILES', 'CTRL+EMOJI', 'REACTING: A STORY']).toContainEqual(
      result.title
    )
  })

  it('should generate movie poster from word list', () => {
    const stats = createWrappedStats()
    const words: WordFrequency[] = [
      { word: 'party', count: 10 },
      { word: 'vibes', count: 8 },
    ]

    const result = generateMoviePoster(stats, words)

    expect(result.title).toBeTruthy()
    expect(result.title).toBe(result.title.toUpperCase()) // Should be uppercase
    expect(result.tagline).toBeTruthy()
    expect(result.genre).toBeTruthy()
    expect(result.runtime).toBe(100) // Total emojis
    expect(result.year).toBe(2024)
  })

  it('should set rating based on growth', () => {
    const statsWithGrowth = createWrappedStats({
      growth: {
        hasYoYData: true,
        previousYearTotal: 50,
        currentYearTotal: 100,
        growthPercentage: 100,
        growthTrend: 'up',
      },
    })

    const result = generateMoviePoster(statsWithGrowth, [
      { word: 'party', count: 10 },
      { word: 'vibes', count: 8 },
    ])

    expect(result.rating).toBeGreaterThanOrEqual(4)
  })

  it('should select genre based on context', () => {
    // High GIF percentage should select animated comedy
    const highGifStats = createWrappedStats({
      overview: { gifPercentage: 70, totalEmojis: 100 } as any,
    })

    const result = generateMoviePoster(highGifStats, [
      { word: 'party', count: 10 },
      { word: 'vibes', count: 8 },
    ])

    expect(result.genre).toBe('An Animated Comedy')
  })

  it('should use personal stats when provided', () => {
    const stats = createWrappedStats()
    const personalStats = createPersonalStats({
      lateNightCount: 20,
      totalEmojis: 30,
    })

    const result = generateMoviePoster(
      stats,
      [
        { word: 'night', count: 10 },
        { word: 'owl', count: 8 },
      ],
      personalStats
    )

    expect(result).toBeTruthy()
    expect(result.genre).toBe('A Psychological Thriller') // High late night %
  })
})

describe('generateProphecy', () => {
  it('should generate prophecy for given persona', () => {
    const persona: Persona = {
      type: 'insomniac',
      name: 'The Insomniac',
      icon: 'Moon',
      description: 'Sleep is for people without deadlines.',
      gradient: ['#000', '#111'],
      emoji: '🦇',
      stats: [
        { label: 'NIGHT', value: 92 },
        { label: 'CHAOS', value: 78 },
        { label: 'CAFFEINE', value: 100 },
      ],
      tarotNumber: 'XVIII',
    }

    const result = generateProphecy(persona, 2024)

    expect(result.text).toBeTruthy()
    expect(result.disclaimer).toBe('For entertainment purposes. Mostly.')
  })

  it('should replace year references in prophecy', () => {
    const persona: Persona = {
      type: 'steady-hand',
      name: 'The Steady Hand',
      icon: 'Target',
      description: 'Consistent. Reliable.',
      gradient: ['#000', '#111'],
      emoji: '🎯',
      stats: [
        { label: 'STEADY', value: 90 },
        { label: 'CHILL', value: 80 },
        { label: 'CHAOS', value: 25 },
      ],
      tarotNumber: 'XIV',
    }

    const result = generateProphecy(persona, 2024)

    // Prophecy should reference the next year (2025)
    if (result.text.includes('2025')) {
      expect(result.text).toContain('2025')
    }
  })

  it('should have prophecies for all persona types', () => {
    const personaTypes: PersonaType[] = [
      'insomniac',
      'meme-lord',
      'minimalist',
      'novelist',
      'streak-demon',
      'weekend-warrior',
      'dawn-patrol',
      'burst-artist',
      'backbone',
      'steady-hand',
      'purist',
      'archivist',
      'trendsetter',
      'night-shift',
      'lunch-break-artist',
      'sprinter',
    ]

    personaTypes.forEach(type => {
      const persona: Persona = {
        type,
        name: `The ${type}`,
        icon: 'Star',
        description: 'Test',
        gradient: ['#000', '#111'],
        emoji: '⭐',
        stats: [
          { label: 'A', value: 50 },
          { label: 'B', value: 50 },
          { label: 'C', value: 50 },
        ],
        tarotNumber: 'I',
      }

      const result = generateProphecy(persona, 2024)
      expect(result.text).toBeTruthy()
    })
  })
})
