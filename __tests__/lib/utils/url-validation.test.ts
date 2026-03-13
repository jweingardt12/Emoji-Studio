/**
 * Tests for URL validation utilities
 * Covers: validateProxyUrl (SSRF prevention), validateImageProxyUrl, sanitizeErrorResponse, redactSensitive
 */

import {
  validateProxyUrl,
  validateImageProxyUrl,
  sanitizeErrorResponse,
  redactSensitive,
  shouldLogSensitive,
} from '@/lib/utils/url-validation'

describe('validateProxyUrl', () => {
  describe('valid URLs', () => {
    it('should accept valid Slack URL', () => {
      const result = validateProxyUrl('https://slack.com/api/emoji.list')
      expect(result.valid).toBe(true)
    })

    it('should accept slack-edge.com subdomain', () => {
      const result = validateProxyUrl('https://emoji.slack-edge.com/T123/emoji.png')
      expect(result.valid).toBe(true)
    })

    it('should accept a.slack-edge.com', () => {
      const result = validateProxyUrl('https://a.slack-edge.com/image.png')
      expect(result.valid).toBe(true)
    })

    it('should accept files.slack.com', () => {
      const result = validateProxyUrl('https://files.slack.com/files/T123/F456/image.png')
      expect(result.valid).toBe(true)
    })

    it('should accept slackmojis.com', () => {
      const result = validateProxyUrl('https://slackmojis.com/emojis/123/party.gif')
      expect(result.valid).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing URL', () => {
      const result = validateProxyUrl('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject non-string URL', () => {
      const result = validateProxyUrl(null as any)
      expect(result.valid).toBe(false)
    })

    it('should reject invalid URL format', () => {
      const result = validateProxyUrl('not-a-url')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid URL')
    })
  })

  describe('protocol enforcement', () => {
    it('should reject HTTP when requireHttps is true (default)', () => {
      const result = validateProxyUrl('http://slack.com/api/emoji.list')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('HTTPS')
    })

    it('should allow HTTP when requireHttps is false', () => {
      const result = validateProxyUrl('http://slack.com/api/emoji.list', { requireHttps: false })
      expect(result.valid).toBe(true)
    })

    it('should reject ftp protocol', () => {
      const result = validateProxyUrl('ftp://slack.com/file', { requireHttps: false })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('protocol')
    })
  })

  describe('SSRF prevention - private IP blocking', () => {
    it('should block localhost', () => {
      const result = validateProxyUrl('https://localhost/api', { allowedDomains: ['localhost'] })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('private')
    })

    it('should block 127.x.x.x', () => {
      const result = validateProxyUrl('https://127.0.0.1/api', { allowedDomains: ['127.0.0.1'] })
      expect(result.valid).toBe(false)
    })

    it('should block 10.x.x.x', () => {
      const result = validateProxyUrl('https://10.0.0.1/api', { allowedDomains: ['10.0.0.1'] })
      expect(result.valid).toBe(false)
    })

    it('should block 192.168.x.x', () => {
      const result = validateProxyUrl('https://192.168.1.1/api', { allowedDomains: ['192.168.1.1'] })
      expect(result.valid).toBe(false)
    })

    it('should block 172.16-31.x.x', () => {
      const result = validateProxyUrl('https://172.16.0.1/api', { allowedDomains: ['172.16.0.1'] })
      expect(result.valid).toBe(false)
    })

    it('should block 169.254.x.x (AWS metadata)', () => {
      const result = validateProxyUrl('https://169.254.169.254/latest/meta-data', { allowedDomains: ['169.254.169.254'] })
      expect(result.valid).toBe(false)
    })

    it('should block IPv6 localhost [::1]', () => {
      const result = validateProxyUrl('https://[::1]/api', { allowedDomains: ['[::1]'] })
      expect(result.valid).toBe(false)
    })
  })

  describe('domain whitelist', () => {
    it('should reject non-whitelisted domain', () => {
      const result = validateProxyUrl('https://evil.com/steal-data')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not allowed')
    })

    it('should accept subdomain of allowed domain', () => {
      const result = validateProxyUrl('https://api.slack.com/emoji')
      expect(result.valid).toBe(true)
    })

    it('should accept custom allowedDomains', () => {
      const result = validateProxyUrl('https://custom.example.com/api', {
        allowedDomains: ['example.com'],
      })
      expect(result.valid).toBe(true)
    })

    it('should reject domain that only partially matches', () => {
      // "notslack.com" should not match "slack.com"
      const result = validateProxyUrl('https://notslack.com/api')
      expect(result.valid).toBe(false)
    })
  })
})

describe('validateImageProxyUrl', () => {
  it('should accept Slack CDN URL', () => {
    const result = validateImageProxyUrl('https://emoji.slack-edge.com/T123/test/abc.png')
    expect(result.valid).toBe(true)
  })

  it('should accept GitHub raw content', () => {
    const result = validateImageProxyUrl('https://raw.githubusercontent.com/user/repo/main/emoji.png')
    expect(result.valid).toBe(true)
  })

  it('should accept Slackmojis domain', () => {
    const result = validateImageProxyUrl('https://emojis.slackmojis.com/emojis/123/party.gif')
    expect(result.valid).toBe(true)
  })

  it('should reject non-whitelisted domain', () => {
    const result = validateImageProxyUrl('https://evil.com/malware.exe')
    expect(result.valid).toBe(false)
  })

  it('should require HTTPS', () => {
    const result = validateImageProxyUrl('http://emoji.slack-edge.com/test.png')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('HTTPS')
  })
})

describe('sanitizeErrorResponse', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should return full details in development', () => {
    process.env.NODE_ENV = 'development'
    const error = new Error('detailed error')
    error.stack = 'Error: detailed error\n    at test.ts:1'
    const result = sanitizeErrorResponse(error)
    expect(result.message).toBe('detailed error')
    expect(result.details).toBe('detailed error')
    expect(result.stack).toBeDefined()
  })

  it('should return generic message in production', () => {
    process.env.NODE_ENV = 'production'
    const error = new Error('internal secret')
    const result = sanitizeErrorResponse(error, 'Something went wrong')
    expect(result.message).toBe('Something went wrong')
    expect(result.details).toBeUndefined()
    expect(result.stack).toBeUndefined()
  })

  it('should handle non-Error objects in development', () => {
    process.env.NODE_ENV = 'development'
    const result = sanitizeErrorResponse('string error')
    expect(result.message).toBe('string error')
  })

  it('should use default message in production for non-Error', () => {
    process.env.NODE_ENV = 'production'
    const result = sanitizeErrorResponse('string error')
    expect(result.message).toBe('An error occurred')
  })
})

describe('redactSensitive', () => {
  it('should fully redact short values', () => {
    expect(redactSensitive('abc')).toBe('[REDACTED]')
  })

  it('should show first 4 chars of long values', () => {
    expect(redactSensitive('xoxc-12345678')).toBe('xoxc...[REDACTED]')
  })

  it('should handle empty string', () => {
    expect(redactSensitive('')).toBe('[REDACTED]')
  })

  it('should handle exactly 4 chars', () => {
    expect(redactSensitive('abcd')).toBe('[REDACTED]')
  })

  it('should handle 5 chars', () => {
    expect(redactSensitive('abcde')).toBe('abcd...[REDACTED]')
  })
})

describe('shouldLogSensitive', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should return true in development', () => {
    process.env.NODE_ENV = 'development'
    expect(shouldLogSensitive()).toBe(true)
  })

  it('should return false in production', () => {
    process.env.NODE_ENV = 'production'
    expect(shouldLogSensitive()).toBe(false)
  })
})
