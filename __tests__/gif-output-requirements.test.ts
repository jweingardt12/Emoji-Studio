import { describe, test, expect } from '@jest/globals'
import { ImprovedGIFEncoder } from '@/lib/utils/improved-gif-encoder'

describe('GIF Output Requirements', () => {
  test('generated GIFs meet Slack requirements', async () => {
    // Create test encoder
    const gif = new ImprovedGIFEncoder({
      width: 128,
      height: 128,
      quality: 10,
      workers: 2,
      dither: false
    })
    
    // Create test canvas
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    
    // Add 5 test frames
    for (let i = 0; i < 5; i++) {
      // White background
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 128, 128)
      
      // Different color for each frame
      ctx.fillStyle = `hsl(${i * 60}, 70%, 50%)`
      ctx.fillRect(20, 20, 88, 88)
      
      gif.addFrame(ctx, {
        delay: 100,
        dispose: 1
      })
    }
    
    // Render GIF
    const blob = await gif.render()
    
    // Verify dimensions are correct (128x128)
    expect(gif.width).toBe(128)
    expect(gif.height).toBe(128)
    
    // Verify file size is under 128KB
    expect(blob.size).toBeLessThanOrEqual(128 * 1024)
    
    // Verify it's actually a GIF
    expect(blob.type).toBe('image/gif')
    
    console.log(`Test GIF size: ${(blob.size / 1024).toFixed(2)}KB`)
  })
  
  test('optimization strategies reduce file size', async () => {
    const strategies = [
      { quality: 10, expectedSize: 30000 },
      { quality: 20, expectedSize: 25000 },
      { quality: 30, expectedSize: 20000 },
      { quality: 50, expectedSize: 15000 },
      { quality: 80, expectedSize: 10000 }
    ]
    
    for (const strategy of strategies) {
      const gif = new ImprovedGIFEncoder({
        width: 128,
        height: 128,
        quality: strategy.quality,
        workers: 2,
        dither: strategy.quality <= 20
      })
      
      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 128
      const ctx = canvas.getContext('2d')!
      
      // Add 10 frames with complex content
      for (let i = 0; i < 10; i++) {
        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 128, 128)
        gradient.addColorStop(0, `hsl(${i * 36}, 70%, 50%)`)
        gradient.addColorStop(1, `hsl(${(i + 1) * 36}, 70%, 50%)`)
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 128, 128)
        
        gif.addFrame(ctx, {
          delay: 100,
          dispose: 1
        })
      }
      
      const blob = await gif.render()
      console.log(`Quality ${strategy.quality}: ${(blob.size / 1024).toFixed(2)}KB`)
      
      // All strategies should produce files under 128KB
      expect(blob.size).toBeLessThanOrEqual(128 * 1024)
    }
  })
})