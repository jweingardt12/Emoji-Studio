/**
 * Tests for Emoji Processing Functions
 * 
 * These tests verify that our emoji processing works correctly:
 * - Image resizing
 * - Format conversion
 * - File validation
 */

import { EmojiProcessor } from '@/lib/utils/emoji-processor'

// Mock the global Image object for tests
global.Image = class {
  width = 100
  height = 100
  onload: (() => void) | null = null
  onerror: ((error: any) => void) | null = null
  src = ''

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload()
    }, 0)
  }
} as any

// Mock canvas for image processing
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1
  }))
})) as any

HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
  callback(new Blob(['fake-image-data'], { type: 'image/png' }))
}) as any

describe('EmojiProcessor', () => {
  beforeEach(() => {
    // Clear any previous mocks
    jest.clearAllMocks()
  })

  describe('validateFile', () => {
    it('should accept valid image files', async () => {
      const validFile = new File(['image-content'], 'emoji.png', { type: 'image/png' })
      
      const result = await EmojiProcessor.validateFile(validFile)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject files that are too large', async () => {
      // Create a mock file that's over 10MB
      const largeContent = new Array(11 * 1024 * 1024).join('x')
      const largeFile = new File([largeContent], 'large.png', { type: 'image/png' })
      
      const result = await EmojiProcessor.validateFile(largeFile)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('File size must be under 10MB')
    })

    it('should reject non-image files', async () => {
      const textFile = new File(['text content'], 'document.txt', { type: 'text/plain' })
      
      const result = await EmojiProcessor.validateFile(textFile)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('File must be an image')
    })

    it('should accept GIF files', async () => {
      const gifFile = new File(['gif-content'], 'animated.gif', { type: 'image/gif' })
      
      const result = await EmojiProcessor.validateFile(gifFile)
      
      expect(result.isValid).toBe(true)
    })
  })

  describe('processFile', () => {
    it('should process a valid image file', async () => {
      const file = new File(['image-content'], 'emoji.png', { type: 'image/png' })
      
      const result = await EmojiProcessor.processFile(file)
      
      expect(result.name).toBe('emoji')
      expect(result.type).toBe('static')
      expect(result.originalFile).toBe(file)
      expect(result.processedBlob).toBeDefined()
      expect(result.width).toBe(128)
      expect(result.height).toBe(128)
    })

    it('should sanitize emoji names', async () => {
      const file = new File(['content'], 'My Emoji!@#.png', { type: 'image/png' })
      
      const result = await EmojiProcessor.processFile(file)
      
      // Special characters should be replaced with underscores
      expect(result.name).toBe('my_emoji___')
    })

    it('should handle files without extensions', async () => {
      const file = new File(['content'], 'emoji', { type: 'image/png' })
      
      const result = await EmojiProcessor.processFile(file)
      
      expect(result.name).toBe('emoji')
    })
  })

  describe('processMultipleFiles', () => {
    it('should process multiple files', async () => {
      const files = [
        new File(['content1'], 'emoji1.png', { type: 'image/png' }),
        new File(['content2'], 'emoji2.png', { type: 'image/png' }),
        new File(['content3'], 'emoji3.gif', { type: 'image/gif' })
      ]
      
      const results = []
      const errors = []
      
      for await (const result of EmojiProcessor.processMultipleFiles(files)) {
        if ('error' in result) {
          errors.push(result)
        } else {
          results.push(result)
        }
      }
      
      expect(results).toHaveLength(3)
      expect(errors).toHaveLength(0)
      expect(results[0].emoji.name).toBe('emoji1')
      expect(results[1].emoji.name).toBe('emoji2')
      expect(results[2].emoji.name).toBe('emoji3')
    })

    it('should handle mixed valid and invalid files', async () => {
      const files = [
        new File(['content'], 'valid.png', { type: 'image/png' }),
        new File(['text'], 'invalid.txt', { type: 'text/plain' }),
        new File(['content'], 'another.jpg', { type: 'image/jpeg' })
      ]
      
      const results = []
      const errors = []
      
      for await (const result of EmojiProcessor.processMultipleFiles(files)) {
        if ('error' in result) {
          errors.push(result)
        } else {
          results.push(result)
        }
      }
      
      expect(results).toHaveLength(2)
      expect(errors).toHaveLength(1)
      expect(errors[0].fileName).toBe('invalid.txt')
    })
  })
})