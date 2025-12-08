/**
 * WebCodecs-based video encoder with Mediabunny muxer
 * Provides hardware-accelerated MP4 encoding when available
 * Falls back to FFmpeg WASM on unsupported browsers
 */

import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  EncodedVideoPacketSource,
  EncodedPacket,
} from "mediabunny"

export interface WebCodecsEncoderConfig {
  width: number
  height: number
  fps: number
  bitrate?: number
}

export interface EncodingProgress {
  stage: "encoding" | "muxing" | "finalizing"
  progress: number // 0-1
  framesEncoded: number
  totalFrames: number
}

/**
 * Check if WebCodecs video encoding is supported in the current browser
 */
export async function supportsWebCodecsVideoEncoding(): Promise<boolean> {
  // Must be in secure context (HTTPS or localhost)
  if (typeof window === "undefined" || !window.isSecureContext) {
    return false
  }

  // Check API availability
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") {
    return false
  }

  // Verify H.264 encoding support with codec-specific check
  try {
    const support = await VideoEncoder.isConfigSupported({
      codec: "avc1.42001E", // H.264 Baseline Profile Level 3.0
      width: 1080,
      height: 1080,
      bitrate: 5_000_000,
      framerate: 30,
    })
    return support.supported === true
  } catch {
    return false
  }
}

/**
 * Encode canvas frames to MP4 using WebCodecs + Mediabunny
 * Hardware-accelerated when available
 */
export async function encodeWithWebCodecs(
  frames: HTMLCanvasElement[],
  config: WebCodecsEncoderConfig,
  onProgress?: (progress: EncodingProgress) => void
): Promise<Blob> {
  const { width, height, fps, bitrate = 5_000_000 } = config
  const frameDuration = 1_000_000 / fps // microseconds
  const totalFrames = frames.length

  // Initialize Mediabunny output with MP4 format
  const output = new Output({
    format: new Mp4OutputFormat({
      fastStart: "in-memory", // Enable streaming-friendly MP4
    }),
    target: new BufferTarget(),
  })

  // Create encoded video packet source for H.264
  const videoSource = new EncodedVideoPacketSource("avc")
  output.addVideoTrack(videoSource, { frameRate: fps })

  // Track encoding state
  let encodedCount = 0
  const encodedChunks: Array<{
    chunk: EncodedVideoChunk
    metadata?: EncodedVideoChunkMetadata
  }> = []

  // Create WebCodecs encoder
  const encoder = new VideoEncoder({
    output: (chunk, metadata) => {
      encodedChunks.push({ chunk, metadata })
      encodedCount++
      onProgress?.({
        stage: "encoding",
        progress: encodedCount / totalFrames,
        framesEncoded: encodedCount,
        totalFrames,
      })
    },
    error: (error) => {
      console.error("[WebCodecs] Encoder error:", error)
      throw error
    },
  })

  // Configure encoder for H.264
  encoder.configure({
    codec: "avc1.42001E",
    width,
    height,
    bitrate,
    framerate: fps,
    hardwareAcceleration: "prefer-hardware",
    avc: { format: "avc" }, // Required for MP4 muxing
  })

  // Encode all frames
  for (let i = 0; i < frames.length; i++) {
    const canvas = frames[i]
    const timestamp = i * frameDuration

    // Create VideoFrame from canvas
    const frame = new VideoFrame(canvas, {
      timestamp,
      duration: frameDuration,
    })

    // Encode with keyframe every 30 frames for better seeking
    const keyFrame = i % 30 === 0
    encoder.encode(frame, { keyFrame })

    // Close frame to free memory immediately
    frame.close()

    // Yield to prevent blocking UI thread
    if (i % 10 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  // Flush remaining frames from encoder
  await encoder.flush()
  encoder.close()

  onProgress?.({
    stage: "muxing",
    progress: 0,
    framesEncoded: totalFrames,
    totalFrames,
  })

  // Start output pipeline
  await output.start()

  // Add all encoded chunks to muxer
  for (let i = 0; i < encodedChunks.length; i++) {
    const { chunk, metadata } = encodedChunks[i]
    await videoSource.add(EncodedPacket.fromEncodedChunk(chunk), metadata)

    // Report muxing progress
    if (i % 10 === 0) {
      onProgress?.({
        stage: "muxing",
        progress: (i + 1) / encodedChunks.length,
        framesEncoded: totalFrames,
        totalFrames,
      })
    }
  }

  onProgress?.({
    stage: "finalizing",
    progress: 0.9,
    framesEncoded: totalFrames,
    totalFrames,
  })

  // Finalize output and get buffer
  await output.finalize()
  const buffer = (output.target as BufferTarget).buffer

  if (!buffer) {
    throw new Error("Video encoding failed: no output buffer")
  }

  onProgress?.({
    stage: "finalizing",
    progress: 1,
    framesEncoded: totalFrames,
    totalFrames,
  })

  return new Blob([buffer], { type: "video/mp4" })
}

/**
 * Convert PNG blobs to canvas elements for encoding
 */
export async function blobsToCanvases(
  blobs: Blob[],
  onProgress?: (progress: number) => void
): Promise<HTMLCanvasElement[]> {
  const canvases: HTMLCanvasElement[] = []

  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i]
    const bitmap = await createImageBitmap(blob)

    const canvas = document.createElement("canvas")
    canvas.width = bitmap.width
    canvas.height = bitmap.height

    const ctx = canvas.getContext("2d")!
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()

    canvases.push(canvas)

    // Report conversion progress
    onProgress?.((i + 1) / blobs.length)
  }

  return canvases
}
