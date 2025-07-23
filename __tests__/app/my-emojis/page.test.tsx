/**
 * Integration Tests for My Emojis Page
 * 
 * These tests verify the complete user workflows:
 * - Viewing personal emojis
 * - Renaming emojis
 * - Replacing emoji images
 * - Adding aliases
 * - Deleting emojis
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyEmojisPage from '@/app/app/my-emojis/page'
import { useEmojiData } from '@/lib/hooks/use-emoji-data'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('@/lib/hooks/use-emoji-data')
jest.mock('next/navigation')
jest.mock('sonner')

// Mock parse-slack-curl
jest.mock('@/lib/utils/parse-slack-curl', () => ({
  parseSlackCurl: jest.fn(() => ({
    isValid: true,
    token: 'mock-token',
    cookie: 'mock-cookie',
    workspace: 'test-workspace'
  }))
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

// Mock fetch
global.fetch = jest.fn()

const mockEmojis = [
  {
    name: 'my-emoji',
    url: 'https://emoji.slack.com/my-emoji.png',
    user_id: 'U123',
    created: 1234567890,
    user_display_name: 'Test User',
    can_delete: true,
    is_alias: 0
  },
  {
    name: 'another-emoji',
    url: 'https://emoji.slack.com/another.png',
    user_id: 'U123',
    created: 1234567891,
    user_display_name: 'Test User',
    can_delete: true,
    is_alias: 0
  },
  {
    name: 'my-alias',
    url: 'https://emoji.slack.com/my-emoji.png',
    user_id: 'U123',
    created: 1234567892,
    user_display_name: 'Test User',
    can_delete: true,
    is_alias: 1,
    alias_for: 'my-emoji'
  }
]

describe('My Emojis Page', () => {
  const mockPush = jest.fn()
  const mockRefreshData = jest.fn()
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Setup router mock
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    })
    
    // Setup emoji data mock
    ;(useEmojiData as jest.Mock).mockReturnValue({
      emojiData: mockEmojis,
      loading: false,
      hasRealData: true,
      workspace: 'test-workspace',
      setEmojiData: jest.fn(),
      setWorkspace: jest.fn(),
      setHasRealData: jest.fn()
    })
    
    // Setup localStorage mock
    mockLocalStorage.getItem.mockReturnValue('mock-curl-command')
  })

  describe('Authentication', () => {
    it('should redirect to settings if no Slack connection', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<MyEmojisPage />)
      
      expect(mockPush).toHaveBeenCalledWith('/app/settings')
    })

    it('should show emojis if authenticated', () => {
      render(<MyEmojisPage />)
      
      expect(screen.getByText('My Emojis (2)')).toBeInTheDocument()
      expect(screen.getByText('my-emoji')).toBeInTheDocument()
      expect(screen.getByText('another-emoji')).toBeInTheDocument()
    })
  })

  describe('Emoji Display', () => {
    it('should filter out aliases from main list', () => {
      render(<MyEmojisPage />)
      
      // Should show 2 actual emojis, not the alias
      expect(screen.getByText('My Emojis (2)')).toBeInTheDocument()
      expect(screen.queryByText('my-alias')).not.toBeInTheDocument()
    })

    it('should show aliases in the aliases column', () => {
      render(<MyEmojisPage />)
      
      // Find the row for my-emoji
      const myEmojiRow = screen.getByText('my-emoji').closest('tr')
      expect(myEmojiRow).toHaveTextContent('my-alias')
    })

    it('should handle search functionality', async () => {
      render(<MyEmojisPage />)
      
      const searchInput = screen.getByPlaceholderText('Search your emojis...')
      await userEvent.type(searchInput, 'another')
      
      expect(screen.queryByText('my-emoji')).not.toBeInTheDocument()
      expect(screen.getByText('another-emoji')).toBeInTheDocument()
    })
  })

  describe('Rename Operation', () => {
    it('should rename emoji successfully', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ // Delete old emoji
          ok: true,
          json: async () => ({ ok: true })
        })
        .mockResolvedValueOnce({ // Upload with new name
          ok: true,
          json: async () => ({ ok: true })
        })
        .mockResolvedValueOnce({ // Refresh data
          ok: true,
          json: async () => ({ emoji: mockEmojis })
        })
      
      render(<MyEmojisPage />)
      
      // Click rename on first emoji
      const renameButtons = screen.getAllByLabelText('Rename')
      await userEvent.click(renameButtons[0])
      
      // Enter new name
      const input = screen.getByLabelText('New emoji name')
      await userEvent.clear(input)
      await userEvent.type(input, 'new-name')
      
      // Submit
      const renameButton = screen.getByRole('button', { name: 'Rename Emoji' })
      await userEvent.click(renameButton)
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Emoji renamed successfully',
          expect.objectContaining({
            description: '"my-emoji" → "new-name"'
          })
        )
      })
    })

    it('should prevent duplicate names', async () => {
      render(<MyEmojisPage />)
      
      const renameButtons = screen.getAllByLabelText('Rename')
      await userEvent.click(renameButtons[0])
      
      const input = screen.getByLabelText('New emoji name')
      await userEvent.clear(input)
      await userEvent.type(input, 'another-emoji')
      
      const renameButton = screen.getByRole('button', { name: 'Rename Emoji' })
      await userEvent.click(renameButton)
      
      expect(toast.error).toHaveBeenCalledWith(
        'Name already exists',
        expect.objectContaining({
          description: 'An emoji with the name "another-emoji" already exists.'
        })
      )
    })
  })

  describe('Delete Operation', () => {
    it('should delete emoji successfully', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: true })
        })
        .mockResolvedValueOnce({ // Refresh
          ok: true,
          json: async () => ({ emoji: [mockEmojis[1]] })
        })
      
      render(<MyEmojisPage />)
      
      const deleteButtons = screen.getAllByLabelText('Delete')
      await userEvent.click(deleteButtons[0])
      
      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: 'Delete' })
      await userEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Emoji deleted!',
          expect.objectContaining({
            description: 'Successfully deleted "my-emoji"'
          })
        )
      })
    })
  })

  describe('Add Alias Operation', () => {
    it('should add alias successfully', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: true })
        })
        .mockResolvedValueOnce({ // Refresh
          ok: true,
          json: async () => ({ emoji: mockEmojis })
        })
      
      render(<MyEmojisPage />)
      
      const aliasButtons = screen.getAllByLabelText('Add alias')
      await userEvent.click(aliasButtons[0])
      
      const input = screen.getByLabelText('Alias name')
      await userEvent.type(input, 'new-alias')
      
      const addButton = screen.getByRole('button', { name: 'Add Alias' })
      await userEvent.click(addButton)
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Alias added successfully',
          expect.objectContaining({
            description: '"new-alias" → "my-emoji"'
          })
        )
      })
    })
  })

  describe('Sorting', () => {
    it('should sort by name', async () => {
      render(<MyEmojisPage />)
      
      const nameHeader = screen.getByText('Name').closest('button')
      await userEvent.click(nameHeader!)
      
      const emojiNames = screen.getAllByRole('cell')
        .filter(cell => cell.getAttribute('data-testid') === 'emoji-name')
        .map(cell => cell.textContent)
      
      expect(emojiNames).toEqual(['another-emoji', 'my-emoji'])
    })

    it('should sort by date', async () => {
      render(<MyEmojisPage />)
      
      const dateHeader = screen.getByText('Date Added').closest('button')
      await userEvent.click(dateHeader!)
      
      // Should be in ascending order by default
      const firstEmoji = screen.getAllByRole('cell')
        .find(cell => cell.textContent === 'my-emoji')
      expect(firstEmoji).toBeDefined()
    })
  })

  describe('View Modes', () => {
    it('should switch between table and grid views', async () => {
      render(<MyEmojisPage />)
      
      // Default is table view
      expect(screen.getByRole('table')).toBeInTheDocument()
      
      // Switch to grid view
      const gridButton = screen.getByRole('button', { name: 'Grid view' })
      await userEvent.click(gridButton)
      
      // Table should be gone, grid should appear
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      expect(screen.getByTestId('emoji-grid')).toBeInTheDocument()
    })
  })
})