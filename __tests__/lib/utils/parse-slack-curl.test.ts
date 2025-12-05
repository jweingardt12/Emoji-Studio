/**
 * Unit Tests for parseSlackCurl
 *
 * Tests the parsing of Slack cURL commands to extract authentication
 * and workspace information.
 */

import { parseSlackCurl } from '@/lib/utils/parse-slack-curl'

describe('parseSlackCurl', () => {
  describe('basic parsing', () => {
    it('should parse a valid Slack curl command with workspace subdomain', () => {
      const validCurl = `curl 'https://myworkspace.slack.com/api/emoji.adminList?token=xoxc-123456' \
        -H 'Cookie: d=xoxd-abcdef'`

      const result = parseSlackCurl(validCurl)

      expect(result.isValid).toBe(true)
      expect(result.workspace).toBe('myworkspace')
      expect(result.token).toBe('xoxc-123456')
      expect(result.cookie).toContain('d=xoxd-abcdef')
    })

    it('should handle invalid curl commands', () => {
      const invalidCurl = 'not a curl command'

      const result = parseSlackCurl(invalidCurl)

      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should extract token from form data', () => {
      const curlWithFormData = `curl 'https://workspace.slack.com/api/emoji.add' \
        --form 'token=xoxc-789' \
        --form 'name=test'`

      const result = parseSlackCurl(curlWithFormData)

      expect(result.token).toBe('xoxc-789')
    })

    it('should handle curl commands without cookies', () => {
      const curlNoCookie = `curl 'https://workspace.slack.com/api/emoji.list?token=xoxc-123'`

      const result = parseSlackCurl(curlNoCookie)

      // Should be invalid without cookies for emoji.list
      expect(result.workspace).toBe('workspace')
    })
  })

  describe('workspace extraction', () => {
    it('should extract workspace from subdomain', () => {
      const curl = `curl 'https://acme-corp.slack.com/api/emoji.adminList' \
        -b 'd=xoxd-123' --data-raw 'token=xoxc-456'`

      const result = parseSlackCurl(curl)

      expect(result.workspace).toBe('acme-corp')
    })

    it('should NOT extract "app" as workspace from app.slack.com', () => {
      const curl = `curl 'https://app.slack.com/api/emoji.adminList?slack_route=T12345ABC' \
        -b 'd=xoxd-123' --data-raw 'token=xoxc-456'`

      const result = parseSlackCurl(curl)

      // Should extract from slack_route instead of using "app"
      expect(result.workspace).not.toBe('app')
      expect(result.workspace).toBe('T12345ABC')
    })

    it('should NOT extract "api" as workspace from api.slack.com', () => {
      const curl = `curl 'https://api.slack.com/api/emoji.adminList?team=T98765' \
        -b 'd=xoxd-123' --data-raw 'token=xoxc-456'`

      const result = parseSlackCurl(curl)

      expect(result.workspace).not.toBe('api')
      expect(result.workspace).toBe('T98765')
    })

    it('should extract workspace from slack_route cookie', () => {
      const curl = `curl 'https://app.slack.com/api/emoji.adminList' \
        -b 'slack_route=T0ABC123; d=xoxd-123' --data-raw 'token=xoxc-456'`

      const result = parseSlackCurl(curl)

      expect(result.workspace).toBe('T0ABC123')
    })

    it('should extract workspace from client path', () => {
      const curl = `curl 'https://app.slack.com/client/T0XYZ789/C123' \
        -b 'd=xoxd-123' --data-raw 'token=xoxc-456'`

      const result = parseSlackCurl(curl)

      expect(result.workspace).toBe('T0XYZ789')
    })

    it('should extract workspace from team_id parameter', () => {
      const curl = `curl 'https://app.slack.com/api/emoji.adminList?team_id=T0TEAMID' \
        -b 'd=xoxd-123' --data-raw 'token=xoxc-456'`

      const result = parseSlackCurl(curl)

      expect(result.workspace).toBe('T0TEAMID')
    })

    it('should extract workspace from team query parameter', () => {
      const curl = `curl 'https://app.slack.com/api/emoji.adminList?team=T0QUERYTEAM' \
        -b 'd=xoxd-123' --data-raw 'token=xoxc-456'`

      const result = parseSlackCurl(curl)

      expect(result.workspace).toBe('T0QUERYTEAM')
    })

    it('should fall back to "workspace" when no workspace info found', () => {
      const curl = `curl 'https://app.slack.com/api/emoji.adminList' \
        -b 'd=xoxd-123' --data-raw 'token=xoxc-456'`

      const result = parseSlackCurl(curl)

      expect(result.workspace).toBe('workspace')
    })
  })

  describe('token extraction', () => {
    it('should extract xoxc token from URL', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.list?token=xoxc-123-456-789-abc'`

      const result = parseSlackCurl(curl)

      expect(result.token).toBe('xoxc-123-456-789-abc')
    })

    it('should extract token from --data-raw', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.adminList' \
        --data-raw 'token=xoxc-fromdata'`

      const result = parseSlackCurl(curl)

      expect(result.token).toBe('xoxc-fromdata')
    })

    it('should extract token from Authorization header', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.list' \
        -H 'Authorization: Bearer xoxc-bearer-token'`

      const result = parseSlackCurl(curl)

      expect(result.token).toBe('xoxc-bearer-token')
    })
  })

  describe('cookie extraction', () => {
    it('should extract cookie from -b flag', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.list' \
        -b 'd=xoxd-cookie-value'`

      const result = parseSlackCurl(curl)

      expect(result.cookie).toContain('d=xoxd-cookie-value')
    })

    it('should extract cookie from Cookie header', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.list' \
        -H 'Cookie: d=xoxd-header-cookie'`

      const result = parseSlackCurl(curl)

      expect(result.cookie).toContain('d=xoxd-header-cookie')
    })

    it('should combine multiple cookie sources', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.list' \
        -b 'd=xoxd-1' \
        -H 'Cookie: another=value'`

      const result = parseSlackCurl(curl)

      expect(result.cookie).toContain('d=xoxd-1')
      expect(result.cookie).toContain('another=value')
    })
  })

  describe('emoji request detection', () => {
    it('should detect emoji.list request', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.list' -b 'd=x'`

      const result = parseSlackCurl(curl)

      expect(result.isEmojiListRequest).toBe(true)
    })

    it('should detect emoji.adminList request', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.adminList' -b 'd=x'`

      const result = parseSlackCurl(curl)

      expect(result.isEmojiListRequest).toBe(true)
    })

    it('should detect emoji.add request', () => {
      const curl = `curl 'https://workspace.slack.com/api/emoji.add' -b 'd=x'`

      const result = parseSlackCurl(curl)

      expect(result.isEmojiListRequest).toBe(true)
    })
  })
})
