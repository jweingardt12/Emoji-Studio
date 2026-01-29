/**
 * Unit Tests for Emoji Service
 *
 * Tests core emoji service functions including filtering, statistics,
 * leaderboard generation, and curl parsing.
 */

import {
  filterNonAliasEmojis,
  calculateEmojiStats,
  getUserLeaderboard,
  isEmojiNameAvailable,
  parseCurlToRequest,
  type Emoji,
} from '@/lib/services/emoji-service'

// Test data factory
const createEmoji = (overrides: Partial<Emoji> = {}): Emoji => ({
  name: 'test-emoji',
  is_alias: 0,
  url: 'https://emoji.slack-edge.com/test.png',
  team_id: 'T12345',
  user_id: 'U12345',
  created: Math.floor(Date.now() / 1000) - 86400, // Yesterday
  is_bad: false,
  user_display_name: 'Test User',
  can_delete: true,
  ...overrides,
})

describe('filterNonAliasEmojis', () => {
  it('should filter out alias emojis', () => {
    const emojis: Emoji[] = [
      createEmoji({ name: 'original', is_alias: 0 }),
      createEmoji({ name: 'alias1', is_alias: 1, alias_for: 'original' }),
      createEmoji({ name: 'another-original', is_alias: 0 }),
    ]

    const result = filterNonAliasEmojis(emojis)

    expect(result).toHaveLength(2)
    expect(result.map(e => e.name)).toContain('original')
    expect(result.map(e => e.name)).toContain('another-original')
    expect(result.map(e => e.name)).not.toContain('alias1')
  })

  it('should return all emojis if none are aliases', () => {
    const emojis: Emoji[] = [
      createEmoji({ name: 'emoji1', is_alias: 0 }),
      createEmoji({ name: 'emoji2', is_alias: 0 }),
    ]

    const result = filterNonAliasEmojis(emojis)

    expect(result).toHaveLength(2)
  })

  it('should return empty array if all emojis are aliases', () => {
    const emojis: Emoji[] = [
      createEmoji({ name: 'alias1', is_alias: 1 }),
      createEmoji({ name: 'alias2', is_alias: 1 }),
    ]

    const result = filterNonAliasEmojis(emojis)

    expect(result).toHaveLength(0)
  })

  it('should handle empty array', () => {
    const result = filterNonAliasEmojis([])

    expect(result).toHaveLength(0)
  })
})

describe('calculateEmojiStats', () => {
  const now = Math.floor(Date.now() / 1000)
  const oneDay = 24 * 60 * 60
  const oneWeek = 7 * oneDay

  it('should calculate total emoji count (excluding aliases)', () => {
    const emojis: Emoji[] = [
      createEmoji({ name: 'emoji1', is_alias: 0 }),
      createEmoji({ name: 'emoji2', is_alias: 0 }),
      createEmoji({ name: 'alias', is_alias: 1 }),
    ]

    const stats = calculateEmojiStats(emojis, now)

    expect(stats.totalEmojis).toBe(2)
  })

  it('should calculate unique creator count', () => {
    const emojis: Emoji[] = [
      createEmoji({ user_id: 'U1' }),
      createEmoji({ user_id: 'U1' }),
      createEmoji({ user_id: 'U2' }),
    ]

    const stats = calculateEmojiStats(emojis, now)

    expect(stats.totalCreators).toBe(2)
  })

  it('should identify most recent emoji', () => {
    const emojis: Emoji[] = [
      createEmoji({ name: 'old', created: now - oneWeek }),
      createEmoji({ name: 'newest', created: now - oneDay }),
      createEmoji({ name: 'middle', created: now - 3 * oneDay }),
    ]

    const stats = calculateEmojiStats(emojis, now)

    expect(stats.mostRecent).toBe('newest')
    expect(stats.mostRecentTimestamp).toBe(now - oneDay)
  })

  it('should calculate emojis per user', () => {
    const emojis: Emoji[] = [
      createEmoji({ user_id: 'U1' }),
      createEmoji({ user_id: 'U1' }),
      createEmoji({ user_id: 'U2' }),
      createEmoji({ user_id: 'U2' }),
    ]

    const stats = calculateEmojiStats(emojis, now)

    expect(stats.emojisPerUser).toBe(2) // 4 emojis / 2 users
  })

  it('should calculate weekly change percentage', () => {
    // 3 emojis this week, 2 last week = 50% increase
    const emojis: Emoji[] = [
      createEmoji({ created: now - oneDay }), // This week
      createEmoji({ created: now - 2 * oneDay }), // This week
      createEmoji({ created: now - 3 * oneDay }), // This week
      createEmoji({ created: now - oneWeek - oneDay }), // Last week
      createEmoji({ created: now - oneWeek - 2 * oneDay }), // Last week
    ]

    const stats = calculateEmojiStats(emojis, now)

    expect(stats.weeklyEmojisChange).toBe(50)
  })

  it('should handle 100% increase when last week was zero', () => {
    const emojis: Emoji[] = [
      createEmoji({ created: now - oneDay }), // This week only
    ]

    const stats = calculateEmojiStats(emojis, now)

    expect(stats.weeklyEmojisChange).toBe(100)
  })

  it('should handle empty emoji array', () => {
    const stats = calculateEmojiStats([], now)

    expect(stats.totalEmojis).toBe(0)
    expect(stats.totalCreators).toBe(0)
    expect(stats.mostRecent).toBe('')
    expect(stats.emojisPerUser).toBe(0)
  })
})

describe('getUserLeaderboard', () => {
  const now = Math.floor(Date.now() / 1000)
  const oneDay = 24 * 60 * 60
  const oneWeek = 7 * oneDay

  it('should rank users by emoji count (highest first)', () => {
    const emojis: Emoji[] = [
      createEmoji({ user_id: 'U1', user_display_name: 'User One' }),
      createEmoji({ user_id: 'U2', user_display_name: 'User Two' }),
      createEmoji({ user_id: 'U2', user_display_name: 'User Two' }),
      createEmoji({ user_id: 'U2', user_display_name: 'User Two' }),
    ]

    const leaderboard = getUserLeaderboard(emojis, now)

    expect(leaderboard[0].user_id).toBe('U2')
    expect(leaderboard[0].emoji_count).toBe(3)
    expect(leaderboard[1].user_id).toBe('U1')
    expect(leaderboard[1].emoji_count).toBe(1)
  })

  it('should calculate L4WEPW (Last 4 Weeks Emojis Per Week)', () => {
    // User created 8 emojis in the last 4 weeks = 2 per week
    const emojis: Emoji[] = Array(8)
      .fill(null)
      .map((_, i) =>
        createEmoji({
          user_id: 'U1',
          user_display_name: 'Prolific User',
          created: now - i * oneDay,
        })
      )

    const leaderboard = getUserLeaderboard(emojis, now)

    expect(leaderboard[0].l4wepw).toBe(2) // 8 emojis / 4 weeks
  })

  it('should track most recent emoji timestamp per user', () => {
    const emojis: Emoji[] = [
      createEmoji({ user_id: 'U1', created: now - 10 * oneDay }),
      createEmoji({ user_id: 'U1', created: now - oneDay }),
      createEmoji({ user_id: 'U1', created: now - 5 * oneDay }),
    ]

    const leaderboard = getUserLeaderboard(emojis, now)

    expect(leaderboard[0].most_recent_emoji_timestamp).toBe(now - oneDay)
  })

  it('should track oldest emoji timestamp per user', () => {
    const emojis: Emoji[] = [
      createEmoji({ user_id: 'U1', created: now - oneDay }),
      createEmoji({ user_id: 'U1', created: now - 10 * oneDay }),
      createEmoji({ user_id: 'U1', created: now - 5 * oneDay }),
    ]

    const leaderboard = getUserLeaderboard(emojis, now)

    expect(leaderboard[0].oldest_emoji_timestamp).toBe(now - 10 * oneDay)
  })

  it('should include recent emojis sample (up to 5)', () => {
    const emojis: Emoji[] = Array(10)
      .fill(null)
      .map((_, i) =>
        createEmoji({
          name: `emoji-${i}`,
          user_id: 'U1',
          created: now - i * oneDay,
        })
      )

    const leaderboard = getUserLeaderboard(emojis, now)

    expect(leaderboard[0].recent_emojis).toHaveLength(5)
    expect(leaderboard[0].recent_emojis?.[0].name).toBe('emoji-0') // Most recent
  })

  it('should filter out aliases', () => {
    const emojis: Emoji[] = [
      createEmoji({ user_id: 'U1', is_alias: 0 }),
      createEmoji({ user_id: 'U1', is_alias: 1 }),
      createEmoji({ user_id: 'U1', is_alias: 0 }),
    ]

    const leaderboard = getUserLeaderboard(emojis, now)

    expect(leaderboard[0].emoji_count).toBe(2) // Only non-aliases counted
  })

  it('should handle empty array', () => {
    const leaderboard = getUserLeaderboard([], now)

    expect(leaderboard).toHaveLength(0)
  })
})

describe('isEmojiNameAvailable', () => {
  it('should return true when name is not taken', async () => {
    const existingEmojis: Emoji[] = [
      createEmoji({ name: 'party' }),
      createEmoji({ name: 'rocket' }),
    ]

    const result = await isEmojiNameAvailable('newemoji', existingEmojis)

    expect(result).toBe(true)
  })

  it('should return false when name is taken', async () => {
    const existingEmojis: Emoji[] = [
      createEmoji({ name: 'party' }),
      createEmoji({ name: 'rocket' }),
    ]

    const result = await isEmojiNameAvailable('party', existingEmojis)

    expect(result).toBe(false)
  })

  it('should be case insensitive', async () => {
    const existingEmojis: Emoji[] = [createEmoji({ name: 'PartyParrot' })]

    const result = await isEmojiNameAvailable('partyparrot', existingEmojis)

    expect(result).toBe(false)
  })

  it('should strip colons from name', async () => {
    const existingEmojis: Emoji[] = [createEmoji({ name: 'party' })]

    const result = await isEmojiNameAvailable(':party:', existingEmojis)

    expect(result).toBe(false)
  })

  it('should handle empty emoji list', async () => {
    const result = await isEmojiNameAvailable('anyname', [])

    expect(result).toBe(true)
  })

  it('should trim whitespace', async () => {
    const existingEmojis: Emoji[] = [createEmoji({ name: 'party' })]

    const result = await isEmojiNameAvailable('  party  ', existingEmojis)

    expect(result).toBe(false)
  })
})

describe('parseCurlToRequest', () => {
  describe('URL extraction', () => {
    it('should extract URL with single quotes', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.adminList'`

      const result = parseCurlToRequest(curl)

      expect(result.url).toBe('https://workspace.slack.com/api/emoji.adminList')
    })

    it('should extract URL with double quotes', () => {
      const curl = `curl "https://workspace.slack.com/api/emoji.adminList"`

      const result = parseCurlToRequest(curl)

      expect(result.url).toBe('https://workspace.slack.com/api/emoji.adminList')
    })

    it('should extract URL without quotes', () => {
      const curl = `curl https://workspace.slack.com/api/emoji.adminList`

      const result = parseCurlToRequest(curl)

      expect(result.url).toBe('https://workspace.slack.com/api/emoji.adminList')
    })

    it('should extract URL with query parameters', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.adminList?token=xoxc-123&count=20000'`

      const result = parseCurlToRequest(curl)

      expect(result.url).toContain('token=xoxc-123')
      expect(result.url).toContain('count=20000')
    })
  })

  describe('method extraction', () => {
    it('should default to POST for emoji endpoints', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.adminList'`

      const result = parseCurlToRequest(curl)

      expect(result.method).toBe('POST')
    })

    it('should extract explicit method from --request flag', () => {
      const curl = `curl --request GET 'https://workspace.slack.com/api/emoji.adminList'`

      const result = parseCurlToRequest(curl)

      expect(result.method).toBe('GET')
    })

    it('should extract explicit method from -X flag', () => {
      const curl = `curl -X PUT 'https://workspace.slack.com/api/emoji.adminList'`

      const result = parseCurlToRequest(curl)

      expect(result.method).toBe('PUT')
    })
  })

  describe('header extraction', () => {
    it('should extract headers from -H flag', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.adminList' \
        -H 'Content-Type: application/json' \
        -H 'Accept: */*'`

      const result = parseCurlToRequest(curl)

      expect(result.headers['Content-Type']).toBe('application/json')
      expect(result.headers['Accept']).toBe('*/*')
    })

    it('should extract headers from --header flag', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.adminList' \
        --header 'Authorization: Bearer xoxc-123'`

      const result = parseCurlToRequest(curl)

      expect(result.headers['Authorization']).toBe('Bearer xoxc-123')
    })

    it('should extract cookie from -b flag', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.adminList' \
        -b 'd=xoxd-cookie-value'`

      const result = parseCurlToRequest(curl)

      expect(result.headers['Cookie']).toBe('d=xoxd-cookie-value')
    })
  })

  describe('token extraction', () => {
    it('should extract token from URL query parameter', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.adminList?token=xoxc-123-456'`

      const result = parseCurlToRequest(curl)

      expect(result.formData?.token).toBe('xoxc-123-456')
    })

    it('should extract xoxc token from command body', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.adminList' \
        --data-raw 'token=xoxc-789-012-345-abcdef'`

      const result = parseCurlToRequest(curl)

      expect(result.formData?.token).toBe('xoxc-789-012-345-abcdef')
    })

    it('should extract token from form data', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.add' \
        --form 'token=xoxc-form-token'`

      const result = parseCurlToRequest(curl)

      expect(result.formData?.token).toBe('xoxc-form-token')
    })
  })

  describe('form data extraction', () => {
    it('should extract form data from --form flag', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.add' \
        --form 'name=test-emoji' \
        --form 'mode=data'`

      const result = parseCurlToRequest(curl)

      expect(result.formData?.name).toBe('test-emoji')
      expect(result.formData?.mode).toBe('data')
    })

    it('should add default count for emoji requests', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.adminList'`

      const result = parseCurlToRequest(curl)

      expect(result.formData?.count).toBe('20000')
    })
  })

  describe('GET request handling', () => {
    it('should not include body for GET requests', () => {
      const curl = `curl -X GET 'https://workspace.slack.com/api/emoji.list' \
        --form 'token=xoxc-123'`

      const result = parseCurlToRequest(curl)

      expect(result.method).toBe('GET')
      expect(result.formData).toBeUndefined()
      expect(result.data).toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('should return empty URL for invalid curl command', () => {
      const curl = 'not a valid curl command'

      const result = parseCurlToRequest(curl)

      expect(result.url).toBe('')
    })

    it('should handle multiline curl commands', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.adminList' \\
        -H 'Accept: application/json' \\
        --data-raw 'token=xoxc-123'`

      const result = parseCurlToRequest(curl)

      expect(result.url).toContain('emoji.adminList')
    })
  })
})
