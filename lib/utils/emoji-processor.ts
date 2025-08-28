import { GifProcessor } from './gif-processor'
import { GifVideoProcessor } from './gif-video-processor'

export interface ProcessedEmoji {
  name: string
  originalFile: File
  processedBlob: Blob
  originalSize: number
  processedSize: number
  dimensions: { width: number; height: number }
  format: string
  preview: string
  blob: string // Data URL for the processed blob
  wasVideo?: boolean
  processingNote?: string
  speedMultiplier?: number // For GIFs, stores the speed setting used during processing
}

export class EmojiProcessor {
  static readonly TARGET_SIZE = 128
  static readonly MAX_FILE_SIZE = 128 * 1024 // 128KB
  static readonly MAX_GIF_FRAMES = 50
  
  // Option to preserve original quality (can be set via UI)
  static preserveOriginalQuality = false

  private static async blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  private static async isHDRImage(file: File): Promise<boolean> {
    // Check file extension for known HDR formats
    const extension = file.name.toLowerCase().split('.').pop()
    const hdrExtensions = ['heic', 'heif', 'avif', 'jxl', 'exr', 'hdr']
    if (hdrExtensions.includes(extension || '')) {
      return true
    }
    
    // Check file type
    const hdrTypes = ['image/heic', 'image/heif', 'image/avif', 'image/jxl']
    if (hdrTypes.includes(file.type.toLowerCase())) {
      return true
    }
    
    // Check if filename contains HDR indicators
    const nameLower = file.name.toLowerCase()
    if (nameLower.includes('hdr') || nameLower.includes('_hdr')) {
      return true
    }
    
    // Check if the file object has HDR metadata (from extension)
    if ((file as any).isHDR) {
      return true
    }
    
    // For PNG files, check for HDR metadata in the file content
    if (file.type === 'image/png' || extension === 'png') {
      try {
        // Read first part of the file to check for HDR chunks
        const arrayBuffer = await file.slice(0, 1024).arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // Look for PNG chunks that indicate HDR
        // Check for iCCP (ICC Profile) chunk which might contain HDR color profile
        const decoder = new TextDecoder('latin1')
        const header = decoder.decode(uint8Array)
        
        // Common HDR indicators in PNG metadata
        if (header.includes('iCCP') || 
            header.includes('Display P3') || 
            header.includes('Rec2020') ||
            header.includes('HDR') ||
            header.includes('sRGB') === false) { // Non-sRGB often means HDR
          console.log('Detected potential HDR PNG based on metadata')
          return true
        }
      } catch (error) {
        console.warn('Error checking PNG for HDR metadata:', error)
      }
    }
    
    return false
  }

  private static async processHDRImage(file: File, name: string): Promise<ProcessedEmoji> {
    // For HDR images, resize to 128x128 for Slack
    // Slack will auto-compress images, so we don't need to enforce 128KB limit
    
    console.log(`Processing HDR image: ${file.name} (size: ${file.size} bytes)`)
    
    // Check if already meets size requirements
    const dimensions = await this.getImageDimensions(file)
    if (dimensions.width <= this.TARGET_SIZE && 
        dimensions.height <= this.TARGET_SIZE) {
      console.log(`Image ${file.name} already at correct dimensions`)
      const preview = URL.createObjectURL(file)
      const blobUrl = await this.blobToDataURL(file)
      
      return {
        name,
        originalFile: file,
        processedBlob: file,
        originalSize: file.size,
        processedSize: file.size,
        dimensions,
        format: file.type.split('/')[1]?.toUpperCase() || 'PNG',
        preview,
        blob: blobUrl,
        processingNote: 'Ready for Slack'
      }
    }
    
    // Resize to 128x128
    console.log(`Resizing ${file.name} to 128x128`)
    
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      
      img.onload = async () => {
        try {
          // Always resize to 128x128 for Slack
          canvas.width = this.TARGET_SIZE
          canvas.height = this.TARGET_SIZE
          
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          const scale = Math.min(this.TARGET_SIZE / img.width, this.TARGET_SIZE / img.height)
          const scaledWidth = img.width * scale
          const scaledHeight = img.height * scale
          const offsetX = (this.TARGET_SIZE - scaledWidth) / 2
          const offsetY = (this.TARGET_SIZE - scaledHeight) / 2
          
          ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)
          
          // Use high quality PNG - Slack will handle compression
          let quality = 1.0
          let format = 'image/png'
          let blob: Blob | null = await this.canvasToBlob(canvas, format, quality)
          
          console.log(`Created PNG at full quality, size: ${blob?.size} bytes (Slack will auto-compress)`)
          
          if (!blob) {
            reject(new Error('Failed to process image'))
            return
          }
          
          const preview = canvas.toDataURL(format, quality)
          const blobUrl = await this.blobToDataURL(blob)
          
          resolve({
            name,
            originalFile: file,
            processedBlob: blob,
            originalSize: file.size,
            processedSize: blob.size,
            dimensions: { width: this.TARGET_SIZE, height: this.TARGET_SIZE },
            format: format.split('/')[1].toUpperCase(),
            preview,
            blob: blobUrl,
            processingNote: blob.size > 128 * 1024 ? `Resized to 128x128 (${(blob.size / 1024).toFixed(0)}KB)` : 'Resized to 128x128'
          })
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  private static async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
      }
      img.onerror = () => {
        // If we can't load the image (e.g., HEIC not supported in browser),
        // return target dimensions as fallback
        resolve({ width: this.TARGET_SIZE, height: this.TARGET_SIZE })
      }
      img.src = URL.createObjectURL(file)
    })
  }

  static async processFile(file: File, options?: { preserveHDR?: boolean; processingOptions?: any }): Promise<ProcessedEmoji> {
    const fileType = file.type
    // Remove extension and clean up the filename
    const fileName = file.name
      .replace(/\.[^/.]+$/, '') // Remove extension
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-z0-9-_]/g, '') // Remove special characters
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens

    // Check if this is an HDR image
    const isHDR = await this.isHDRImage(file)
    
    // Also check if user wants to preserve quality based on filename
    const shouldPreserveQuality = options?.preserveHDR || 
                                 this.preserveOriginalQuality ||
                                 file.name.toLowerCase().includes('hdr') ||
                                 file.name.toLowerCase().includes('emoji') && file.size < this.MAX_FILE_SIZE * 2
    
    // Check for GIF files by examining the file content, not just MIME type
    const isGif = await this.isGifFile(file)
    const isAnimWebP = await this.isAnimatedWebP(file)
    
    if (isGif || isAnimWebP) {
      console.log(`Processing ${file.name} as animated image (GIF: ${isGif}, Animated WebP: ${isAnimWebP})`)
      return this.processGif(file, fileName)
    } else if (fileType.startsWith('image/')) {
      // Use different processing for HDR images or when quality preservation is requested
      if (isHDR || shouldPreserveQuality) {
        console.log(`Processing ${file.name} with quality preservation (HDR: ${isHDR})`)
        return this.processHDRImage(file, fileName)
      }
      return this.processImage(file, fileName)
    } else if (fileType.startsWith('video/')) {
      return this.processVideo(file, fileName, (file as any).processingOptions || options?.processingOptions)
    } else {
      throw new Error('Unsupported file type')
    }
  }

  private static async processImage(file: File, name: string): Promise<ProcessedEmoji> {
    console.log(`[EmojiProcessor] Processing image: ${file.name}, type: ${file.type}, size: ${file.size}`)
    
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      img.onload = async () => {
        try {
          console.log(`[EmojiProcessor] Image loaded: ${img.width}x${img.height}`)
          
          canvas.width = this.TARGET_SIZE
          canvas.height = this.TARGET_SIZE

          // Clear canvas with transparent background
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          // Calculate scaling to fit within target size while maintaining aspect ratio
          const scale = Math.min(this.TARGET_SIZE / img.width, this.TARGET_SIZE / img.height)
          const scaledWidth = img.width * scale
          const scaledHeight = img.height * scale
          const offsetX = (this.TARGET_SIZE - scaledWidth) / 2
          const offsetY = (this.TARGET_SIZE - scaledHeight) / 2

          // Draw image centered on canvas
          ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

          // Convert to blob - use PNG for best quality since Slack will handle compression
          let quality = 1.0  // Maximum quality since Slack will compress
          let format = 'image/png'
          
          let blob = await this.canvasToBlob(canvas, format, quality)
          console.log(`[EmojiProcessor] PNG blob size: ${blob?.size} (Slack will auto-compress)`)

          if (!blob) {
            console.error('[EmojiProcessor] Failed to create blob from canvas')
            reject(new Error('Failed to process image'))
            return
          }

          console.log(`[EmojiProcessor] Final blob - format: ${format}, size: ${blob.size}, quality: ${quality}`)

          const preview = canvas.toDataURL(format, quality)
          const blobUrl = await this.blobToDataURL(blob)

          console.log(`[EmojiProcessor] Image processing complete for ${name}`)

          resolve({
            name,
            originalFile: file,
            processedBlob: blob,
            originalSize: file.size,
            processedSize: blob.size,
            dimensions: { width: this.TARGET_SIZE, height: this.TARGET_SIZE },
            format: format.split('/')[1].toUpperCase(),
            preview,
            blob: blobUrl
          })
        } catch (error) {
          console.error('[EmojiProcessor] Error processing image:', error)
          reject(error)
        }
      }

      img.onerror = (error) => {
        console.error('[EmojiProcessor] Failed to load image:', error)
        reject(new Error('Failed to load image'))
      }
      
      const objectUrl = URL.createObjectURL(file)
      console.log(`[EmojiProcessor] Created object URL for image: ${objectUrl}`)
      img.src = objectUrl
    })
  }

  private static async processGif(file: File, name: string): Promise<ProcessedEmoji> {
    try {
      let processedBlob = await GifProcessor.processGif(file, this.TARGET_SIZE, this.MAX_FILE_SIZE)
      console.log(`Processed GIF blob type: ${processedBlob.type}, size: ${processedBlob.size}`)
      const preview = URL.createObjectURL(processedBlob)
      const blobUrl = await this.blobToDataURL(processedBlob)
      
      // Check if format changed from GIF to PNG
      const wasConverted = file.type === 'image/gif' && processedBlob.type === 'image/png'
      
      // Ensure the blob has the correct MIME type
      if (processedBlob.type !== 'image/gif' && file.type === 'image/gif') {
        console.warn(`Processed blob has type ${processedBlob.type}, expected image/gif`)
        // Try to correct the MIME type
        processedBlob = new Blob([processedBlob], { type: 'image/gif' })
      }
      
      // Determine processing note
      let processingNote: string | undefined
      if (wasConverted) {
        processingNote = 'Animated GIF converted to static PNG to meet size limits'
      } else if (processedBlob.type === 'image/gif' && processedBlob.size < file.size) {
        const compressionRatio = Math.round((1 - processedBlob.size / file.size) * 100)
        processingNote = `Animated GIF optimized (${compressionRatio}% size reduction)`
      }
      
      return {
        name,
        originalFile: file,
        processedBlob,
        originalSize: file.size,
        processedSize: processedBlob.size,
        dimensions: { width: this.TARGET_SIZE, height: this.TARGET_SIZE },
        format: processedBlob.type === 'image/gif' ? 'GIF' : 'PNG',
        preview,
        blob: blobUrl,
        processingNote
      }
    } catch (error) {
      console.error('GIF processing failed:', error)
      // Fall back to treating it as a static image
      return this.processImage(file, name)
    }
  }

  private static async processVideo(file: File, name: string, options?: any): Promise<ProcessedEmoji> {
    console.log('[EmojiProcessor] Converting video to animated GIF...', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      options
    })
    
    // Check if file has processing options attached
    const processingOptions = (file as any).processingOptions || options
    
    try {
      const gifBlob = await GifVideoProcessor.videoToAnimatedGif(
        file,
        this.TARGET_SIZE,
        this.MAX_GIF_FRAMES,
        this.MAX_FILE_SIZE,
        processingOptions
      )
      
      console.log('[EmojiProcessor] Video converted successfully to GIF:', {
        originalSize: file.size,
        gifSize: gifBlob.size
      })
      
      const preview = URL.createObjectURL(gifBlob)
      
      // Provide informative processing note
      let processingNote = `Converted to ${(gifBlob.size / 1024).toFixed(0)}KB animated GIF`
      
      // Add quality/processing details
      if (gifBlob.size > 100 * 1024) {
        processingNote += ' (50 frames, optimized)'
      } else if (gifBlob.size > 80 * 1024) {
        processingNote += ' (50 frames, compressed)'
      } else {
        processingNote += ' (full quality)'
      }
      
      const blobUrl = await this.blobToDataURL(gifBlob)
      
      return {
        name,
        originalFile: file,
        processedBlob: gifBlob,
        originalSize: file.size,
        processedSize: gifBlob.size,
        dimensions: { width: this.TARGET_SIZE, height: this.TARGET_SIZE },
        format: 'GIF',
        preview,
        blob: blobUrl,
        wasVideo: true,
        processingNote
      }
    } catch (error) {
      console.error('[EmojiProcessor] Video processing failed:', error)
      throw new Error(`Failed to process video: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), type, quality)
    })
  }

  static async downloadEmoji(emoji: ProcessedEmoji) {
    const url = URL.createObjectURL(emoji.processedBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${emoji.name}.${emoji.format.toLowerCase()}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  static async downloadAllEmojis(emojis: ProcessedEmoji[]) {
    if (emojis.length === 0) return

    // For single emoji, just download it directly
    if (emojis.length === 1) {
      return this.downloadEmoji(emojis[0])
    }

    // For multiple emojis, create a zip file
    // This would require JSZip which is already in the project
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    emojis.forEach(emoji => {
      zip.file(`${emoji.name}.${emoji.format.toLowerCase()}`, emoji.processedBlob)
    })

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'slack-emojis.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  private static async isGifFile(file: File): Promise<boolean> {
    try {
      // Check file extension first
      if (file.name.toLowerCase().endsWith('.gif')) {
        return true
      }
      
      // Check MIME type
      if (file.type === 'image/gif') {
        return true
      }
      
      // Check file content for GIF signature
      const arrayBuffer = await file.slice(0, 6).arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      
      // GIF files start with either GIF87a or GIF89a
      return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
             bytes[3] === 0x38 && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61
    } catch (error) {
      console.error('Error checking if file is GIF:', error)
      return false
    }
  }

  private static async isAnimatedWebP(file: File): Promise<boolean> {
    try {
      // Check file extension
      if (!file.name.toLowerCase().endsWith('.webp') && file.type !== 'image/webp') {
        return false
      }
      
      // Read WebP header to check for animation
      const arrayBuffer = await file.slice(0, 100).arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      
      // Check for RIFF header
      if (bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) {
        return false
      }
      
      // Check for WEBP signature
      if (bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50) {
        return false
      }
      
      // Look for ANIM chunk which indicates animation
      for (let i = 12; i < bytes.length - 4; i++) {
        if (bytes[i] === 0x41 && bytes[i+1] === 0x4E && bytes[i+2] === 0x49 && bytes[i+3] === 0x4D) {
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error('Error checking if WebP is animated:', error)
      return false
    }
  }
}