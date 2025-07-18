/**
 * API Endpoint Tests
 * 
 * These tests verify that our API routes:
 * - Handle requests correctly
 * - Return proper status codes
 * - Validate input data
 * - Handle errors gracefully
 */

import { POST } from '@/app/api/slack-emojis/route'
import { NextRequest } from 'next/server'

// Mock the global fetch
global.fetch = jest.fn()

// Helper to create mock NextRequest
function createMockRequest(body: any): NextRequest {
  return {
    json: async () => body,
    headers: new Headers(),
    method: 'POST',
    url: 'http://localhost:3000/api/slack-emojis'
  } as unknown as NextRequest
}

describe('POST /api/slack-emojis', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should proxy emoji list request to Slack', async () => {
    // Mock Slack API response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({
        ok: true,
        emoji: {
          'happy': 'https://emoji.slack.com/happy.png',
          'sad': 'https://emoji.slack.com/sad.png'
        }
      })
    })

    const request = createMockRequest({
      curlRequest: {
        url: 'https://workspace.slack.com/api/emoji.list',
        method: 'POST',
        headers: {
          'Cookie': 'd=xoxd-test'
        },
        formData: {
          token: 'xoxc-test-token'
        }
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(global.fetch).toHaveBeenCalledWith(
      'https://workspace.slack.com/api/emoji.list',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('token=xoxc-test-token')
      })
    )

    expect(response.status).toBe(200)
    expect(data.emoji).toHaveLength(2)
  })

  it('should handle emoji.remove requests', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ ok: true })
    })

    const request = createMockRequest({
      curlRequest: {
        url: 'https://workspace.slack.com/api/emoji.remove',
        method: 'POST',
        headers: {
          'Cookie': 'd=xoxd-test'
        },
        formData: {
          token: 'xoxc-test-token',
          name: 'emoji-to-delete'
        }
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('should reject non-emoji endpoints', async () => {
    const request = createMockRequest({
      curlRequest: {
        url: 'https://workspace.slack.com/api/users.list',
        method: 'GET'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Only emoji-related endpoints are supported')
  })

  it('should handle missing URL', async () => {
    const request = createMockRequest({
      curlRequest: {
        method: 'POST'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid request: missing URL')
  })

  it('should handle Slack API errors', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({
        ok: false,
        error: 'invalid_auth'
      })
    })

    const request = createMockRequest({
      curlRequest: {
        url: 'https://workspace.slack.com/api/emoji.list',
        method: 'POST',
        formData: {
          token: 'invalid-token'
        }
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('invalid_auth')
  })

  it('should add _x_id parameter if missing', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ ok: true, emoji: {} })
    })

    const request = createMockRequest({
      curlRequest: {
        url: 'https://workspace.slack.com/api/emoji.list',
        method: 'POST',
        formData: { token: 'test' }
      }
    })

    await POST(request)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('_x_id='),
      expect.any(Object)
    )
  })

  it('should handle network errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    )

    const request = createMockRequest({
      curlRequest: {
        url: 'https://workspace.slack.com/api/emoji.list',
        method: 'POST',
        formData: { token: 'test' }
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Network error')
  })

  it('should handle multipart form data', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ ok: true })
    })

    const request = createMockRequest({
      curlRequest: {
        url: 'https://workspace.slack.com/api/emoji.add',
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundary'
        },
        data: '------WebKitFormBoundary\r\nContent-Disposition: form-data'
      }
    })

    const response = await POST(request)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': expect.stringContaining('multipart/form-data')
        })
      })
    )
  })
})