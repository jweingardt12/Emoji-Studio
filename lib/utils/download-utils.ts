import type JSZip from 'jszip'

export interface EmojiToDownload {
  name: string
  url: string
  is_alias?: boolean | number
}

export interface DownloadResult {
  zip: JSZip
  errors: string[]
  successCount: number
}

export interface DownloadOptions {
  batchSize?: number
  onProgress?: (processed: number, total: number) => void
  signal?: AbortSignal
}

/**
 * Fetches a single emoji image and returns the blob with metadata
 */
async function fetchEmojiImage(
  emoji: EmojiToDownload,
  signal?: AbortSignal
): Promise<{ name: string; blob: Blob; extension: string } | null> {
  try {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(emoji.url)}`
    const response = await fetch(proxyUrl, { signal })

    if (!response.ok) {
      return null
    }

    const blob = await response.blob()

    // Determine file extension from content-type
    let extension = '.png'
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('gif')) extension = '.gif'
    else if (contentType?.includes('jpeg')) extension = '.jpg'

    // Sanitize filename
    const safeName = emoji.name.replace(/[^a-zA-Z0-9_\-]/g, '_')

    return { name: safeName, blob, extension }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error // Re-throw abort errors
    }
    console.error(`Failed to download ${emoji.name}:`, error)
    return null
  }
}

/**
 * Downloads emojis in parallel batches for better performance
 *
 * @param emojis - Array of emojis to download
 * @param options - Configuration options
 * @returns Promise with zip file, error list, and success count
 */
export async function downloadEmojisInParallel(
  emojis: EmojiToDownload[],
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  const {
    batchSize = 10,
    onProgress,
    signal
  } = options

  // Dynamically import JSZip to reduce bundle size
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  const errors: string[] = []
  let processed = 0
  let successCount = 0

  // Filter out aliases (is_alias can be boolean or number)
  const validEmojis = emojis.filter(
    emoji => !emoji.is_alias && emoji.is_alias !== 1 && !emoji.url.startsWith('alias:')
  )

  const total = validEmojis.length

  // Process in batches
  for (let i = 0; i < validEmojis.length; i += batchSize) {
    // Check for abort signal
    if (signal?.aborted) {
      throw new DOMException('Download cancelled', 'AbortError')
    }

    const batch = validEmojis.slice(i, i + batchSize)

    // Fetch all emojis in batch concurrently
    const results = await Promise.all(
      batch.map(emoji => fetchEmojiImage(emoji, signal))
    )

    // Add successful results to zip
    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      if (result) {
        zip.file(`${result.name}${result.extension}`, result.blob)
        successCount++
      } else {
        errors.push(batch[j].name)
      }
    }

    // Update progress after each batch
    processed += batch.length
    onProgress?.(processed, total)
  }

  return { zip, errors, successCount }
}

/**
 * Generates and saves a zip file from the download result
 */
export async function saveZipFile(
  zip: JSZip,
  filename: string
): Promise<void> {
  const { saveAs } = await import('file-saver')
  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, filename)
}
