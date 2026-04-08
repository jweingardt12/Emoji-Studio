/**
 * Video Encoder Factory
 * Automatically selects the best available encoder:
 * - WebCodecs (hardware-accelerated) when supported
 * - FFmpeg WASM as fallback for Firefox and older browsers
 */

import { VideoProcessor } from "./video-processor"
import {
  supportsWebCodecsVideoEncoding,
  encodeWithWebCodecs,
  blobsToCanvases,
  type EncodingProgress,
} from "./webcodecs-video-encoder"

export type EncoderType = "webcodecs" | "ffmpeg"

export interface EncoderInfo {
  type: EncoderType
  available: boolean
  reason?: string
}

// Cache the detection result
let cachedEncoderInfo: EncoderInfo | null = null

/**
 * Detect available encoder and return info
 * Results are cached after first detection
 */
export async function detectVideoEncoder(): Promise<EncoderInfo> {
  if (cachedEncoderInfo) {
    return cachedEncoderInfo
  }

  const webCodecsSupported = await supportsWebCodecsVideoEncoding()

  if (webCodecsSupported) {
    cachedEncoderInfo = { type: "webcodecs", available: true }
  } else {
    cachedEncoderInfo = {
      type: "ffmpeg",
      available: true,
      reason: "WebCodecs not supported in this browser",
    }
  }

  return cachedEncoderInfo
}

/**
 * Encode frames to MP4 using best available encoder
 * Automatically falls back to FFmpeg if WebCodecs fails
 *
 * @param frames - Array of PNG blobs representing each frame
 * @param fps - Frames per second for the output video
 * @param onProgress - Optional progress callback (0-1)
 */
export async function encodeFramesToMp4(
  frames: Blob[],
  fps: number,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const encoderInfo = await detectVideoEncoder()

  if (encoderInfo.type === "webcodecs") {
    try {
      // Convert blobs to canvases (first 10% of progress)
      const canvases = await blobsToCanvases(frames, (p) => {
        onProgress?.(p * 0.1)
      })

      // Encode using WebCodecs (remaining 90% of progress)
      const blob = await encodeWithWebCodecs(
        canvases,
        {
          width: canvases[0].width,
          height: canvases[0].height,
          fps,
        },
        (progress: EncodingProgress) => {
          // Map WebCodecs progress stages to 0.1-1.0 range
          const stageWeights = {
            encoding: { start: 0.1, weight: 0.5 },
            muxing: { start: 0.6, weight: 0.3 },
            finalizing: { start: 0.9, weight: 0.1 },
          }
          const stage = stageWeights[progress.stage]
          onProgress?.(stage.start + progress.progress * stage.weight)
        }
      )

      return blob
    } catch (error) {
      console.warn("[VideoEncoder] WebCodecs failed, falling back to FFmpeg:", error)
      // Fall through to FFmpeg
    }
  }

  // Fallback to FFmpeg WASM
  return VideoProcessor.framesToMp4(frames, fps, onProgress)
}

/**
 * Preload video encoder for faster first encode
 * - For FFmpeg: loads the WASM module
 * - For WebCodecs: no preload needed
 */
export async function preloadVideoEncoder(): Promise<void> {
  const info = await detectVideoEncoder()

  if (info.type === "ffmpeg") {
    // Preload FFmpeg WASM module
    await VideoProcessor.loadFFmpeg()
  }
  // WebCodecs doesn't need preloading - it's built into the browser
}

/**
 * Get user-friendly description of the active encoder
 */
export function getEncoderDescription(type: EncoderType): string {
  switch (type) {
    case "webcodecs":
      return "Hardware-accelerated"
    case "ffmpeg":
      return "Software encoding"
    default:
      return "Unknown"
  }
}
