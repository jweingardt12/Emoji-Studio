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
}

export class EmojiProcessor {
  static readonly TARGET_SIZE = 128
  static readonly MAX_FILE_SIZE = 128 * 1024 // 128KB
  static readonly MAX_GIF_FRAMES = 50

  private static async blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  static async processFile(file: File): Promise<ProcessedEmoji> {
    const fileType = file.type
    // Remove extension and clean up the filename
    const fileName = file.name
      .replace(/\.[^/.]+$/, '') // Remove extension
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-z0-9-_]/g, '') // Remove special characters
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens

    // Check for GIF files by examining the file content, not just MIME type
    const isGif = await this.isGifFile(file)
    
    if (isGif) {
      console.log(`Processing ${file.name} as GIF (detected by content)`)
      return this.processGif(file, fileName)
    } else if (fileType.startsWith('image/')) {
      return this.processImage(file, fileName)
    } else if (fileType.startsWith('video/')) {
      return this.processVideo(file, fileName)
    } else {
      throw new Error('Unsupported file type')
    }
  }

  private static async processImage(file: File, name: string): Promise<ProcessedEmoji> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      img.onload = async () => {
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

        // Convert to blob with quality adjustment to stay under size limit
        let quality = 0.95
        let blob: Blob | null = null
        let format = 'image/png'

        // Try PNG first
        blob = await this.canvasToBlob(canvas, format, quality)
        
        // If PNG is too large, try JPEG with decreasing quality
        if (blob && blob.size > this.MAX_FILE_SIZE) {
          format = 'image/jpeg'
          while (quality > 0.1 && (!blob || blob.size > this.MAX_FILE_SIZE)) {
            blob = await this.canvasToBlob(canvas, format, quality)
            quality -= 0.1
          }
        }

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
          blob: blobUrl
        })
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
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

  private static async processVideo(file: File, name: string): Promise<ProcessedEmoji> {
    console.log('Converting video to animated GIF...')
    
    const gifBlob = await GifVideoProcessor.videoToAnimatedGif(
      file,
      this.TARGET_SIZE,
      this.MAX_GIF_FRAMES,
      this.MAX_FILE_SIZE
    )
    
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
}