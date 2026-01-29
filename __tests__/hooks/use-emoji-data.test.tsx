/**
 * Unit Tests for useEmojiData Hook and EmojiDataProvider
 *
 * Tests the emoji data context provider and hook functionality.
 */

import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { EmojiDataProvider, useEmojiData } from '@/lib/hooks/use-emoji-data'
import type { Emoji } from '@/lib/services/emoji-service'

// Mock the external dependencies
jest.mock('sonner', () => ({
  toast: {
    warning: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/lib/storage/indexed-db', () => ({
  emojiStorage: {
    loadEmojis: jest.fn(),
    saveEmojis: jest.fn(),
  },
  settingsStorage: {
    loadSetting: jest.fn(),
    saveSetting: jest.fn(),
  },
}))

jest.mock('@/lib/demo-data', () => ({
  generateDemoData: jest.fn(() => Promise.resolve([])),
  generateDemoChartData: jest.fn(() => ({})),
  generateDemoLeaderboard: jest.fn(() => []),
  generateDemoStats: jest.fn(() => ({
    totalEmojis: 100,
    totalCreators: 10,
    mostRecent: 'demo',
    mostRecentTimestamp: Date.now() / 1000,
    emojisPerUser: 10,
    weeklyEmojisChange: 5,
  })),
  loadDemoChartData: jest.fn(() => Promise.resolve({})),
  loadDemoLeaderboard: jest.fn(() => Promise.resolve([])),
  loadDemoStats: jest.fn(() => Promise.resolve(null)),
}))

import { emojiStorage, settingsStorage } from '@/lib/storage/indexed-db'

const mockEmojiStorage = emojiStorage as jest.Mocked<typeof emojiStorage>
const mockSettingsStorage = settingsStorage as jest.Mocked<typeof settingsStorage>

// Test data
const createTestEmoji = (overrides: Partial<Emoji> = {}): Emoji => ({
  name: 'test-emoji',
  is_alias: 0,
  url: 'https://example.com/emoji.png',
  team_id: 'T12345',
  user_id: 'U12345',
  created: Math.floor(Date.now() / 1000),
  is_bad: false,
  user_display_name: 'Test User',
  can_delete: true,
  ...overrides,
})

// Wrapper for providing context
const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EmojiDataProvider>{children}</EmojiDataProvider>
)

describe('useEmojiData hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    mockEmojiStorage.loadEmojis.mockResolvedValue([])
    mockSettingsStorage.loadSetting.mockResolvedValue(null)
  })

  describe('hook usage', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useEmojiData())
      }).toThrow('useEmojiData must be used within an EmojiDataProvider')

      consoleSpy.mockRestore()
    })

    it('should return context values when used within provider', async () => {
      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current).toHaveProperty('emojiData')
      expect(result.current).toHaveProperty('setEmojiData')
      expect(result.current).toHaveProperty('loading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('stats')
      expect(result.current).toHaveProperty('userLeaderboard')
      expect(result.current).toHaveProperty('useDemoData')
      expect(result.current).toHaveProperty('filterByDateRange')
    })
  })

  describe('initial state', () => {
    it('should start with loading true', () => {
      const { result } = renderHook(() => useEmojiData(), { wrapper })

      expect(result.current.loading).toBe(true)
    })

    it('should start with empty emoji data', async () => {
      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.emojiData).toEqual([])
    })

    it('should start with no error', async () => {
      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('loading from storage', () => {
    it('should load emoji data from IndexedDB', async () => {
      const mockEmojis = [
        createTestEmoji({ name: 'emoji-1' }),
        createTestEmoji({ name: 'emoji-2' }),
      ]
      mockEmojiStorage.loadEmojis.mockResolvedValue(mockEmojis)

      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.emojiData).toHaveLength(2)
      expect(result.current.emojiData[0].name).toBe('emoji-1')
    })

    it('should load workspace from settings storage', async () => {
      mockSettingsStorage.loadSetting.mockResolvedValue('test-workspace')

      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.workspace).toBe('test-workspace')
    })

    it('should handle storage errors gracefully', async () => {
      mockEmojiStorage.loadEmojis.mockRejectedValue(new Error('Storage error'))

      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toContain('Storage error')
      expect(result.current.emojiData).toEqual([])
    })
  })

  describe('demo mode', () => {
    it('should detect demo workspace and enable demo mode', async () => {
      mockSettingsStorage.loadSetting.mockResolvedValue('demo-workspace')
      mockEmojiStorage.loadEmojis.mockResolvedValue([createTestEmoji()])

      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.useDemoData).toBe(true)
      expect(result.current.hasRealData).toBe(false)
    })

    it('should allow toggling demo mode', async () => {
      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.setUseDemoData(true)
      })

      expect(result.current.useDemoData).toBe(true)
    })
  })

  describe('setEmojiData', () => {
    it('should update emoji data', async () => {
      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const newEmojis = [createTestEmoji({ name: 'new-emoji' })]

      act(() => {
        result.current.setEmojiData(newEmojis)
      })

      expect(result.current.emojiData).toHaveLength(1)
      expect(result.current.emojiData[0].name).toBe('new-emoji')
    })

    it('should accept a function updater', async () => {
      mockEmojiStorage.loadEmojis.mockResolvedValue([createTestEmoji({ name: 'old' })])

      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.setEmojiData((prev) => [...prev, createTestEmoji({ name: 'new' })])
      })

      expect(result.current.emojiData).toHaveLength(2)
    })
  })

  describe('filterByDateRange', () => {
    it('should filter emojis within date range', async () => {
      const now = Math.floor(Date.now() / 1000)
      const mockEmojis = [
        createTestEmoji({ name: 'old', created: now - 86400 * 30 }), // 30 days ago
        createTestEmoji({ name: 'recent', created: now - 86400 * 5 }), // 5 days ago
        createTestEmoji({ name: 'newest', created: now - 86400 }), // 1 day ago
      ]
      mockEmojiStorage.loadEmojis.mockResolvedValue(mockEmojis)

      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const startDate = new Date(Date.now() - 86400 * 10 * 1000) // 10 days ago
      const endDate = new Date()

      const filtered = result.current.filterByDateRange(startDate, endDate)

      expect(filtered).toHaveLength(2)
      expect(filtered.map((e) => e.name)).toContain('recent')
      expect(filtered.map((e) => e.name)).toContain('newest')
      expect(filtered.map((e) => e.name)).not.toContain('old')
    })
  })

  describe('stats calculation', () => {
    it('should calculate stats from emoji data', async () => {
      const mockEmojis = [
        createTestEmoji({ name: 'emoji-1', user_id: 'U1' }),
        createTestEmoji({ name: 'emoji-2', user_id: 'U1' }),
        createTestEmoji({ name: 'emoji-3', user_id: 'U2' }),
      ]
      mockEmojiStorage.loadEmojis.mockResolvedValue(mockEmojis)

      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.stats).not.toBeNull()
      expect(result.current.stats?.totalEmojis).toBe(3)
      expect(result.current.stats?.totalCreators).toBe(2)
    })

    it('should return null stats for empty data', async () => {
      mockEmojiStorage.loadEmojis.mockResolvedValue([])

      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.stats).toBeNull()
    })
  })

  describe('user leaderboard', () => {
    it('should calculate user leaderboard', async () => {
      const mockEmojis = [
        createTestEmoji({ user_id: 'U1', user_display_name: 'Top User' }),
        createTestEmoji({ user_id: 'U1', user_display_name: 'Top User' }),
        createTestEmoji({ user_id: 'U1', user_display_name: 'Top User' }),
        createTestEmoji({ user_id: 'U2', user_display_name: 'Other User' }),
      ]
      mockEmojiStorage.loadEmojis.mockResolvedValue(mockEmojis)

      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.userLeaderboard).toHaveLength(2)
      expect(result.current.userLeaderboard[0].user_id).toBe('U1')
      expect(result.current.userLeaderboard[0].emoji_count).toBe(3)
    })
  })

  describe('workspace management', () => {
    it('should update workspace', async () => {
      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.setWorkspace('new-workspace')
      })

      expect(result.current.workspace).toBe('new-workspace')
    })

    it('should update workspace display name', async () => {
      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.setWorkspaceDisplayName('My Custom Name')
      })

      expect(result.current.workspaceDisplayName).toBe('My Custom Name')
      expect(localStorage.getItem('workspaceDisplayName')).toBe('My Custom Name')
    })

    it('should clear display name when workspace changes', async () => {
      mockSettingsStorage.loadSetting.mockResolvedValue('initial-workspace')

      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.setWorkspaceDisplayName('Custom Name')
      })

      expect(result.current.workspaceDisplayName).toBe('Custom Name')

      act(() => {
        result.current.setWorkspace('different-workspace')
      })

      expect(result.current.workspaceDisplayName).toBe('')
    })
  })

  describe('event handling', () => {
    it('should handle emojiDataUpdated event', async () => {
      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const newEmojis = [createTestEmoji({ name: 'event-emoji' })]

      act(() => {
        window.dispatchEvent(
          new CustomEvent('emojiDataUpdated', {
            detail: {
              emojiData: newEmojis,
              workspace: 'event-workspace',
              timestamp: Date.now(),
            },
          })
        )
      })

      expect(result.current.emojiData).toHaveLength(1)
      expect(result.current.emojiData[0].name).toBe('event-emoji')
      expect(result.current.workspace).toBe('event-workspace')
    })

    it('should handle localStorageCleared event', async () => {
      mockEmojiStorage.loadEmojis.mockResolvedValue([createTestEmoji()])
      mockSettingsStorage.loadSetting.mockResolvedValue('test-workspace')

      const { result } = renderHook(() => useEmojiData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.emojiData).toHaveLength(1)
      })

      act(() => {
        window.dispatchEvent(new Event('localStorageCleared'))
      })

      expect(result.current.emojiData).toHaveLength(0)
      expect(result.current.workspace).toBe('')
      expect(result.current.hasRealData).toBe(false)
    })
  })
})

describe('EmojiDataProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    mockEmojiStorage.loadEmojis.mockResolvedValue([])
    mockSettingsStorage.loadSetting.mockResolvedValue(null)
  })

  it('should render children', async () => {
    render(
      <EmojiDataProvider>
        <div data-testid="child">Child Content</div>
      </EmojiDataProvider>
    )

    expect(screen.getByTestId('child')).toHaveTextContent('Child Content')
  })

  it('should provide context to nested components', async () => {
    const TestConsumer: React.FC = () => {
      const { emojiData, loading } = useEmojiData()
      return (
        <div>
          <span data-testid="loading">{loading ? 'true' : 'false'}</span>
          <span data-testid="count">{emojiData.length}</span>
        </div>
      )
    }

    render(
      <EmojiDataProvider>
        <TestConsumer />
      </EmojiDataProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })
})
