import { toPng, toBlob, toCanvas, toJpeg } from "html-to-image"
import GIF from "gif.js"
import { VideoProcessor } from "./video-processor"

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
 * Copy an image blob to the clipboard
 */
export async function copyImageToClipboard(blob: Blob): Promise<void> {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ])
  } catch (error) {
    // Fallback for browsers that don't support ClipboardItem with images
    console.error("Failed to copy image to clipboard:", error)
    throw new Error("Your browser doesn't support copying images to clipboard")
  }
}

/**
 * Download an image blob as a file
 */
export function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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
 */
export function downloadGif(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".gif") ? filename : `${filename}.gif`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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
 */
export function downloadVideo(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".mp4") ? filename : `${filename}.mp4`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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
