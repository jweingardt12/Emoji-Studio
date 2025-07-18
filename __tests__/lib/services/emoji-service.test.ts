/**
 * Tests for Emoji Service - CRUD Operations
 * 
 * CRUD stands for:
 * - Create: Adding new emojis
 * - Read: Fetching/viewing emojis
 * - Update: Renaming or modifying emojis
 * - Delete: Removing emojis
 */

import { 
  fetchSlackEmojis, 
  uploadEmoji, 
  deleteEmoji, 
  createAlias,
  calculateEmojiStats,
  getUserLeaderboard,
  filterEmojisByDate
} from '@/lib/services/emoji-service'

// Mock fetch globally
global.fetch = jest.fn()

describe('Emoji Service', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    jest.clearAllMocks()
  })

  describe('fetchSlackEmojis - Read Operations', () => {
    it('should fetch emojis successfully', async () => {
      // Mock a successful API response
      const mockEmojis = [
        { name: 'party', url: 'https://emoji.slack.com/party.png', created: 1234567890 },
        { name: 'rocket', url: 'https://emoji.slack.com/rocket.png', created: 1234567891 }
      ]
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ emoji: mockEmojis })
      })

      const result = await fetchSlackEmojis('fake-token', 'fake-cookie')

      expect(global.fetch).toHaveBeenCalledWith('/api/slack-emojis', expect.any(Object))
      expect(result).toEqual(mockEmojis)
    })

    it('should handle fetch errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      await expect(fetchSlackEmojis('bad-token', 'bad-cookie'))
        .rejects
        .toThrow('Failed to fetch emojis: 401 Unauthorized')
    })
  })

  describe('uploadEmoji - Create Operations', () => {
    it('should upload a new emoji', async () => {
      const mockFile = new File(['image-data'], 'newemoji.png', { type: 'image/png' })
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true })
      })

      const result = await uploadEmoji(
        mockFile,
        'newemoji',
        'workspace',
        'token',
        'cookie'
      )

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/slack-emoji-upload',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      )
      expect(result.ok).toBe(true)
    })

    it('should handle duplicate emoji names', async () => {
      const mockFile = new File(['data'], 'emoji.png', { type: 'image/png' })
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ 
          error: 'error_name_taken',
          message: 'An emoji with this name already exists' 
        })
      })

      await expect(uploadEmoji(mockFile, 'existing', 'ws', 'token', 'cookie'))
        .rejects
        .toThrow('error_name_taken')
    })
  })

  describe('deleteEmoji - Delete Operations', () => {
    it('should delete an emoji successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true })
      })

      const result = await deleteEmoji('party', 'workspace', 'token', 'cookie')

      expect(global.fetch).toHaveBeenCalled()
      expect(result.ok).toBe(true)
    })

    it('should handle deletion of non-existent emoji', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          ok: false,
          error: 'emoji_not_found' 
        })
      })

      const result = await deleteEmoji('nonexistent', 'workspace', 'token', 'cookie')

      expect(result.ok).toBe(false)
      expect(result.error).toBe('emoji_not_found')
    })
  })

  describe('createAlias - Update Operations', () => {
    it('should create an alias for an existing emoji', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true })
      })

      const result = await createAlias(
        'newalias',
        'originalemoji',
        'workspace',
        'token',
        'cookie'
      )

      expect(result.ok).toBe(true)
    })

    it('should reject alias with existing name', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          ok: false,
          error: 'error_name_taken' 
        })
      })

      const result = await createAlias(
        'existingname',
        'original',
        'workspace',
        'token',
        'cookie'
      )

      expect(result.ok).toBe(false)
      expect(result.error).toBe('error_name_taken')
    })
  })

  describe('calculateEmojiStats', () => {
    it('should calculate emoji statistics correctly', () => {
      const mockEmojis = [
        { 
          name: 'emoji1', 
          created: Date.now() / 1000 - 86400, // 1 day ago
          user_display_name: 'User A',
          is_alias: 0
        },
        { 
          name: 'emoji2', 
          created: Date.now() / 1000 - 172800, // 2 days ago
          user_display_name: 'User A',
          is_alias: 0
        },
        { 
          name: 'alias1', 
          created: Date.now() / 1000 - 3600, // 1 hour ago
          user_display_name: 'User B',
          is_alias: 1,
          alias_for: 'emoji1'
        }
      ]

      const stats = calculateEmojiStats(mockEmojis as any, Date.now() / 1000)

      expect(stats.totalEmojis).toBe(3)
      expect(stats.totalCustomEmojis).toBe(2) // Excludes aliases
      expect(stats.totalAliases).toBe(1)
      expect(stats.growthRate7Days.count).toBe(3)
      expect(stats.growthRate30Days.count).toBe(3)
    })

    it('should handle empty emoji list', () => {
      const stats = calculateEmojiStats([], Date.now() / 1000)

      expect(stats.totalEmojis).toBe(0)
      expect(stats.totalCustomEmojis).toBe(0)
      expect(stats.totalAliases).toBe(0)
      expect(stats.growthRate7Days.percentage).toBe(0)
    })
  })

  describe('getUserLeaderboard', () => {
    it('should create user leaderboard sorted by emoji count', () => {
      const mockEmojis = [
        { user_display_name: 'Power User', created: Date.now() / 1000 },
        { user_display_name: 'Power User', created: Date.now() / 1000 },
        { user_display_name: 'Power User', created: Date.now() / 1000 },
        { user_display_name: 'Regular User', created: Date.now() / 1000 },
        { user_display_name: 'Regular User', created: Date.now() / 1000 },
        { user_display_name: 'New User', created: Date.now() / 1000 },
      ]

      const leaderboard = getUserLeaderboard(mockEmojis as any, Date.now() / 1000)

      expect(leaderboard[0].name).toBe('Power User')
      expect(leaderboard[0].totalEmojis).toBe(3)
      expect(leaderboard[1].name).toBe('Regular User')
      expect(leaderboard[1].totalEmojis).toBe(2)
      expect(leaderboard[2].name).toBe('New User')
      expect(leaderboard[2].totalEmojis).toBe(1)
    })

    it('should handle users with no display name', () => {
      const mockEmojis = [
        { user_display_name: '', user_id: 'U123', created: Date.now() / 1000 },
        { user_display_name: null, user_id: 'U456', created: Date.now() / 1000 },
      ]

      const leaderboard = getUserLeaderboard(mockEmojis as any, Date.now() / 1000)

      expect(leaderboard[0].name).toBe('Unknown User')
      expect(leaderboard[0].totalEmojis).toBe(2)
    })
  })

  describe('filterEmojisByDate', () => {
    it('should filter emojis by date range', () => {
      const now = Date.now() / 1000
      const mockEmojis = [
        { name: 'old', created: now - 86400 * 10 }, // 10 days ago
        { name: 'recent', created: now - 86400 * 2 }, // 2 days ago
        { name: 'today', created: now - 3600 }, // 1 hour ago
      ]

      // Filter last 7 days
      const recentEmojis = filterEmojisByDate(
        mockEmojis as any,
        new Date((now - 86400 * 7) * 1000),
        new Date(now * 1000)
      )

      expect(recentEmojis).toHaveLength(2)
      expect(recentEmojis.map(e => e.name)).toContain('recent')
      expect(recentEmojis.map(e => e.name)).toContain('today')
      expect(recentEmojis.map(e => e.name)).not.toContain('old')
    })
  })
})