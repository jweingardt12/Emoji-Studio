/**
 * Unit Tests for Image Proxy Utilities
 *
 * Tests the image URL utilities including validation and proxying.
 */

import { proxyImageUrl, hasValidUrl, EMOJI_PLACEHOLDER } from '@/lib/utils/image-proxy'

describe('EMOJI_PLACEHOLDER', () => {
  it('should be a valid placeholder URL', () => {
    expect(EMOJI_PLACEHOLDER).toBe('/placeholder.svg?height=128&width=128&text=emoji')
  })
})

describe('proxyImageUrl', () => {
  describe('invalid URLs', () => {
    it('should return placeholder for undefined URL', () => {
      const result = proxyImageUrl(undefined as any)

      expect(result).toBe(EMOJI_PLACEHOLDER)
    })

    it('should return placeholder for null URL', () => {
      const result = proxyImageUrl(null as any)

      expect(result).toBe(EMOJI_PLACEHOLDER)
    })

    it('should return placeholder for empty string', () => {
      const result = proxyImageUrl('')

      expect(result).toBe(EMOJI_PLACEHOLDER)
    })

    it('should return placeholder for whitespace-only string', () => {
      const result = proxyImageUrl('   ')

      expect(result).toBe(EMOJI_PLACEHOLDER)
    })

    it('should return placeholder for non-string input', () => {
      const result = proxyImageUrl(123 as any)

      expect(result).toBe(EMOJI_PLACEHOLDER)
    })
  })

  describe('already proxied URLs', () => {
    it('should return as-is for URLs already proxied', () => {
      const proxiedUrl = '/api/emoji-proxy?url=https%3A%2F%2Fexample.com%2Ftest.png'

      const result = proxyImageUrl(proxiedUrl)

      expect(result).toBe(proxiedUrl)
    })

    it('should return as-is for placeholder URLs', () => {
      const placeholderUrl = '/placeholder.svg?height=128&width=128&text=test'

      const result = proxyImageUrl(placeholderUrl)

      expect(result).toBe(placeholderUrl)
    })
  })

  describe('external URLs', () => {
    it('should proxy external image URLs', () => {
      const externalUrl = 'https://emoji.slack-edge.com/T12345/party/abc.png'

      const result = proxyImageUrl(externalUrl)

      expect(result).toBe(`/api/emoji-proxy?url=${encodeURIComponent(externalUrl)}`)
    })

    it('should properly encode special characters in URL', () => {
      const urlWithSpecialChars = 'https://example.com/emoji name.png'

      const result = proxyImageUrl(urlWithSpecialChars)

      expect(result).toContain('/api/emoji-proxy?url=')
      expect(result).toContain(encodeURIComponent(urlWithSpecialChars))
    })

    it('should handle URLs with query parameters', () => {
      const urlWithParams = 'https://example.com/image.png?size=128&format=webp'

      const result = proxyImageUrl(urlWithParams)

      expect(result).toContain('/api/emoji-proxy?url=')
      expect(result).toContain(encodeURIComponent(urlWithParams))
    })

    it('should handle GIF URLs', () => {
      const gifUrl = 'https://emoji.slack-edge.com/T12345/parrot/abc.gif'

      const result = proxyImageUrl(gifUrl)

      expect(result).toBe(`/api/emoji-proxy?url=${encodeURIComponent(gifUrl)}`)
    })
  })

  describe('local URLs', () => {
    it('should NOT proxy local API proxy URLs', () => {
      const localProxy = '/api/emoji-proxy?url=something'

      const result = proxyImageUrl(localProxy)

      expect(result).toBe(localProxy)
    })

    it('should NOT proxy placeholder SVG URLs', () => {
      const placeholder = '/placeholder.svg?anything=here'

      const result = proxyImageUrl(placeholder)

      expect(result).toBe(placeholder)
    })
  })
})

describe('hasValidUrl', () => {
  describe('valid URLs', () => {
    it('should return true for emoji with valid URL', () => {
      const emoji = { url: 'https://emoji.slack-edge.com/test.png' }

      const result = hasValidUrl(emoji)

      expect(result).toBe(true)
    })

    it('should return true for GIF URLs', () => {
      const emoji = { url: 'https://emoji.slack-edge.com/test.gif' }

      const result = hasValidUrl(emoji)

      expect(result).toBe(true)
    })

    it('should return true for URLs with query params', () => {
      const emoji = { url: 'https://example.com/image.png?size=128' }

      const result = hasValidUrl(emoji)

      expect(result).toBe(true)
    })
  })

  describe('invalid URLs', () => {
    it('should return false for null emoji', () => {
      const result = hasValidUrl(null)

      expect(result).toBe(false)
    })

    it('should return false for undefined emoji', () => {
      const result = hasValidUrl(undefined)

      expect(result).toBe(false)
    })

    it('should return false for emoji without url property', () => {
      const emoji = { name: 'test' }

      const result = hasValidUrl(emoji)

      expect(result).toBe(false)
    })

    it('should return false for emoji with undefined url', () => {
      const emoji = { url: undefined }

      const result = hasValidUrl(emoji)

      expect(result).toBe(false)
    })

    it('should return false for emoji with empty url', () => {
      const emoji = { url: '' }

      const result = hasValidUrl(emoji)

      expect(result).toBe(false)
    })

    it('should return false for emoji with whitespace-only url', () => {
      const emoji = { url: '   ' }

      const result = hasValidUrl(emoji)

      expect(result).toBe(false)
    })

    it('should return false for emoji with non-string url', () => {
      const emoji = { url: 123 }

      const result = hasValidUrl(emoji as any)

      expect(result).toBe(false)
    })

    it('should return false for emoji with null url', () => {
      const emoji = { url: null }

      const result = hasValidUrl(emoji as any)

      expect(result).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle emoji objects with other properties', () => {
      const emoji = {
        name: 'party',
        url: 'https://example.com/party.png',
        is_alias: 0,
        created: 1234567890,
      }

      const result = hasValidUrl(emoji)

      expect(result).toBe(true)
    })

    it('should handle minimal URL string', () => {
      const emoji = { url: 'x' }

      const result = hasValidUrl(emoji)

      expect(result).toBe(true)
    })
  })
})
