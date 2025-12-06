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
 * Fetch emoji data using mobile-provided credentials
 * This function is called when the iOS app opens the wrapped page with auth params
 */
export async function fetchEmojiDataWithMobileAuth(
  params: MobileAuthParams
): Promise<Emoji[]> {
  const { token, userId, teamId, cookie } = params

  console.log("[MobileFetch] Starting emoji fetch with mobile auth")
  console.log("[MobileFetch] TeamId:", teamId)
  console.log("[MobileFetch] UserId:", userId)
  console.log("[MobileFetch] Token prefix:", token.substring(0, 15) + "...")
  console.log("[MobileFetch] Cookie present:", !!cookie)

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

    console.log("[MobileFetch] Sending request to API proxy")

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
    console.log("[MobileFetch] Received response:", Object.keys(data))

    // Handle different response formats
    let emojis: Emoji[] = []

    if (data.emojis && Array.isArray(data.emojis)) {
      emojis = data.emojis
    } else if (data.emoji && Array.isArray(data.emoji)) {
      emojis = data.emoji
    } else if (data.emoji_list && Array.isArray(data.emoji_list)) {
      emojis = data.emoji_list
    }

    console.log("[MobileFetch] Processed", emojis.length, "emojis")

    // Dispatch event to notify EmojiDataProvider
    if (emojis.length > 0) {
      // Store workspace info
      localStorage.setItem("workspace", teamId)
      localStorage.setItem("mobileUserId", userId)

      // Dispatch the emojiDataUpdated event that EmojiDataProvider listens for
      window.dispatchEvent(
        new CustomEvent("emojiDataUpdated", {
          detail: {
            emojiData: emojis,
            workspace: teamId,
            timestamp: Date.now(),
          },
        })
      )

      console.log("[MobileFetch] Dispatched emojiDataUpdated event")
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
