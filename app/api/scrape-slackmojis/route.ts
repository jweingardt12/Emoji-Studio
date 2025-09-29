import { NextRequest, NextResponse } from "next/server"

const CACHE = new Map<
  string,
  { data: any; expires: number }
>()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

// Regex pattern to extract emoji data from HTML (same as iOS)
const EMOJI_PATTERN = /<a\s+class="downloader"[^>]*data-emoji-id-name="([0-9]+)-([^"]+)"[^>]*>.*?<img[^>]*src="([^"]+)"[^>]*>/gs

function sanitizeEmojiName(name: string): string {
  let sanitized = name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9-_]/g, "")

  // Collapse multiple separators
  while (sanitized.includes("__")) {
    sanitized = sanitized.replace("__", "_")
  }
  while (sanitized.includes("--")) {
    sanitized = sanitized.replace("--", "-")
  }

  // Trim separators from ends
  sanitized = sanitized.replace(/^[-_]+|[-_]+$/g, "")

  return sanitized
}

async function scrapeEmojis(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; EmojiStudio/1.0)",
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  const html = await response.text()
  const emojis: any[] = []
  const seen = new Set<string>()

  // Reset regex state
  EMOJI_PATTERN.lastIndex = 0

  let match
  while ((match = EMOJI_PATTERN.exec(html)) !== null) {
    const [, id, rawName, imageURL] = match

    const name = sanitizeEmojiName(rawName)
    if (!name) continue // Skip empty names

    // Deduplicate by id|name|imageURL
    const key = `${id}|${name}|${imageURL}`
    if (seen.has(key)) continue
    seen.add(key)

    emojis.push({
      id,
      name,
      imageURL,
      isAnimated: imageURL.toLowerCase().includes(".gif"),
    })
  }

  return emojis
}

async function fetchBufoFromGitHub() {
  const url = "https://api.github.com/repos/knobiknows/all-the-bufo/contents/all-the-bufo"

  const response = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
      "User-Agent": "EmojiStudio/1.0 (Web) BufoFetcher",
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub API failed: ${response.status}`)
  }

  const data: any[] = await response.json()
  const emojis: any[] = []
  const seen = new Set<string>()

  for (const item of data) {
    if (item.type !== "file") continue

    const fileName = item.name.toLowerCase()
    if (!fileName.endsWith(".png") && !fileName.endsWith(".gif")) continue

    const imageURL = item.download_url ||
      `https://raw.githubusercontent.com/knobiknows/all-the-bufo/main/all-the-bufo/${item.name}`

    const baseName = item.name.replace(/\.(png|gif)$/i, "")
    const name = sanitizeEmojiName(baseName)

    // Deduplicate
    const key = `${name}|${imageURL}`
    if (seen.has(key)) continue
    seen.add(key)

    emojis.push({
      id: `bufo-github-${item.sha || name}`,
      name,
      imageURL,
      isAnimated: fileName.endsWith(".gif"),
    })
  }

  return emojis.sort((a, b) => a.name.localeCompare(b.name))
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get("category") || "popular"
  const query = searchParams.get("query")

  const cacheKey = query ? `search-${query}` : category

  // Check cache
  const cached = CACHE.get(cacheKey)
  if (cached && Date.now() < cached.expires) {
    return NextResponse.json(cached.data)
  }

  try {
    let emojis: any[]

    if (category === "bufo") {
      // Special handling for Bufo - use GitHub API
      emojis = await fetchBufoFromGitHub()
    } else {
      let url: string

      if (query) {
        url = `https://slackmojis.com/emojis/search?query=${encodeURIComponent(query)}`
      } else {
        switch (category) {
          case "popular":
            url = "https://slackmojis.com/emojis/popular"
            break
          case "recent":
            url = "https://slackmojis.com/emojis/recent"
            break
          case "memes":
            url = "https://slackmojis.com/categories/3-meme-emojis"
            break
          case "blobcats":
            url = "https://slackmojis.com/categories/25-blob-cats-emojis"
            break
          case "partyparrots":
            url = "https://slackmojis.com/categories/7-party-parrot-emojis"
            break
          default:
            return NextResponse.json(
              { error: "Invalid category" },
              { status: 400 }
            )
        }
      }

      emojis = await scrapeEmojis(url)
    }

    // Cache the result
    CACHE.set(cacheKey, {
      data: emojis,
      expires: Date.now() + CACHE_TTL,
    })

    return NextResponse.json(emojis)
  } catch (error) {
    console.error("Error scraping Slackmojis:", error)
    return NextResponse.json(
      { error: "Failed to fetch emojis" },
      { status: 500 }
    )
  }
}