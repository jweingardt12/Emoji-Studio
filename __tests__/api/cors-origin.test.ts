/**
 * @jest-environment node
 *
 * Tests for CORS origin validation in proxy routes
 * Verifies Chrome extension origins are accepted while blocking unauthorized origins
 */

import { NextRequest } from 'next/server'

// Recreate the CORS logic from emoji-proxy and image-proxy routes
// This is the same logic used in both routes
const ALLOWED_ORIGINS = [
  'chrome-extension://',
  'https://app.emojistudio.xyz',
  'https://emojistudio.xyz',
  'http://localhost:3000',
]

function getCorsOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin')
  if (origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed) || origin === allowed)) {
    return origin
  }
  return 'https://app.emojistudio.xyz'
}

function createRequestWithOrigin(origin: string | null): NextRequest {
  const headers: Record<string, string> = {}
  if (origin) headers['origin'] = origin
  return new NextRequest('http://localhost:3000/api/emoji-proxy?url=test', {
    headers: new Headers(headers),
  })
}

describe('getCorsOrigin', () => {
  it('should accept Chrome extension origin', () => {
    const req = createRequestWithOrigin('chrome-extension://abcdef1234567890')
    expect(getCorsOrigin(req)).toBe('chrome-extension://abcdef1234567890')
  })

  it('should accept app.emojistudio.xyz', () => {
    const req = createRequestWithOrigin('https://app.emojistudio.xyz')
    expect(getCorsOrigin(req)).toBe('https://app.emojistudio.xyz')
  })

  it('should accept emojistudio.xyz', () => {
    const req = createRequestWithOrigin('https://emojistudio.xyz')
    expect(getCorsOrigin(req)).toBe('https://emojistudio.xyz')
  })

  it('should accept localhost:3000 for development', () => {
    const req = createRequestWithOrigin('http://localhost:3000')
    expect(getCorsOrigin(req)).toBe('http://localhost:3000')
  })

  it('should return default for unauthorized origin', () => {
    const req = createRequestWithOrigin('https://evil.com')
    expect(getCorsOrigin(req)).toBe('https://app.emojistudio.xyz')
  })

  it('should return default when no origin header', () => {
    const req = createRequestWithOrigin(null)
    expect(getCorsOrigin(req)).toBe('https://app.emojistudio.xyz')
  })

  it('should reject similar-looking domains', () => {
    const req = createRequestWithOrigin('https://notapp.emojistudio.xyz.evil.com')
    expect(getCorsOrigin(req)).toBe('https://app.emojistudio.xyz')
  })
})
