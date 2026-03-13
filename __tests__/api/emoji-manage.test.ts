/**
 * Tests for emoji name validation in the emoji-manage API route
 * Tests the isValidEmojiName function that prevents injection attacks
 */

import { isValidEmojiName } from '@/lib/utils/emoji-validation'

describe('isValidEmojiName', () => {
  describe('valid names', () => {
    it('should accept simple name', () => {
      expect(isValidEmojiName('hello')).toBe(true)
    })

    it('should accept name with hyphens', () => {
      expect(isValidEmojiName('hello-world')).toBe(true)
    })

    it('should accept name with underscores', () => {
      expect(isValidEmojiName('hello_world')).toBe(true)
    })

    it('should accept uppercase letters', () => {
      expect(isValidEmojiName('ABC123')).toBe(true)
    })

    it('should accept single character', () => {
      expect(isValidEmojiName('a')).toBe(true)
    })

    it('should accept 100-character name', () => {
      expect(isValidEmojiName('a'.repeat(100))).toBe(true)
    })

    it('should accept typical Slack emoji names', () => {
      expect(isValidEmojiName('party-parrot')).toBe(true)
      expect(isValidEmojiName('thumbs_up')).toBe(true)
      expect(isValidEmojiName('rolling-on-the-floor-laughing')).toBe(true)
      expect(isValidEmojiName('100')).toBe(true)
    })
  })

  describe('invalid names', () => {
    it('should reject empty string', () => {
      expect(isValidEmojiName('')).toBe(false)
    })

    it('should reject name over 100 characters', () => {
      expect(isValidEmojiName('a'.repeat(101))).toBe(false)
    })

    it('should reject name with spaces', () => {
      expect(isValidEmojiName('hello world')).toBe(false)
    })

    it('should reject script injection', () => {
      expect(isValidEmojiName('hello<script>')).toBe(false)
    })

    it('should reject colons (Slack emoji syntax)', () => {
      expect(isValidEmojiName(':emoji:')).toBe(false)
    })

    it('should reject path traversal', () => {
      expect(isValidEmojiName('../path')).toBe(false)
    })

    it('should reject special characters', () => {
      expect(isValidEmojiName('emoji@work')).toBe(false)
      expect(isValidEmojiName('emoji!wow')).toBe(false)
      expect(isValidEmojiName('emoji&more')).toBe(false)
    })

    it('should reject non-string input', () => {
      expect(isValidEmojiName(undefined as any)).toBe(false)
      expect(isValidEmojiName(null as any)).toBe(false)
      expect(isValidEmojiName(123 as any)).toBe(false)
    })
  })
})
