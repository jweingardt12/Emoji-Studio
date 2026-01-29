/**
 * Unit Tests for Wrapped Service
 *
 * Tests the Wrapped analytics calculations including year filtering,
 * minimum data validation, stats calculation, personal stats, and streaks.
 */

import {
  filterEmojisByYear,
  hasMinimumDataForWrapped,
  calculateWrappedStats,
  calculatePersonalStats,
  getAvailableWrappedYears,
} from '@/lib/services/wrapped-service'
import type { Emoji } from '@/lib/services/emoji-service'

// Test data factory
const createEmoji = (overrides: Partial<Emoji> = {}): Emoji => ({
  name: 'test-emoji',
  is_alias: 0,
  url: 'https://emoji.slack-edge.com/test.png',
  team_id: 'T12345',
  user_id: 'U12345',
  created: Math.floor(Date.now() / 1000),
  is_bad: false,
  user_display_name: 'Test User',
  can_delete: true,
  ...overrides,
})

// Helper to create timestamp for a specific date
const dateToTimestamp = (year: number, month: number, day: number, hour = 12): number => {
  return Math.floor(new Date(year, month - 1, day, hour).getTime() / 1000)
}

describe('filterEmojisByYear', () => {
  it('should filter emojis to a specific year', () => {
    const emojis: Emoji[] = [
      createEmoji({ name: 'emoji-2023', created: dateToTimestamp(2023, 6, 15) }),
      createEmoji({ name: 'emoji-2024-1', created: dateToTimestamp(2024, 3, 10) }),
      createEmoji({ name: 'emoji-2024-2', created: dateToTimestamp(2024, 9, 20) }),
      createEmoji({ name: 'emoji-2025', created: dateToTimestamp(2025, 1, 5) }),
    ]

    const result = filterEmojisByYear(emojis, 2024)

    expect(result).toHaveLength(2)
    expect(result.map(e => e.name)).toContain('emoji-2024-1')
    expect(result.map(e => e.name)).toContain('emoji-2024-2')
  })

  it('should handle year boundaries correctly (Jan 1 to Dec 31)', () => {
    const emojis: Emoji[] = [
      createEmoji({ name: 'dec-31-2023', created: dateToTimestamp(2023, 12, 31, 23) }),
      createEmoji({ name: 'jan-1-2024', created: dateToTimestamp(2024, 1, 1, 0) }),
      createEmoji({ name: 'dec-31-2024', created: dateToTimestamp(2024, 12, 31, 23) }),
      createEmoji({ name: 'jan-1-2025', created: dateToTimestamp(2025, 1, 1, 0) }),
    ]

    const result = filterEmojisByYear(emojis, 2024)

    expect(result).toHaveLength(2)
    expect(result.map(e => e.name)).toContain('jan-1-2024')
    expect(result.map(e => e.name)).toContain('dec-31-2024')
  })

  it('should exclude aliases by default', () => {
    const emojis: Emoji[] = [
      createEmoji({ name: 'original', is_alias: 0, created: dateToTimestamp(2024, 6, 15) }),
      createEmoji({ name: 'alias', is_alias: 1, created: dateToTimestamp(2024, 6, 15) }),
    ]

    const result = filterEmojisByYear(emojis, 2024)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('original')
  })

  it('should include aliases when specified', () => {
    const emojis: Emoji[] = [
      createEmoji({ name: 'original', is_alias: 0, created: dateToTimestamp(2024, 6, 15) }),
      createEmoji({ name: 'alias', is_alias: 1, created: dateToTimestamp(2024, 6, 15) }),
    ]

    const result = filterEmojisByYear(emojis, 2024, true)

    expect(result).toHaveLength(2)
  })

  it('should exclude emojis without created timestamp', () => {
    const emojis: Emoji[] = [
      createEmoji({ name: 'with-date', created: dateToTimestamp(2024, 6, 15) }),
      createEmoji({ name: 'without-date', created: 0 }),
    ]

    const result = filterEmojisByYear(emojis, 2024)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('with-date')
  })

  it('should return empty array for year with no emojis', () => {
    const emojis: Emoji[] = [
      createEmoji({ created: dateToTimestamp(2023, 6, 15) }),
    ]

    const result = filterEmojisByYear(emojis, 2024)

    expect(result).toHaveLength(0)
  })
})

describe('hasMinimumDataForWrapped', () => {
  it('should return true when emoji count meets minimum', () => {
    const emojis: Emoji[] = Array(15)
      .fill(null)
      .map((_, i) => createEmoji({ name: `emoji-${i}`, created: dateToTimestamp(2024, 6, i + 1) }))

    const result = hasMinimumDataForWrapped(emojis, 2024, 10)

    expect(result).toBe(true)
  })

  it('should return false when emoji count is below minimum', () => {
    const emojis: Emoji[] = Array(5)
      .fill(null)
      .map((_, i) => createEmoji({ name: `emoji-${i}`, created: dateToTimestamp(2024, 6, i + 1) }))

    const result = hasMinimumDataForWrapped(emojis, 2024, 10)

    expect(result).toBe(false)
  })

  it('should use default minimum of 10', () => {
    const emojis: Emoji[] = Array(9)
      .fill(null)
      .map((_, i) => createEmoji({ name: `emoji-${i}`, created: dateToTimestamp(2024, 6, i + 1) }))

    const result = hasMinimumDataForWrapped(emojis, 2024)

    expect(result).toBe(false)
  })

  it('should return true when exactly at minimum', () => {
    const emojis: Emoji[] = Array(10)
      .fill(null)
      .map((_, i) => createEmoji({ name: `emoji-${i}`, created: dateToTimestamp(2024, 6, i + 1) }))

    const result = hasMinimumDataForWrapped(emojis, 2024, 10)

    expect(result).toBe(true)
  })
})

describe('getAvailableWrappedYears', () => {
  it('should return years with emoji data', () => {
    const emojis: Emoji[] = [
      createEmoji({ created: dateToTimestamp(2022, 6, 15) }),
      createEmoji({ created: dateToTimestamp(2023, 6, 15) }),
      createEmoji({ created: dateToTimestamp(2024, 6, 15) }),
    ]

    const result = getAvailableWrappedYears(emojis)

    expect(result).toContain(2022)
    expect(result).toContain(2023)
    expect(result).toContain(2024)
  })

  it('should return years in descending order (most recent first)', () => {
    const emojis: Emoji[] = [
      createEmoji({ created: dateToTimestamp(2022, 6, 15) }),
      createEmoji({ created: dateToTimestamp(2024, 6, 15) }),
      createEmoji({ created: dateToTimestamp(2023, 6, 15) }),
    ]

    const result = getAvailableWrappedYears(emojis)

    expect(result[0]).toBe(2024)
    expect(result[1]).toBe(2023)
    expect(result[2]).toBe(2022)
  })

  it('should deduplicate years', () => {
    const emojis: Emoji[] = [
      createEmoji({ created: dateToTimestamp(2024, 3, 15) }),
      createEmoji({ created: dateToTimestamp(2024, 6, 15) }),
      createEmoji({ created: dateToTimestamp(2024, 9, 15) }),
    ]

    const result = getAvailableWrappedYears(emojis)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe(2024)
  })

  it('should exclude aliases', () => {
    const emojis: Emoji[] = [
      createEmoji({ is_alias: 0, created: dateToTimestamp(2024, 6, 15) }),
      createEmoji({ is_alias: 1, created: dateToTimestamp(2023, 6, 15) }),
    ]

    const result = getAvailableWrappedYears(emojis)

    expect(result).toContain(2024)
    expect(result).not.toContain(2023)
  })
})

describe('calculateWrappedStats', () => {
  it('should return null when less than 10 emojis', () => {
    const emojis: Emoji[] = Array(5)
      .fill(null)
      .map((_, i) => createEmoji({ created: dateToTimestamp(2024, 6, i + 1) }))

    const result = calculateWrappedStats(emojis, 2024)

    expect(result).toBeNull()
  })

  it('should calculate overview stats correctly', () => {
    const emojis: Emoji[] = [
      ...Array(10).fill(null).map((_, i) =>
        createEmoji({
          name: `emoji-${i}`,
          user_id: i < 5 ? 'U1' : 'U2',
          user_display_name: i < 5 ? 'User One' : 'User Two',
          url: i % 3 === 0 ? 'https://example.com/test.gif' : 'https://example.com/test.png',
          created: dateToTimestamp(2024, 6, i + 1),
        })
      ),
    ]

    const result = calculateWrappedStats(emojis, 2024)

    expect(result).not.toBeNull()
    expect(result!.overview.totalEmojis).toBe(10)
    expect(result!.overview.totalCreators).toBe(2)
    expect(result!.overview.totalGifs).toBeGreaterThan(0)
    expect(result!.overview.totalImages).toBeGreaterThan(0)
  })

  it('should identify top creators', () => {
    const emojis: Emoji[] = [
      ...Array(7).fill(null).map((_, i) =>
        createEmoji({
          name: `prolific-${i}`,
          user_id: 'U1',
          user_display_name: 'Prolific User',
          created: dateToTimestamp(2024, 6, i + 1),
        })
      ),
      ...Array(3).fill(null).map((_, i) =>
        createEmoji({
          name: `casual-${i}`,
          user_id: 'U2',
          user_display_name: 'Casual User',
          created: dateToTimestamp(2024, 6, i + 10),
        })
      ),
    ]

    const result = calculateWrappedStats(emojis, 2024)

    expect(result!.topCreators[0].userId).toBe('U1')
    expect(result!.topCreators[0].emojiCount).toBe(7)
    expect(result!.topCreators[0].rank).toBe(1)
    expect(result!.topCreators[1].userId).toBe('U2')
    expect(result!.topCreators[1].rank).toBe(2)
  })

  it('should identify busiest day', () => {
    const emojis: Emoji[] = [
      ...Array(5).fill(null).map((_, i) =>
        createEmoji({
          name: `busy-day-${i}`,
          created: dateToTimestamp(2024, 6, 15, 10 + i), // Same day, different hours
        })
      ),
      ...Array(5).fill(null).map((_, i) =>
        createEmoji({
          name: `other-${i}`,
          created: dateToTimestamp(2024, 6, i + 1), // Different days
        })
      ),
    ]

    const result = calculateWrappedStats(emojis, 2024)

    expect(result!.busiestDay.count).toBe(5)
  })

  it('should calculate peak day of week', () => {
    // Create emojis only on Mondays (day 1)
    const emojis: Emoji[] = Array(10)
      .fill(null)
      .map((_, i) =>
        createEmoji({
          name: `monday-${i}`,
          // June 3, 10, 17, 24 2024 are all Mondays
          created: dateToTimestamp(2024, 6, 3 + (i * 7) % 28),
        })
      )

    const result = calculateWrappedStats(emojis, 2024)

    expect(result!.peakDayOfWeek.day).toBe('Monday')
  })

  it('should calculate monthly breakdown', () => {
    const emojis: Emoji[] = [
      ...Array(5).fill(null).map((_, i) =>
        createEmoji({ name: `jan-${i}`, created: dateToTimestamp(2024, 1, i + 1) })
      ),
      ...Array(3).fill(null).map((_, i) =>
        createEmoji({ name: `jul-${i}`, created: dateToTimestamp(2024, 7, i + 1) })
      ),
      ...Array(2).fill(null).map((_, i) =>
        createEmoji({ name: `dec-${i}`, created: dateToTimestamp(2024, 12, i + 1) })
      ),
    ]

    const result = calculateWrappedStats(emojis, 2024)

    expect(result!.monthlyBreakdown[0].count).toBe(5) // January
    expect(result!.monthlyBreakdown[6].count).toBe(3) // July
    expect(result!.monthlyBreakdown[11].count).toBe(2) // December
  })

  it('should calculate growth stats when previous year exists', () => {
    const emojis: Emoji[] = [
      ...Array(10).fill(null).map((_, i) =>
        createEmoji({ name: `2023-${i}`, created: dateToTimestamp(2023, 6, i + 1) })
      ),
      ...Array(20).fill(null).map((_, i) =>
        createEmoji({ name: `2024-${i}`, created: dateToTimestamp(2024, 6, i + 1) })
      ),
    ]

    const result = calculateWrappedStats(emojis, 2024)

    expect(result!.growth.hasYoYData).toBe(true)
    expect(result!.growth.previousYearTotal).toBe(10)
    expect(result!.growth.currentYearTotal).toBe(20)
    expect(result!.growth.growthPercentage).toBe(100) // 100% increase
    expect(result!.growth.growthTrend).toBe('up')
  })

  it('should track fun stats', () => {
    const emojis: Emoji[] = [
      createEmoji({ name: 'a', created: dateToTimestamp(2024, 1, 1) }), // Shortest
      createEmoji({ name: 'very-long-emoji-name-here', created: dateToTimestamp(2024, 6, 15) }), // Longest
      ...Array(8).fill(null).map((_, i) =>
        createEmoji({ name: `normal-${i}`, created: dateToTimestamp(2024, 6, i + 2) })
      ),
    ]

    const result = calculateWrappedStats(emojis, 2024)

    expect(result!.funStats.shortestName?.length).toBe(1)
    expect(result!.funStats.longestName?.emoji.name).toBe('very-long-emoji-name-here')
    expect(result!.funStats.firstEmojiOfYear?.name).toBe('a')
  })
})

describe('calculateLongestStreak (via calculateWrappedStats)', () => {
  it('should detect consecutive days streak', () => {
    // Create emojis on 5 consecutive days
    const emojis: Emoji[] = Array(10)
      .fill(null)
      .map((_, i) =>
        createEmoji({
          name: `streak-${i}`,
          created: dateToTimestamp(2024, 6, (i % 5) + 10), // June 10-14
        })
      )

    const result = calculateWrappedStats(emojis, 2024)

    expect(result!.funStats.longestStreak.days).toBeGreaterThanOrEqual(5)
  })

  it('should handle single day (streak of 1)', () => {
    const emojis: Emoji[] = Array(10)
      .fill(null)
      .map((_, i) =>
        createEmoji({
          name: `same-day-${i}`,
          created: dateToTimestamp(2024, 6, 15, 8 + i), // All same day
        })
      )

    const result = calculateWrappedStats(emojis, 2024)

    expect(result!.funStats.longestStreak.days).toBe(1)
  })
})

describe('calculatePersonalStats', () => {
  it('should return null when user has no emojis for the year', () => {
    const allEmojis: Emoji[] = Array(10)
      .fill(null)
      .map((_, i) =>
        createEmoji({
          user_id: 'other-user',
          created: dateToTimestamp(2024, 6, i + 1),
        })
      )

    const userEmojis: Emoji[] = []

    const result = calculatePersonalStats(allEmojis, userEmojis, 2024)

    expect(result).toBeNull()
  })

  it('should calculate user rank among all creators', () => {
    const allEmojis: Emoji[] = [
      ...Array(10).fill(null).map((_, i) =>
        createEmoji({ user_id: 'U1', user_display_name: 'Top User', created: dateToTimestamp(2024, 6, i + 1) })
      ),
      ...Array(5).fill(null).map((_, i) =>
        createEmoji({ user_id: 'U2', user_display_name: 'Current User', created: dateToTimestamp(2024, 6, i + 15) })
      ),
      ...Array(3).fill(null).map((_, i) =>
        createEmoji({ user_id: 'U3', user_display_name: 'Other User', created: dateToTimestamp(2024, 6, i + 25) })
      ),
    ]

    const userEmojis = allEmojis.filter(e => e.user_id === 'U2')

    const result = calculatePersonalStats(allEmojis, userEmojis, 2024)

    expect(result!.rank).toBe(2) // Second place
    expect(result!.totalCreators).toBe(3)
  })

  it('should calculate personal GIF vs image count', () => {
    const userEmojis: Emoji[] = [
      createEmoji({ user_id: 'U1', url: 'https://example.com/1.gif', created: dateToTimestamp(2024, 6, 1) }),
      createEmoji({ user_id: 'U1', url: 'https://example.com/2.gif', created: dateToTimestamp(2024, 6, 2) }),
      createEmoji({ user_id: 'U1', url: 'https://example.com/3.png', created: dateToTimestamp(2024, 6, 3) }),
    ]

    const result = calculatePersonalStats(userEmojis, userEmojis, 2024)

    expect(result!.gifCount).toBe(2)
    expect(result!.imageCount).toBe(1)
    expect(result!.gifPercentage).toBe(67) // ~67%
  })

  it('should track first and last emoji', () => {
    const userEmojis: Emoji[] = [
      createEmoji({ name: 'first', user_id: 'U1', created: dateToTimestamp(2024, 1, 15) }),
      createEmoji({ name: 'middle', user_id: 'U1', created: dateToTimestamp(2024, 6, 15) }),
      createEmoji({ name: 'last', user_id: 'U1', created: dateToTimestamp(2024, 12, 15) }),
    ]

    const result = calculatePersonalStats(userEmojis, userEmojis, 2024)

    expect(result!.firstEmoji?.name).toBe('first')
    expect(result!.lastEmoji?.name).toBe('last')
  })

  it('should calculate comparison to workspace average', () => {
    // Workspace: 3 users, 9 total emojis = 3 avg per user
    // Current user: 6 emojis = 200% of average
    const allEmojis: Emoji[] = [
      ...Array(6).fill(null).map((_, i) =>
        createEmoji({ user_id: 'U1', created: dateToTimestamp(2024, 6, i + 1) })
      ),
      ...Array(2).fill(null).map((_, i) =>
        createEmoji({ user_id: 'U2', created: dateToTimestamp(2024, 6, i + 10) })
      ),
      createEmoji({ user_id: 'U3', created: dateToTimestamp(2024, 6, 20) }),
    ]

    const userEmojis = allEmojis.filter(e => e.user_id === 'U1')

    const result = calculatePersonalStats(allEmojis, userEmojis, 2024)

    expect(result!.comparedToAverage).toBe(200) // 6 / 3 * 100 = 200%
  })

  it('should calculate monthly breakdown for user', () => {
    const userEmojis: Emoji[] = [
      ...Array(3).fill(null).map((_, i) =>
        createEmoji({ user_id: 'U1', created: dateToTimestamp(2024, 3, i + 1) }) // March
      ),
      ...Array(2).fill(null).map((_, i) =>
        createEmoji({ user_id: 'U1', created: dateToTimestamp(2024, 7, i + 1) }) // July
      ),
    ]

    const result = calculatePersonalStats(userEmojis, userEmojis, 2024)

    expect(result!.monthlyBreakdown[2].count).toBe(3) // March (index 2)
    expect(result!.monthlyBreakdown[6].count).toBe(2) // July (index 6)
  })

  it('should calculate late night count', () => {
    const userEmojis: Emoji[] = [
      createEmoji({ user_id: 'U1', created: dateToTimestamp(2024, 6, 1, 2) }), // 2 AM
      createEmoji({ user_id: 'U1', created: dateToTimestamp(2024, 6, 2, 3) }), // 3 AM
      createEmoji({ user_id: 'U1', created: dateToTimestamp(2024, 6, 3, 14) }), // 2 PM
    ]

    const result = calculatePersonalStats(userEmojis, userEmojis, 2024)

    expect(result!.lateNightCount).toBe(2)
  })

  it('should calculate weekend percentage', () => {
    const userEmojis: Emoji[] = [
      createEmoji({ user_id: 'U1', created: dateToTimestamp(2024, 6, 1, 12) }), // Saturday
      createEmoji({ user_id: 'U1', created: dateToTimestamp(2024, 6, 2, 12) }), // Sunday
      createEmoji({ user_id: 'U1', created: dateToTimestamp(2024, 6, 3, 12) }), // Monday
      createEmoji({ user_id: 'U1', created: dateToTimestamp(2024, 6, 4, 12) }), // Tuesday
    ]

    const result = calculatePersonalStats(userEmojis, userEmojis, 2024)

    expect(result!.weekendPercentage).toBe(50) // 2 of 4
  })
})
