/**
 * Component Tests - Testing User Interface
 * 
 * These tests verify that UI components:
 * - Render correctly
 * - Handle user interactions
 * - Display data properly
 * - Show error states appropriately
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmojiGrid } from '@/components/emoji-grid'

// Mock data for testing
const mockEmojis = [
  {
    name: 'happy',
    url: 'https://emoji.slack.com/happy.png',
    created: 1234567890,
    user_display_name: 'Test User',
    is_alias: 0
  },
  {
    name: 'sad',
    url: 'https://emoji.slack.com/sad.png',
    created: 1234567891,
    user_display_name: 'Test User',
    is_alias: 0
  },
  {
    name: 'smile',
    url: 'https://emoji.slack.com/smile.png',
    created: 1234567892,
    user_display_name: 'Another User',
    is_alias: 1,
    alias_for: 'happy'
  }
]

describe('EmojiGrid Component', () => {
  it('should render emoji grid with emojis', () => {
    // Render the component
    render(<EmojiGrid emojis={mockEmojis} />)
    
    // Check if emojis are displayed
    expect(screen.getByAltText('happy')).toBeInTheDocument()
    expect(screen.getByAltText('sad')).toBeInTheDocument()
    expect(screen.getByAltText('smile')).toBeInTheDocument()
  })

  it('should show empty state when no emojis', () => {
    render(<EmojiGrid emojis={[]} />)
    
    expect(screen.getByText(/no emojis found/i)).toBeInTheDocument()
  })

  it('should handle emoji click', async () => {
    const handleClick = jest.fn()
    
    render(
      <EmojiGrid 
        emojis={mockEmojis} 
        onEmojiClick={handleClick}
      />
    )
    
    // Click on an emoji
    const happyEmoji = screen.getByAltText('happy')
    await userEvent.click(happyEmoji)
    
    // Check if click handler was called with correct emoji
    expect(handleClick).toHaveBeenCalledWith(mockEmojis[0])
  })

  it('should filter emojis by search term', async () => {
    render(
      <EmojiGrid 
        emojis={mockEmojis} 
        showSearch={true}
      />
    )
    
    // Find search input
    const searchInput = screen.getByPlaceholderText(/search emojis/i)
    
    // Type in search
    await userEvent.type(searchInput, 'happy')
    
    // Should show matching emoji
    expect(screen.getByAltText('happy')).toBeInTheDocument()
    
    // Should hide non-matching emojis
    expect(screen.queryByAltText('sad')).not.toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<EmojiGrid emojis={[]} loading={true} />)
    
    // Check for loading indicators (skeletons)
    const skeletons = screen.getAllByTestId('emoji-skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should handle emoji hover for preview', async () => {
    render(<EmojiGrid emojis={mockEmojis} showPreview={true} />)
    
    const happyEmoji = screen.getByAltText('happy')
    
    // Hover over emoji
    fireEvent.mouseEnter(happyEmoji)
    
    // Wait for preview to appear
    await waitFor(() => {
      expect(screen.getByText('happy')).toBeInTheDocument()
      expect(screen.getByText('Created by: Test User')).toBeInTheDocument()
    })
  })

  it('should sort emojis by different criteria', async () => {
    render(
      <EmojiGrid 
        emojis={mockEmojis} 
        showSort={true}
      />
    )
    
    // Find sort dropdown
    const sortButton = screen.getByText(/sort by/i)
    await userEvent.click(sortButton)
    
    // Select "Name (A-Z)"
    const nameSort = screen.getByText(/name \(a-z\)/i)
    await userEvent.click(nameSort)
    
    // Check if emojis are sorted alphabetically
    const emojiNames = screen.getAllByRole('img').map(img => img.getAttribute('alt'))
    expect(emojiNames).toEqual(['happy', 'sad', 'smile'])
  })

  it('should handle batch selection', async () => {
    const handleBatchSelect = jest.fn()
    
    render(
      <EmojiGrid 
        emojis={mockEmojis} 
        allowBatchSelect={true}
        onBatchSelect={handleBatchSelect}
      />
    )
    
    // Select multiple emojis
    const checkboxes = screen.getAllByRole('checkbox')
    await userEvent.click(checkboxes[0]) // Select first emoji
    await userEvent.click(checkboxes[1]) // Select second emoji
    
    // Click batch action button
    const batchButton = screen.getByText(/selected \(2\)/i)
    await userEvent.click(batchButton)
    
    // Check if handler was called with selected emojis
    expect(handleBatchSelect).toHaveBeenCalledWith([mockEmojis[0], mockEmojis[1]])
  })

  it('should display alias indicator', () => {
    render(<EmojiGrid emojis={mockEmojis} />)
    
    // Find the alias emoji
    const aliasEmoji = screen.getByAltText('smile')
    const aliasContainer = aliasEmoji.closest('[data-testid="emoji-item"]')
    
    // Check for alias indicator
    expect(aliasContainer).toHaveTextContent('Alias of: happy')
  })

  it('should handle error state', () => {
    render(
      <EmojiGrid 
        emojis={[]} 
        error="Failed to load emojis. Please try again."
      />
    )
    
    expect(screen.getByText(/failed to load emojis/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})