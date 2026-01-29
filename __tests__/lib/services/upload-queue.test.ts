/**
 * Unit Tests for Upload Queue Manager
 *
 * Tests the upload queue functionality focusing on the public API.
 */

import type { UploadProgress } from '@/lib/types/emoji-pack'

describe('UploadQueueManager', () => {
  // We test the class behavior by importing and testing directly
  // without complex singleton management

  describe('getProgress', () => {
    it('should return progress with expected properties', async () => {
      const { uploadQueue } = await import('@/lib/services/upload-queue')
      const progress = uploadQueue.getProgress()

      expect(progress).toHaveProperty('active')
      expect(progress).toHaveProperty('total')
      expect(progress).toHaveProperty('completed')
      expect(progress).toHaveProperty('failed')
      expect(progress).toHaveProperty('ratelimited')
      expect(progress).toHaveProperty('progress')
      expect(typeof progress.active).toBe('boolean')
      expect(typeof progress.total).toBe('number')
      expect(typeof progress.completed).toBe('number')
      expect(typeof progress.failed).toBe('number')
      expect(typeof progress.ratelimited).toBe('number')
      expect(typeof progress.progress).toBe('number')
    })

    it('should return a copy of progress (not reference)', async () => {
      const { uploadQueue } = await import('@/lib/services/upload-queue')
      const progress1 = uploadQueue.getProgress()
      const progress2 = uploadQueue.getProgress()

      progress1.completed = 999

      expect(progress2.completed).not.toBe(999)
    })
  })

  describe('onProgress', () => {
    it('should return an unsubscribe function', async () => {
      const { uploadQueue } = await import('@/lib/services/upload-queue')
      const callback = jest.fn()
      const unsubscribe = uploadQueue.onProgress(callback)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should allow multiple listeners', async () => {
      const { uploadQueue } = await import('@/lib/services/upload-queue')
      const callback1 = jest.fn()
      const callback2 = jest.fn()

      const unsubscribe1 = uploadQueue.onProgress(callback1)
      const unsubscribe2 = uploadQueue.onProgress(callback2)

      // Both should be valid unsubscribe functions
      expect(typeof unsubscribe1).toBe('function')
      expect(typeof unsubscribe2).toBe('function')

      // Clean up
      unsubscribe1()
      unsubscribe2()
    })
  })

  describe('cancel', () => {
    it('should be callable without error', async () => {
      const { uploadQueue } = await import('@/lib/services/upload-queue')

      expect(() => uploadQueue.cancel()).not.toThrow()
    })

    it('should be callable multiple times', async () => {
      const { uploadQueue } = await import('@/lib/services/upload-queue')

      expect(() => {
        uploadQueue.cancel()
        uploadQueue.cancel()
        uploadQueue.cancel()
      }).not.toThrow()
    })
  })

  describe('addToQueue', () => {
    it('should accept emojis without throwing', async () => {
      const { uploadQueue } = await import('@/lib/services/upload-queue')

      const mockEmoji = {
        id: 'test-id',
        name: 'test-emoji',
        imageURL: 'https://example.com/emoji.png',
        isAnimated: false,
      }

      await expect(uploadQueue.addToQueue([mockEmoji], 'test-pack')).resolves.not.toThrow()
    })

    it('should accept empty array', async () => {
      const { uploadQueue } = await import('@/lib/services/upload-queue')

      await expect(uploadQueue.addToQueue([], 'test-pack')).resolves.not.toThrow()
    })
  })
})

describe('UploadProgress interface', () => {
  it('should have correct structure', () => {
    // Test that the interface shape is what we expect
    const mockProgress: UploadProgress = {
      active: false,
      total: 10,
      completed: 5,
      failed: 1,
      ratelimited: 0,
      progress: 0.6,
      current: 'test-emoji',
    }

    expect(mockProgress.active).toBe(false)
    expect(mockProgress.total).toBe(10)
    expect(mockProgress.completed).toBe(5)
    expect(mockProgress.failed).toBe(1)
    expect(mockProgress.ratelimited).toBe(0)
    expect(mockProgress.progress).toBe(0.6)
    expect(mockProgress.current).toBe('test-emoji')
  })

  it('should allow optional current field', () => {
    const mockProgress: UploadProgress = {
      active: true,
      total: 5,
      completed: 2,
      failed: 0,
      ratelimited: 0,
      progress: 0.4,
    }

    expect(mockProgress.current).toBeUndefined()
  })
})

describe('Queue state management', () => {
  it('should not be active initially', async () => {
    const { uploadQueue } = await import('@/lib/services/upload-queue')
    uploadQueue.cancel()

    const progress = uploadQueue.getProgress()
    expect(progress.active).toBe(false)
  })
})
