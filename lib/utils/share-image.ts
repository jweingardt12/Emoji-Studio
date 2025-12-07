import { toPng, toBlob, toCanvas, toJpeg } from "html-to-image"
import GIF from "gif.js"
import { VideoProcessor } from "./video-processor"
import {
  isIOS,
  isWebView,
  isRestrictedWebView,
  supportsDownloadAttribute,
  supportsClipboardWriteImage,
  supportsWebShareWithFiles,
} from "./ios-detection"

/**
 * Wait for all images in an element to be fully loaded
 */
async function waitForImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll("img")
  const promises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve()
    return new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.onerror = () => resolve() // Don't fail on broken images
    })
  })
  await Promise.all(promises)
}

/**
 * Generate a PNG image from an HTML element with solid background
 * PNG is used because clipboard API doesn't support JPEG
 */
export async function generateImage(element: HTMLElement, backgroundColor?: string): Promise<Blob> {
  // Get computed background color from element if not provided
  const bgColor = backgroundColor || getComputedStyle(element).backgroundColor || "#1a1a2e"

  // Wait for all images to load before capturing
  await waitForImages(element)

  const dataUrl = await toPng(element, {
    pixelRatio: 2, // 2x for retina quality
    cacheBust: true,
    backgroundColor: bgColor,
    skipFonts: true,
    // Include external images by fetching them
    includeQueryParams: true,
  })

  // Convert data URL to blob
  const response = await fetch(dataUrl)
  const blob = await response.blob()

  if (!blob) {
    throw new Error("Failed to generate image")
  }

  return blob
}

/**
 * Generate a data URL from an HTML element
 */
export async function generateImageDataUrl(element: HTMLElement): Promise<string> {
  return toPng(element, {
    pixelRatio: 2,
    cacheBust: true,
  })
}

/**
 * Convert a Blob to a data URL for inline display
 * Useful for WebViews where other methods don't work
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Failed to convert blob to data URL"))
      }
    }
    reader.onerror = () => reject(new Error("Failed to read blob"))
    reader.readAsDataURL(blob)
  })
}

/**
 * Check if we should use inline image fallback (for restricted WebViews)
 * This is useful when Web Share API isn't available
 */
export function shouldUseInlineFallback(): boolean {
  // If Web Share with files is supported, we don't need inline fallback
  if (supportsWebShareWithFiles()) return false

  // Use inline fallback for restricted WebViews (Slack, Discord, etc.)
  return isRestrictedWebView()
}

/**
 * Result of clipboard operation - indicates whether copy succeeded or user should use share
 */
export interface ClipboardResult {
  success: boolean
  fallbackToShare: boolean
  message: string
}

/**
 * Copy an image blob to the clipboard
 * On iOS WebView, clipboard write for images is not supported - returns fallbackToShare: true
 */
export async function copyImageToClipboard(blob: Blob): Promise<ClipboardResult> {
  // Check if we're on a platform that doesn't support clipboard image writing
  if (!supportsClipboardWriteImage()) {
    // On iOS, we should suggest using share instead
    if (isIOS() || isWebView()) {
      return {
        success: false,
        fallbackToShare: true,
        message: "Copying images isn't supported on this device. Use Share instead to save the image.",
      }
    }
    return {
      success: false,
      fallbackToShare: false,
      message: "Your browser doesn't support copying images to clipboard",
    }
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ])
    return {
      success: true,
      fallbackToShare: false,
      message: "Copied to clipboard!",
    }
  } catch (error) {
    console.error("Failed to copy image to clipboard:", error)

    // On iOS, even if the API exists, it may fail - suggest share
    if (isIOS() || isWebView()) {
      return {
        success: false,
        fallbackToShare: true,
        message: "Copying failed on this device. Use Share instead to save the image.",
      }
    }

    return {
      success: false,
      fallbackToShare: false,
      message: "Failed to copy image to clipboard",
    }
  }
}

/**
 * Result of download operation
 */
export interface DownloadResult {
  success: boolean
  method: "download" | "share" | "open" | "none"
  message: string
}

/**
 * Download an image blob as a file
 * On iOS WebView, uses Web Share API or opens image in new tab as fallback
 */
export async function downloadImage(blob: Blob, filename: string): Promise<DownloadResult> {
  // On iOS or WebView, try Web Share API first as it's the most reliable way to save images
  if (isIOS() || isWebView()) {
    // First try Web Share API with files
    if (supportsWebShareWithFiles()) {
      try {
        const file = new File([blob], filename, { type: blob.type })
        await navigator.share({
          files: [file],
          title: "Save Image",
        })
        return {
          success: true,
          method: "share",
          message: "Image ready to save!",
        }
      } catch (error) {
        // User cancelled share - that's okay
        if ((error as Error).name === "AbortError") {
          return {
            success: true,
            method: "share",
            message: "Share cancelled",
          }
        }
        console.warn("Web Share failed, trying fallback:", error)
      }
    }

    // Fallback: Open image in new tab for manual save (long-press to save)
    try {
      const url = URL.createObjectURL(blob)
      const newWindow = window.open(url, "_blank")

      if (newWindow) {
        // Auto-revoke after 60 seconds
        setTimeout(() => URL.revokeObjectURL(url), 60000)
        return {
          success: true,
          method: "open",
          message: "Image opened! Long-press and select 'Save Image' to download.",
        }
      } else {
        URL.revokeObjectURL(url)
        return {
          success: false,
          method: "none",
          message: "Popup blocked. Please allow popups to save images.",
        }
      }
    } catch (error) {
      console.error("Failed to open image:", error)
      return {
        success: false,
        method: "none",
        message: "Failed to save image on this device",
      }
    }
  }

  // Standard download for browsers that support it
  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return {
      success: true,
      method: "download",
      message: "Image downloaded!",
    }
  } catch (error) {
    console.error("Download failed:", error)
    return {
      success: false,
      method: "none",
      message: "Failed to download image",
    }
  }
}

/**
 * Share an image using the Web Share API
 * Returns true if sharing was successful, false if not supported
 */
export async function shareImage(
  blob: Blob,
  title: string,
  text?: string
): Promise<boolean> {
  // Check if Web Share API with files is supported
  if (!navigator.canShare) {
    return false
  }

  const file = new File([blob], "emoji-studio.png", { type: "image/png" })
  const shareData = {
    title,
    text: text || "Made with Emoji Studio: https://emojistudio.xyz",
    files: [file],
  }

  if (!navigator.canShare(shareData)) {
    return false
  }

  try {
    await navigator.share(shareData)
    return true
  } catch (error) {
    // User cancelled or share failed
    if ((error as Error).name === "AbortError") {
      // User cancelled - not an error
      return true
    }
    console.error("Share failed:", error)
    return false
  }
}

/**
 * Check if the Web Share API with file support is available
 */
export function canShare(): boolean {
  if (typeof navigator === "undefined") return false
  if (!navigator.canShare) return false

  // Create a test file to check if file sharing is supported
  try {
    const testFile = new File(["test"], "test.png", { type: "image/png" })
    return navigator.canShare({ files: [testFile] })
  } catch {
    return false
  }
}

/**
 * Generate an animated GIF from an HTML element by capturing multiple frames
 * @param captureFrame - Function that captures a frame and returns a canvas
 * @param frameCount - Number of frames to capture
 * @param frameDelay - Delay between frames in ms (for GIF playback)
 * @param captureInterval - Optional delay between frame captures in ms (to allow CSS animations to progress)
 * @param onProgress - Optional progress callback (0-1)
 */
export async function generateGif(
  captureFrame: (frameIndex: number) => Promise<HTMLCanvasElement>,
  frameCount: number,
  frameDelay: number = 100,
  captureInterval: number = 0,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      // Capture first frame to get dimensions
      const firstFrame = await captureFrame(0)
      const width = firstFrame.width
      const height = firstFrame.height

      const gif = new GIF({
        workers: 2,
        quality: 10,
        width,
        height,
        workerScript: "/gif.worker.js",
      })

      // Add the first frame
      gif.addFrame(firstFrame, { delay: frameDelay, copy: true })
      onProgress?.(1 / (frameCount + 1) * 0.8)

      // Capture remaining frames with optional delay between captures
      for (let i = 1; i < frameCount; i++) {
        // Wait for CSS animations to progress
        if (captureInterval > 0) {
          await new Promise(r => setTimeout(r, captureInterval))
        }
        const canvas = await captureFrame(i)
        gif.addFrame(canvas, { delay: frameDelay, copy: true })
        onProgress?.((i + 1) / (frameCount + 1) * 0.8) // 80% for frame capture
      }

      gif.on("finished", (blob: Blob) => {
        onProgress?.(1)
        resolve(blob)
      })

      gif.on("progress", (p: number) => {
        onProgress?.(0.8 + p * 0.2) // Last 20% for encoding
      })

      gif.render()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Capture a single frame from an HTML element as a canvas
 */
export async function captureElementAsCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  return toCanvas(element, {
    pixelRatio: 2,
    cacheBust: true,
  })
}

/**
 * Download a GIF blob as a file
 * On iOS WebView, uses Web Share API or opens in new tab as fallback
 */
export async function downloadGif(blob: Blob, filename: string): Promise<DownloadResult> {
  const finalFilename = filename.endsWith(".gif") ? filename : `${filename}.gif`

  // On iOS or WebView, try Web Share API first
  if (isIOS() || isWebView()) {
    if (supportsWebShareWithFiles()) {
      try {
        const file = new File([blob], finalFilename, { type: "image/gif" })
        await navigator.share({
          files: [file],
          title: "Save GIF",
        })
        return {
          success: true,
          method: "share",
          message: "GIF ready to save!",
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return {
            success: true,
            method: "share",
            message: "Share cancelled",
          }
        }
        console.warn("Web Share failed for GIF, trying fallback:", error)
      }
    }

    // Fallback: Open GIF in new tab
    try {
      const url = URL.createObjectURL(blob)
      const newWindow = window.open(url, "_blank")

      if (newWindow) {
        setTimeout(() => URL.revokeObjectURL(url), 60000)
        return {
          success: true,
          method: "open",
          message: "GIF opened! Long-press and select 'Save Image' to download.",
        }
      } else {
        URL.revokeObjectURL(url)
        return {
          success: false,
          method: "none",
          message: "Popup blocked. Please allow popups to save.",
        }
      }
    } catch (error) {
      console.error("Failed to open GIF:", error)
      return {
        success: false,
        method: "none",
        message: "Failed to save GIF on this device",
      }
    }
  }

  // Standard download
  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = finalFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return {
      success: true,
      method: "download",
      message: "GIF downloaded!",
    }
  } catch (error) {
    console.error("GIF download failed:", error)
    return {
      success: false,
      method: "none",
      message: "Failed to download GIF",
    }
  }
}

/**
 * Share a GIF using the Web Share API
 */
export async function shareGif(
  blob: Blob,
  title: string,
  text?: string
): Promise<boolean> {
  if (!navigator.canShare) {
    return false
  }

  const file = new File([blob], "leaderboard.gif", { type: "image/gif" })
  const shareData = {
    title,
    text: text || "Made with Emoji Studio: https://emojistudio.xyz",
    files: [file],
  }

  if (!navigator.canShare(shareData)) {
    return false
  }

  try {
    await navigator.share(shareData)
    return true
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return true
    }
    console.error("Share failed:", error)
    return false
  }
}

/**
 * Generate an MP4 video from an HTML element by capturing multiple frames
 * @param captureFrame - Function that captures a frame and returns a canvas
 * @param frameCount - Number of frames to capture
 * @param fps - Frames per second for the output video
 * @param onProgress - Optional progress callback (0-1)
 */
export async function generateVideo(
  captureFrame: (frameIndex: number) => Promise<HTMLCanvasElement>,
  frameCount: number,
  fps: number = 30,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const frames: Blob[] = []

  // Capture all frames as PNG blobs
  for (let i = 0; i < frameCount; i++) {
    const canvas = await captureFrame(i)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b)
        else reject(new Error("Failed to capture frame"))
      }, "image/png")
    })
    frames.push(blob)
    onProgress?.((i + 1) / frameCount * 0.3) // 30% for frame capture
  }

  // Convert frames to MP4
  const videoBlob = await VideoProcessor.framesToMp4(
    frames,
    fps,
    (p) => onProgress?.(0.3 + p * 0.7) // Remaining 70% for encoding
  )

  onProgress?.(1)
  return videoBlob
}

/**
 * Download a video blob as a file
 * On iOS WebView, uses Web Share API or opens in new tab as fallback
 */
export async function downloadVideo(blob: Blob, filename: string): Promise<DownloadResult> {
  const finalFilename = filename.endsWith(".mp4") ? filename : `${filename}.mp4`

  // On iOS or WebView, try Web Share API first
  if (isIOS() || isWebView()) {
    if (supportsWebShareWithFiles()) {
      try {
        const file = new File([blob], finalFilename, { type: "video/mp4" })
        await navigator.share({
          files: [file],
          title: "Save Video",
        })
        return {
          success: true,
          method: "share",
          message: "Video ready to save!",
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return {
            success: true,
            method: "share",
            message: "Share cancelled",
          }
        }
        console.warn("Web Share failed for video, trying fallback:", error)
      }
    }

    // Fallback: Open video in new tab
    try {
      const url = URL.createObjectURL(blob)
      const newWindow = window.open(url, "_blank")

      if (newWindow) {
        setTimeout(() => URL.revokeObjectURL(url), 60000)
        return {
          success: true,
          method: "open",
          message: "Video opened! Tap and hold to save the video.",
        }
      } else {
        URL.revokeObjectURL(url)
        return {
          success: false,
          method: "none",
          message: "Popup blocked. Please allow popups to save.",
        }
      }
    } catch (error) {
      console.error("Failed to open video:", error)
      return {
        success: false,
        method: "none",
        message: "Failed to save video on this device",
      }
    }
  }

  // Standard download
  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = finalFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return {
      success: true,
      method: "download",
      message: "Video downloaded!",
    }
  } catch (error) {
    console.error("Video download failed:", error)
    return {
      success: false,
      method: "none",
      message: "Failed to download video",
    }
  }
}

/**
 * Share a video using the Web Share API
 */
export async function shareVideo(
  blob: Blob,
  title: string,
  text?: string
): Promise<boolean> {
  if (!navigator.canShare) {
    return false
  }

  const file = new File([blob], "wrapped.mp4", { type: "video/mp4" })
  const shareData = {
    title,
    text: text || "Made with Emoji Studio: https://emojistudio.xyz",
    files: [file],
  }

  if (!navigator.canShare(shareData)) {
    return false
  }

  try {
    await navigator.share(shareData)
    return true
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return true
    }
    console.error("Share failed:", error)
    return false
  }
}
