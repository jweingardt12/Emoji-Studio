/**
 * Mobile Emoji Fetch Service
 * Fetches emoji data using credentials provided by the iOS app
 */

import { Emoji } from "./emoji-service"

interface MobileAuthParams {
  token: string
  userId: string
  teamId: string
  cookie?: string  // Optional: Slack cookie for enhanced auth
}

/**
 * Extract workspace name from teamId or token
 * In Slack, workspace URL is typically derived from team context
 */
function getWorkspaceUrl(teamId: string): string {
  // Use the app subdomain which handles team-based routing
  return `https://edgeapi.slack.com/cache/${teamId}/emojis/list`
}

/**
 * Clear stale emoji data cache before fetching fresh data
 * This ensures mobile users see consistent data with the iOS app
 */
async function clearStaleCaches(): Promise<void> {
  if (typeof window === "undefined") return

  // Clear localStorage emoji caches
  const keysToRemove = [
    "emoji-data-cache",
    "emojiData",
    "emoji-cache",
    "emojis",
    "slack-emojis",
  ]
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key)
    }
  })

  // Clear IndexedDB emoji databases
  try {
    // Check for databases method (not available in all browsers)
    if (window.indexedDB.databases) {
      const databases = await window.indexedDB.databases()
      for (const db of databases) {
        if (db.name && (
          db.name.includes("emoji") ||
          db.name.includes("Emoji") ||
          db.name.includes("slack")
        )) {
          window.indexedDB.deleteDatabase(db.name)
        }
      }
    }
  } catch (e) {
    console.warn("[MobileFetch] Could not enumerate IndexedDB databases:", e)
  }
}

/**
 * Fetch emoji data using mobile-provided credentials
 * This function is called when the iOS app opens the wrapped page with auth params
 */
export async function fetchEmojiDataWithMobileAuth(
  params: MobileAuthParams
): Promise<Emoji[]> {
  const { token, userId, teamId, cookie } = params

  // Clear stale caches before fetching fresh data to ensure consistency
  await clearStaleCaches()

  try {
    // Use the standard Slack Web API endpoint for emoji.adminList
    // This endpoint works with token + cookie auth
    // and returns detailed emoji info including user_id and timestamps
    const apiUrl = `https://slack.com/api/emoji.adminList`

    // Build headers - include cookie if available
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    }

    // Add cookie header if provided (required for Slack xoxc token auth)
    if (cookie) {
      headers["Cookie"] = cookie
    }

    // Build the curl request structure expected by our API proxy
    const curlRequest = {
      url: apiUrl,
      method: "POST",
      headers,
      formData: {
        token: token,
        count: "5000", // Request all emojis
        include_categories: "false",
      },
    }

    const response = await fetch("/api/slack-emojis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ curlRequest }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[MobileFetch] API error:", response.status, errorText)
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    // Handle different response formats
    let emojis: Emoji[] = []

    if (data.emojis && Array.isArray(data.emojis)) {
      emojis = data.emojis
    } else if (data.emoji && Array.isArray(data.emoji)) {
      emojis = data.emoji
    } else if (data.emoji_list && Array.isArray(data.emoji_list)) {
      emojis = data.emoji_list
    }

    // Dispatch event to notify EmojiDataProvider
    if (emojis.length > 0) {
      // Store mobile user ID (workspace name is set by page.tsx from URL params)
      localStorage.setItem("mobileUserId", userId)

      // Dispatch the emojiDataUpdated event that EmojiDataProvider listens for
      // Use stored workspace name if available, otherwise fall back to teamId
      const workspaceName = localStorage.getItem("workspace") || teamId
      window.dispatchEvent(
        new CustomEvent("emojiDataUpdated", {
          detail: {
            emojiData: emojis,
            workspace: workspaceName,
            timestamp: Date.now(),
          },
        })
      )
    }

    return emojis
  } catch (error) {
    console.error("[MobileFetch] Error fetching emoji data:", error)
    throw error
  }
}

/**
 * Check if mobile auth credentials are stored
 */
export function hasMobileAuth(): boolean {
  if (typeof window === "undefined") return false
  const mobileAuth = localStorage.getItem("mobileAuth")
  return !!mobileAuth
}

/**
 * Get stored mobile user ID
 */
export function getMobileUserId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("mobileUserId")
}

/**
 * Clear mobile auth credentials
 */
export function clearMobileAuth(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("mobileAuth")
  localStorage.removeItem("mobileUserId")
}
