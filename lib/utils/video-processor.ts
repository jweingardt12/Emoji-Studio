import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'

export class VideoProcessor {
  private static ffmpeg: FFmpeg | null = null
  private static isLoaded = false

  static async loadFFmpeg(): Promise<void> {
    if (this.isLoaded && this.ffmpeg) return

    try {
      this.ffmpeg = new FFmpeg()
      
      // Use jsdelivr CDN which has proper CORS support
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd'
      
      // Load FFmpeg with proper configuration
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        // Explicitly set worker URL for single-threaded mode
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
      })
      
      this.isLoaded = true
      console.log('FFmpeg loaded successfully')
    } catch (error) {
      console.error('Failed to load FFmpeg:', error)
      this.isLoaded = false
      this.ffmpeg = null
      throw error
    }
  }

  static async videoToGif(
    file: File, 
    targetSize: number = 128,
    maxFrames: number = 50,
    maxFileSize: number = 128 * 1024,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    await this.loadFFmpeg()
    
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded')

    // Set up progress handling
    const progressHandler = onProgress ? ({ progress }: { progress: number }) => {
      onProgress(progress)
    } : null
    
    if (progressHandler) {
      this.ffmpeg.on('progress', progressHandler)
    }

    const inputName = 'input' + file.name.substring(file.name.lastIndexOf('.'))
    const outputName = 'output.gif'

    // Write input file
    await this.ffmpeg.writeFile(inputName, await fetchFile(file))

    // Try different quality settings to get under size limit
    const qualitySettings = [
      { fps: 10, colors: 128, scale: targetSize },
      { fps: 8, colors: 64, scale: targetSize },
      { fps: 6, colors: 32, scale: Math.floor(targetSize * 0.8) },
      { fps: 5, colors: 16, scale: Math.floor(targetSize * 0.7) },
      { fps: 4, colors: 16, scale: Math.floor(targetSize * 0.6) }
    ]

    let resultBlob: Blob | null = null

    for (const settings of qualitySettings) {
      try {
        // Convert video to GIF with current quality settings
        const filters = [
          `scale=${settings.scale}:-1:flags=lanczos`,
          `scale=${targetSize}:${targetSize}:force_original_aspect_ratio=decrease:flags=lanczos`,
          `pad=${targetSize}:${targetSize}:(ow-iw)/2:(oh-ih)/2:color=white@0`,
          `fps=${settings.fps}`,
          `split[s0][s1]`,
          `[s0]palettegen=max_colors=${settings.colors}:reserve_transparent=true[p]`,
          `[s1][p]paletteuse=dither=bayer:bayer_scale=5`
        ].join(',')

        // Calculate duration to limit frames
        const maxDuration = Math.floor(maxFrames / settings.fps)

        await this.ffmpeg.exec([
          '-i', inputName,
          '-t', maxDuration.toString(), // Limit duration
          '-vf', filters,
          '-loop', '0',
          '-y', // Overwrite output
          outputName
        ])

        // Read output file
        const data = await this.ffmpeg.readFile(outputName)
        const blob = new Blob([data], { type: 'image/gif' })

        console.log(`GIF created with settings: fps=${settings.fps}, colors=${settings.colors}, size=${blob.size} bytes`)

        // If it's under the size limit, we're done!
        if (blob.size <= maxFileSize) {
          resultBlob = blob
          break
        }

        // Clean up for next attempt
        await this.ffmpeg.deleteFile(outputName)
      } catch (error) {
        console.error('Error with quality setting:', settings, error)
      }
    }

    // Clean up
    await this.ffmpeg.deleteFile(inputName)
    if (await this.fileExists(outputName)) {
      await this.ffmpeg.deleteFile(outputName)
    }
    
    // Remove progress listener
    if (progressHandler) {
      this.ffmpeg.off('progress', progressHandler)
    }

    if (!resultBlob) {
      throw new Error('Could not create GIF under size limit')
    }

    return resultBlob
  }

  private static async fileExists(filename: string): Promise<boolean> {
    try {
      await this.ffmpeg!.readFile(filename)
      return true
    } catch {
      return false
    }
  }

  static async extractVideoFrame(
    file: File,
    targetSize: number = 128,
    timestamp: string = '00:00:00'
  ): Promise<Blob> {
    await this.loadFFmpeg()

    if (!this.ffmpeg) throw new Error('FFmpeg not loaded')

    const inputName = 'input' + file.name.substring(file.name.lastIndexOf('.'))
    const outputName = 'frame.png'

    // Write input file
    await this.ffmpeg.writeFile(inputName, await fetchFile(file))

    // Extract frame at timestamp
    await this.ffmpeg.exec([
      '-i', inputName,
      '-ss', timestamp,
      '-vframes', '1',
      '-vf', `scale=${targetSize}:${targetSize}:force_original_aspect_ratio=decrease,pad=${targetSize}:${targetSize}:(ow-iw)/2:(oh-ih)/2`,
      outputName
    ])

    // Read output file
    const data = await this.ffmpeg.readFile(outputName)

    // Clean up
    await this.ffmpeg.deleteFile(inputName)
    await this.ffmpeg.deleteFile(outputName)

    return new Blob([data], { type: 'image/png' })
  }

  /**
   * Convert a sequence of PNG frames to an MP4 video
   * @param frames - Array of PNG blobs representing each frame
   * @param fps - Frames per second for the output video
   * @param onProgress - Optional progress callback
   */
  static async framesToMp4(
    frames: Blob[],
    fps: number = 30,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    await this.loadFFmpeg()

    if (!this.ffmpeg) throw new Error('FFmpeg not loaded')

    // Set up progress handling
    const progressHandler = onProgress ? ({ progress }: { progress: number }) => {
      // FFmpeg progress goes from 0 to 1 during encoding
      // We allocate 30% for frame writing, 70% for encoding
      onProgress(0.3 + progress * 0.7)
    } : null

    if (progressHandler) {
      this.ffmpeg.on('progress', progressHandler)
    }

    try {
      // Write all frames to the virtual filesystem
      for (let i = 0; i < frames.length; i++) {
        const frameData = await frames[i].arrayBuffer()
        const paddedIndex = String(i).padStart(4, '0')
        await this.ffmpeg.writeFile(`frame_${paddedIndex}.png`, new Uint8Array(frameData))
        onProgress?.((i / frames.length) * 0.3) // 30% for writing frames
      }

      // Convert frames to MP4 using libx264
      // Using image2 demuxer with pattern matching for the frame sequence
      await this.ffmpeg.exec([
        '-framerate', fps.toString(),
        '-i', 'frame_%04d.png',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p', // Required for compatibility
        '-preset', 'medium',
        '-crf', '23', // Good quality/size balance
        '-movflags', '+faststart', // Enable streaming
        'output.mp4'
      ])

      // Read output file
      const data = await this.ffmpeg.readFile('output.mp4')
      // Create a new ArrayBuffer copy to ensure compatibility with Blob
      const uint8Data = new Uint8Array(data as Uint8Array)
      const blob = new Blob([uint8Data], { type: 'video/mp4' })

      console.log(`MP4 created: ${frames.length} frames at ${fps}fps, size=${blob.size} bytes`)

      // Clean up frames
      for (let i = 0; i < frames.length; i++) {
        const paddedIndex = String(i).padStart(4, '0')
        await this.ffmpeg.deleteFile(`frame_${paddedIndex}.png`)
      }

      // Clean up output
      await this.ffmpeg.deleteFile('output.mp4')

      return blob
    } finally {
      // Remove progress listener
      if (progressHandler) {
        this.ffmpeg.off('progress', progressHandler)
      }
    }
  }
}