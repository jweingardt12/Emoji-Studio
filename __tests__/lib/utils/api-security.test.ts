/**
 * @jest-environment node
 *
 * Tests for API security utilities
 * Covers: RateLimiter, getClientIdentifier, applyRateLimit, verifyAuth, validateRequestBody, sanitizeError
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  rateLimiter,
  getClientIdentifier,
  applyRateLimit,
  verifyAuth,
  validateRequestBody,
  sanitizeError,
} from '@/lib/utils/api-security'

// Helper to create a mock NextRequest
function createMockRequest(options: {
  headers?: Record<string, string>
  cookies?: Record<string, string>
  method?: string
  url?: string
} = {}): NextRequest {
  const { headers = {}, cookies = {}, method = 'GET', url = 'http://localhost:3000/api/test' } = options
  const req = new NextRequest(url, {
    method,
    headers: new Headers(headers),
  })
  // Set cookies on the request
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value)
  }
  return req
}

describe('RateLimiter', () => {
  // Use a fresh limiter for each test to avoid shared state
  // We can't import the class directly (not exported), so we test via applyRateLimit
  // But rateLimiter is exported as a singleton — we'll test its behavior

  it('should allow first request', async () => {
    // Create a fresh limiter by using applyRateLimit with a unique IP
    const uniqueIp = `test-${Date.now()}-${Math.random()}`
    const req = createMockRequest({ headers: { 'x-forwarded-for': uniqueIp } })
    const result = await applyRateLimit(req)
    expect(result).toBeNull() // null means allowed
  })

  it('should allow requests up to the limit', async () => {
    const uniqueIp = `ratelimit-test-${Date.now()}`
    for (let i = 0; i < 60; i++) {
      const req = createMockRequest({ headers: { 'x-forwarded-for': uniqueIp } })
      const result = await applyRateLimit(req)
      expect(result).toBeNull()
    }
  })

  it('should reject requests over the limit', async () => {
    const uniqueIp = `ratelimit-over-${Date.now()}`
    // Fill up the rate limit
    for (let i = 0; i < 60; i++) {
      const req = createMockRequest({ headers: { 'x-forwarded-for': uniqueIp } })
      await applyRateLimit(req)
    }
    // 61st request should be rejected
    const req = createMockRequest({ headers: { 'x-forwarded-for': uniqueIp } })
    const result = await applyRateLimit(req)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(429)
  })

  it('should return correct rate limit headers when rejected', async () => {
    const uniqueIp = `headers-test-${Date.now()}`
    for (let i = 0; i < 60; i++) {
      const req = createMockRequest({ headers: { 'x-forwarded-for': uniqueIp } })
      await applyRateLimit(req)
    }
    const req = createMockRequest({ headers: { 'x-forwarded-for': uniqueIp } })
    const result = await applyRateLimit(req)
    expect(result!.headers.get('X-RateLimit-Limit')).toBe('60')
    expect(result!.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(result!.headers.get('X-RateLimit-Reset')).toBeTruthy()
    expect(result!.headers.get('Retry-After')).toBeTruthy()
  })

  it('should track different identifiers independently', async () => {
    const ip1 = `independent-1-${Date.now()}`
    const ip2 = `independent-2-${Date.now()}`
    // Fill up ip1
    for (let i = 0; i < 60; i++) {
      const req = createMockRequest({ headers: { 'x-forwarded-for': ip1 } })
      await applyRateLimit(req)
    }
    // ip2 should still be allowed
    const req = createMockRequest({ headers: { 'x-forwarded-for': ip2 } })
    const result = await applyRateLimit(req)
    expect(result).toBeNull()
  })
})

describe('getClientIdentifier', () => {
  it('should return first IP from x-forwarded-for', () => {
    const req = createMockRequest({ headers: { 'x-forwarded-for': '1.2.3.4,5.6.7.8' } })
    expect(getClientIdentifier(req)).toBe('1.2.3.4')
  })

  it('should return single x-forwarded-for IP', () => {
    const req = createMockRequest({ headers: { 'x-forwarded-for': '1.2.3.4' } })
    expect(getClientIdentifier(req)).toBe('1.2.3.4')
  })

  it('should fall back to x-real-ip', () => {
    const req = createMockRequest({ headers: { 'x-real-ip': '9.8.7.6' } })
    expect(getClientIdentifier(req)).toBe('9.8.7.6')
  })

  it('should return "unknown" when no headers present', () => {
    const req = createMockRequest()
    expect(getClientIdentifier(req)).toBe('unknown')
  })

  it('should prefer x-forwarded-for over x-real-ip', () => {
    const req = createMockRequest({
      headers: { 'x-forwarded-for': '1.1.1.1', 'x-real-ip': '2.2.2.2' }
    })
    expect(getClientIdentifier(req)).toBe('1.1.1.1')
  })
})

describe('verifyAuth', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should authorize with valid API key', async () => {
    process.env.API_KEY = 'test-api-key-123'
    const req = createMockRequest({ headers: { 'x-api-key': 'test-api-key-123' } })
    const result = await verifyAuth(req)
    expect(result.authorized).toBe(true)
    expect(result.userId).toBe('api')
  })

  it('should reject with invalid API key', async () => {
    process.env.API_KEY = 'correct-key'
    const req = createMockRequest({ headers: { 'x-api-key': 'wrong-key' } })
    const result = await verifyAuth(req)
    expect(result.authorized).toBe(false)
  })

  it('should not authorize when API_KEY env var is missing', async () => {
    delete process.env.API_KEY
    const req = createMockRequest({ headers: { 'x-api-key': 'any-key' } })
    const result = await verifyAuth(req)
    // Should not authorize via API key path when env var not set
    expect(result.authorized).toBe(false)
  })

  it('should authorize with valid Bearer token', async () => {
    process.env.BEARER_TOKEN = 'my-bearer-token'
    const req = createMockRequest({ headers: { authorization: 'Bearer my-bearer-token' } })
    const result = await verifyAuth(req)
    expect(result.authorized).toBe(true)
    expect(result.userId).toBe('bearer')
  })

  it('should reject with invalid Bearer token', async () => {
    process.env.BEARER_TOKEN = 'correct-token'
    const req = createMockRequest({ headers: { authorization: 'Bearer wrong-token' } })
    const result = await verifyAuth(req)
    expect(result.authorized).toBe(false)
  })

  it('should authorize with session cookie', async () => {
    const req = createMockRequest({ cookies: { session: 'any-session-value' } })
    const result = await verifyAuth(req)
    expect(result.authorized).toBe(true)
    expect(result.userId).toBe('session')
  })

  it('should return 401 with WWW-Authenticate header when unauthorized', async () => {
    delete process.env.API_KEY
    delete process.env.BEARER_TOKEN
    const req = createMockRequest()
    const result = await verifyAuth(req)
    expect(result.authorized).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error!.status).toBe(401)
    expect(result.error!.headers.get('WWW-Authenticate')).toBe('Bearer')
  })
})

describe('validateRequestBody', () => {
  const testSchema = z.object({
    name: z.string(),
    age: z.number(),
  })

  it('should return data for valid input', () => {
    const result = validateRequestBody({ name: 'Alice', age: 30 }, testSchema)
    expect(result.data).toEqual({ name: 'Alice', age: 30 })
    expect(result.error).toBeUndefined()
  })

  it('should return error for invalid input', () => {
    const result = validateRequestBody({ name: 123 }, testSchema)
    expect(result.data).toBeUndefined()
    expect(result.error).toBeDefined()
    expect(result.error!.status).toBe(400)
  })

  it('should include error details with path and message', async () => {
    const result = validateRequestBody({ name: 123, age: 'not-a-number' }, testSchema)
    const body = await result.error!.json()
    expect(body.error).toBe('Invalid request body')
    expect(Array.isArray(body.details)).toBe(true)
    expect(body.details.length).toBeGreaterThan(0)
    expect(body.details[0]).toHaveProperty('path')
    expect(body.details[0]).toHaveProperty('message')
  })
})

describe('sanitizeError', () => {
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
    const error = new Error('test error')
    const result = sanitizeError(error)
    expect(result.message).toBe('test error')
    expect(result.details).toBeDefined()
    expect(result.details.stack).toBeDefined()
    expect(result.details.name).toBe('Error')
  })

  it('should return generic message in production', () => {
    process.env.NODE_ENV = 'production'
    const error = new Error('sensitive internal error')
    const result = sanitizeError(error)
    expect(result.message).toBe('An error occurred processing your request')
    expect(result.details).toBeUndefined()
  })

  it('should log error in production', () => {
    process.env.NODE_ENV = 'production'
    const error = new Error('log me')
    sanitizeError(error)
    expect(console.error).toHaveBeenCalledWith('API Error:', error)
  })

  it('should handle non-Error objects in development', () => {
    process.env.NODE_ENV = 'development'
    const result = sanitizeError('string error')
    expect(result.message).toBe('string error')
  })

  it('should handle non-Error objects in production', () => {
    process.env.NODE_ENV = 'production'
    const result = sanitizeError('string error')
    expect(result.message).toBe('An unexpected error occurred')
  })
})
