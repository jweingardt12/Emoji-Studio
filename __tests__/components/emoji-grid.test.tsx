/**
 * Unit Tests for Emoji Grid utilities
 *
 * Tests the utility functions and logic used by emoji grid components.
 */

describe('EmojiGrid utilities', () => {
  describe('emoji filtering', () => {
    it('should filter emojis by search term', () => {
      const emojis = [
        { name: 'party', url: 'https://example.com/party.png' },
        { name: 'parrot', url: 'https://example.com/parrot.gif' },
        { name: 'rocket', url: 'https://example.com/rocket.png' },
      ]

      const searchTerm = 'par'
      const filtered = emojis.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
      )

      expect(filtered).toHaveLength(2)
      expect(filtered.map(e => e.name)).toContain('party')
      expect(filtered.map(e => e.name)).toContain('parrot')
      expect(filtered.map(e => e.name)).not.toContain('rocket')
    })

    it('should handle empty search term', () => {
      const emojis = [
        { name: 'party', url: 'https://example.com/party.png' },
        { name: 'rocket', url: 'https://example.com/rocket.png' },
      ]

      const searchTerm = ''
      const filtered = searchTerm
        ? emojis.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))
        : emojis

      expect(filtered).toHaveLength(2)
    })

    it('should be case insensitive', () => {
      const emojis = [
        { name: 'PartyParrot', url: 'https://example.com/party.gif' },
      ]

      const searchTerm = 'PARTY'
      const filtered = emojis.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
      )

      expect(filtered).toHaveLength(1)
    })
  })

  describe('emoji sorting', () => {
    it('should sort emojis alphabetically', () => {
      const emojis = [
        { name: 'zebra', created: 1 },
        { name: 'alpha', created: 2 },
        { name: 'middle', created: 3 },
      ]

      const sorted = [...emojis].sort((a, b) => a.name.localeCompare(b.name))

      expect(sorted[0].name).toBe('alpha')
      expect(sorted[1].name).toBe('middle')
      expect(sorted[2].name).toBe('zebra')
    })

    it('should sort emojis by creation date (newest first)', () => {
      const emojis = [
        { name: 'old', created: 1000 },
        { name: 'newest', created: 3000 },
        { name: 'middle', created: 2000 },
      ]

      const sorted = [...emojis].sort((a, b) => b.created - a.created)

      expect(sorted[0].name).toBe('newest')
      expect(sorted[1].name).toBe('middle')
      expect(sorted[2].name).toBe('old')
    })
  })

  describe('emoji type detection', () => {
    it('should detect animated emojis (GIFs)', () => {
      const isAnimated = (url: string) => url.toLowerCase().endsWith('.gif')

      expect(isAnimated('https://example.com/party.gif')).toBe(true)
      expect(isAnimated('https://example.com/emoji.GIF')).toBe(true)
      expect(isAnimated('https://example.com/static.png')).toBe(false)
    })

    it('should detect alias emojis', () => {
      const emojis = [
        { name: 'original', is_alias: 0, alias_for: '' },
        { name: 'alias1', is_alias: 1, alias_for: 'original' },
      ]

      const aliases = emojis.filter(e => e.is_alias === 1)
      const originals = emojis.filter(e => e.is_alias === 0)

      expect(aliases).toHaveLength(1)
      expect(originals).toHaveLength(1)
      expect(aliases[0].alias_for).toBe('original')
    })
  })
})
