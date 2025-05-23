export interface Emoji {
  name: string
  is_alias: number
  alias_for?: string
  url: string
  team_id: string
  user_id: string
  created: number
  is_bad: boolean
  user_display_name: string
  can_delete: boolean
  synonyms?: string[]
}

export interface UserWithEmojiCount {
  user_id: string
  user_display_name: string
  emoji_count: number
  most_recent_emoji_timestamp: number
  oldest_emoji_timestamp: number
  l4wepw: number // Last 4 Weeks Emojis Per Week
  l4wepwChange: number // Percentage change in L4WEPW
  rank?: number // User's position on the leaderboard
}

export interface EmojiStats {
  totalEmojis: number
  totalCreators: number
  mostRecent: string
  mostRecentTimestamp: number
  emojisPerUser: number
  weeklyEmojisChange: number
}

export interface SlackCurlRequest {
  url: string
  method: string
  headers: Record<string, string>
  formData?: Record<string, string>
  data?: string
}

/**
 * Function to generate a new _x_id similar to Slack's format
 */
function generateXId() {
  const timestamp = Math.floor(Date.now() / 1000)
  const randomHex = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")
  return `${randomHex}-${timestamp}.${Math.floor(Math.random() * 1000)}`
}

/**
 * Fetches emoji data from Slack using the provided curl command
 */
export async function fetchSlackEmojis(curlCommand: string): Promise<Emoji[]> {
  try {
    console.log("fetchSlackEmojis: incoming curlCommand:\n", curlCommand)

    // Extract _x_id directly from the curl command to ensure it's included
    const xIdMatch = curlCommand.match(/[?&]_x_id=([^&\s'"]+)/)
    const xId = xIdMatch ? xIdMatch[1] : generateXId()
    console.log("fetchSlackEmojis: extracted/generated _x_id =", xId)

    // Convert curl command to request object
    const request = parseCurlToRequest(curlCommand)

    // Ensure _x_id is included in the URL if it was found
    if (xId && request.url) {
      // Always ensure the URL has the _x_id parameter
      if (request.url.includes("_x_id=")) {
        // Replace existing _x_id
        request.url = request.url.replace(/(_x_id=)[^&]+/, `$1${xId}`)
      } else {
        // Add _x_id if not present
        const separator = request.url.includes("?") ? "&" : "?"
        request.url = `${request.url}${separator}_x_id=${xId}`
      }
      console.log("fetchSlackEmojis: updated URL with _x_id =", request.url)
    }

    console.log("fetchSlackEmojis: parsed request.url =", request.url)
    console.log("fetchSlackEmojis: full parsed request =", request)
    if (!request.url) {
      throw new Error(`Invalid request object: missing URL. Parsed URL="${request.url}"`)
    }

    // Make the request to our backend proxy
    console.log("fetchSlackEmojis: making request to backend proxy with request:", JSON.stringify(request, null, 2))
    const response = await fetch("/api/slack-emojis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ curlRequest: request }),
    })
    console.log("fetchSlackEmojis: received response with status:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
      console.error("fetchSlackEmojis: Error from API:", errorData)
      throw new Error(`Error from Slack API: ${errorData.error || response.statusText}`)
    }

    const data = await response.json()
    console.log("fetchSlackEmojis: response data:", data)

    if (data.error) {
      console.error("fetchSlackEmojis: Error in response data:", data.error)
      console.log("fetchSlackEmojis: Full Slack response:", data.slackResponse || "No Slack response data")
    }

    if (!data.emoji || (Array.isArray(data.emoji) && data.emoji.length === 0)) {
      console.warn("fetchSlackEmojis: No emoji data returned")
      if (data.slackResponse) {
        console.log("fetchSlackEmojis: Examining Slack response for emoji data...")
        const slackData = data.slackResponse
        console.log("fetchSlackEmojis: Slack response keys:", Object.keys(slackData))

        if (slackData.emoji) {
          console.log("fetchSlackEmojis: Slack response contains emoji data of type:", typeof slackData.emoji)
          if (typeof slackData.emoji === "object" && !Array.isArray(slackData.emoji)) {
            console.log("fetchSlackEmojis: Converting emoji object to array...")
            const emojiArray = Object.entries(slackData.emoji).map(([name, url]) => ({
              name,
              url,
              is_alias: 0,
              user_id: "",
              created: 0,
              team_id: "",
              is_bad: false,
              user_display_name: "",
              can_delete: false,
            })) as Emoji[]
            return emojiArray
          }
        }
      }
    }

    // Check for emoji array
    if (!data.emoji || !Array.isArray(data.emoji)) {
      throw new Error(`No emoji data found in response: ${JSON.stringify(data)}`)
    }

    // Use the emoji array directly
    return data.emoji as Emoji[]
  } catch (error) {
    console.error("Error fetching emoji data:", error)
    throw error
  }
}

/**
 * Parses a curl command into a request object
 */
/**
 * Parses a curl command into a request object
 */
/**
 * Parses a curl command into a request object
 */
export function parseCurlToRequest(curlCommand: string): SlackCurlRequest {
  try {
    // Collapse escaped newlines so URL is contiguous
    const cmd = curlCommand.replace(/\s*\n/g, " ");
    console.log("parseCurlToRequest: Processing curl command (length):", curlCommand.length);

    // Extract the URL
    const urlMatch = cmd.match(/curl\s+['"](https?:[^'"]+)['"]/i) || 
                   cmd.match(/--url\s+['"](https?:[^'"]+)['"]/i);
    let url = "";
    if (urlMatch) {
      url = urlMatch[1];
    } else {
      // Try to find a URL without quotes
      const unquotedUrlMatch = cmd.match(/curl\s+(https?:[^\s]+)/i);
      if (unquotedUrlMatch) {
        url = unquotedUrlMatch[1];
      } else {
        // Last resort: find any URL in the command
        const genericUrlMatch = cmd.match(/(https?:[^\s'"]+)/i);
        if (genericUrlMatch) {
          url = genericUrlMatch[0];
        }
      }
    }
    console.log("parseCurlToRequest: extracted url =", url);

    // Extract method (default to POST for form data)
    const methodMatch = cmd.match(/--request\s+([A-Z]+)/i) || cmd.match(/-X\s+([A-Z]+)/i);
    const hasFormData = cmd.includes("--form") || cmd.includes("-F");
    let method = methodMatch ? methodMatch[1] : hasFormData ? "POST" : "GET";

    // PATCH: Always use POST for Slack emoji endpoints unless explicitly specified
    const isEmojiEndpoint = url.includes("/emoji.") || url.includes("/api/emoji") || Boolean(url.match(/emoji\.[a-zA-Z]+/));
    if (isEmojiEndpoint && !methodMatch) {
      method = "POST";
      console.log("parseCurlToRequest: Using POST method for emoji endpoint");
    }

    // Extract headers
    const headers: Record<string, string> = {};

    // Match headers with different patterns
    const headerPatterns = [/--header\s+['"](\S+):\s*([^'"]+)['"]*/gi, /-H\s+['"](\S+):\s*([^'"]+)['"]*/gi];

    for (const pattern of headerPatterns) {
      const headerMatches = Array.from(cmd.matchAll(pattern));
      for (const match of headerMatches) {
        if (match[1] && match[2]) {
          headers[match[1].trim()] = match[2].trim();
        }
      }
    }

    // Extract cookie from -b or --cookie flag if not already in headers
    if (!headers["Cookie"] && !headers["cookie"]) {
      const cookieMatch = cmd.match(/-b\s+['"](\S+)['"]*/i) || cmd.match(/--cookie\s+['"](\S+)['"]*/i);
      if (cookieMatch && cookieMatch[1]) {
        headers["Cookie"] = cookieMatch[1].trim();
      }
    }

    // If content-type is not specified but we have form data, set it
    if (hasFormData && !headers["content-type"] && !headers["Content-Type"]) {
      headers["content-type"] = "multipart/form-data";
    }

    // Extract form data if present (multipart/form-data)
    const formData: Record<string, string> = {};

    // Match form data with different patterns
    const formPatterns = [
      /--form\s+([^=]+)=([^\s]+)/gi,
      /-F\s+['"]*([^=]+)=([^\s'"]+)['"]*/gi,
      /--form\s+['"](\S+)=([^'"]+)['"]*/gi,
    ];

    for (const pattern of formPatterns) {
      const formMatches = Array.from(cmd.matchAll(pattern));
      for (const match of formMatches) {
        if (match[1] && match[2]) {
          formData[match[1].trim()] = match[2].trim();
        }
      }
    }

    // Extract data if present (application/x-www-form-urlencoded or application/json)
    const dataPatterns = [/--data\s+['"](\S+)['"]*/i, /--data-raw\s+['"](\S+)['"]*/i, /-d\s+['"](\S+)['"]*/i];

    let data: string | undefined;
    for (const pattern of dataPatterns) {
      const dataMatch = cmd.match(pattern);
      if (dataMatch && dataMatch[1]) {
        data = dataMatch[1];
        break;
      }
    }

    // Ensure we have a token in formData
    if (!formData["token"]) {
      // Try to extract token from the data or URL
      const tokenInUrlMatch = url.match(/[?&]token=([^&\s'"]+)/);
      const tokenInDataMatch = data ? data.match(/token=([^&\s'"]+)/) : null;
      const xoxcMatch = cmd.match(/xoxc-[0-9]+-[0-9]+-[0-9]+-[0-9a-f]+/);

      if (tokenInUrlMatch) {
        formData["token"] = tokenInUrlMatch[1];
        console.log("parseCurlToRequest: Found token in URL");
      } else if (tokenInDataMatch) {
        formData["token"] = tokenInDataMatch[1];
        console.log("parseCurlToRequest: Found token in data");
      } else if (xoxcMatch) {
        formData["token"] = xoxcMatch[0];
        console.log("parseCurlToRequest: Found xoxc token in command");
      }
    }

    // Always ensure count=20000 for emoji requests
    if (url.includes("emoji") && !formData["count"]) {
      formData["count"] = "20000";
    }

    console.log("Parsed URL:", url);
    console.log("Parsed method:", method);
    console.log("Parsed headers count:", Object.keys(headers).length);
    console.log("Parsed form data count:", Object.keys(formData).length);

    // PATCH: If method is GET, do not include body/formData/data (GET must not have a body)
    if (method === "GET") {
      return {
        url,
        method,
        headers,
      };
    }

    return {
      url,
      method,
      headers,
      formData: Object.keys(formData).length > 0 ? formData : undefined,
      data,
    };
  } catch (error) {
    console.error("Error parsing curl command:", error);
    return {
      url: "",
      method: "GET",
      headers: {},
    };
  }
}/**
 * Calculates statistics from emoji data
 */
// Add this function to filter out aliases before calculations
export function filterNonAliasEmojis(emojis: Emoji[]): Emoji[] {
  return emojis.filter((emoji) => !emoji.is_alias)
}

export function calculateEmojiStats(emojis: Emoji[], now: number): EmojiStats {
  // Filter out aliases
  const nonAliasEmojis = filterNonAliasEmojis(emojis)

  // Get unique creators
  const uniqueCreators = new Set(nonAliasEmojis.map((emoji) => emoji.user_id))

  // Find most recent emoji
  const sortedByDate = [...nonAliasEmojis]
    .filter((e) => typeof e.created === "number")
    .sort((a, b) => b.created! - a.created!)
  const mostRecent = sortedByDate.length > 0 ? sortedByDate[0] : null

  // Calculate emojis per user
  const emojisPerUser = uniqueCreators.size > 0 ? nonAliasEmojis.length / uniqueCreators.size : 0

  // Calculate weekly change from real data
  const oneWeekAgo = now - 7 * 24 * 60 * 60
  const twoWeeksAgo = now - 14 * 24 * 60 * 60
  const thisWeek = nonAliasEmojis.filter((e) => typeof e.created === "number" && e.created! >= oneWeekAgo).length
  const lastWeek = nonAliasEmojis.filter(
    (e) => typeof e.created === "number" && e.created! < oneWeekAgo && e.created! >= twoWeeksAgo,
  ).length
  let weeklyEmojisChange = 0
  if (lastWeek > 0) {
    weeklyEmojisChange = ((thisWeek - lastWeek) / lastWeek) * 100
  } else if (thisWeek > 0) {
    weeklyEmojisChange = 100
  }

  return {
    totalEmojis: nonAliasEmojis.length,
    totalCreators: uniqueCreators.size,
    mostRecent: mostRecent ? mostRecent.name : "",
    mostRecentTimestamp: mostRecent && typeof mostRecent.created === "number" ? mostRecent.created : 0,
    emojisPerUser,
    weeklyEmojisChange,
  }
}

/**
 * Generates a user leaderboard from emoji data
 */
export function getUserLeaderboard(emojis: Emoji[], now: number): UserWithEmojiCount[] {
  // Filter out aliases
  const nonAliasEmojis = filterNonAliasEmojis(emojis)

  // Group emojis by user
  const emojisByUser: Record<string, Emoji[]> = {}

  for (const emoji of nonAliasEmojis) {
    if (!emojisByUser[emoji.user_id]) {
      emojisByUser[emoji.user_id] = []
    }
    emojisByUser[emoji.user_id].push(emoji)
  }

  // Calculate stats for each user
  const leaderboard: UserWithEmojiCount[] = []
  const fourWeeksAgo = now - 4 * 7 * 24 * 60 * 60
  const eightWeeksAgo = now - 8 * 7 * 24 * 60 * 60

  for (const [userId, userEmojis] of Object.entries(emojisByUser)) {
    // Skip if no emojis (shouldn't happen, but just in case)
    if (userEmojis.length === 0) continue

    // Get user display name from first emoji
    const userDisplayName = userEmojis[0].user_display_name

    // Find most recent and oldest emoji timestamps
    const timestamps = userEmojis.map((emoji) => emoji.created)
    const mostRecentTimestamp = Math.max(...timestamps)
    const oldestTimestamp = Math.min(...timestamps)

    // Calculate L4WEPW (Last 4 Weeks Emojis Per Week)
    const last4WeeksEmojis = userEmojis.filter((emoji) => emoji.created >= fourWeeksAgo)
    const l4wepw = last4WeeksEmojis.length / 4

    // Calculate previous 4 weeks for comparison
    const previous4WeeksEmojis = userEmojis.filter(
      (emoji) => emoji.created >= eightWeeksAgo && emoji.created < fourWeeksAgo,
    )
    const previous4wepw = previous4WeeksEmojis.length / 4

    // Calculate percentage change
    const l4wepwChange = previous4wepw > 0 ? ((l4wepw - previous4wepw) / previous4wepw) * 100 : 0

    leaderboard.push({
      user_id: userId,
      user_display_name: userDisplayName,
      emoji_count: userEmojis.length,
      most_recent_emoji_timestamp: mostRecentTimestamp,
      oldest_emoji_timestamp: oldestTimestamp,
      l4wepw,
      l4wepwChange,
    })
  }

  // Sort by emoji count, highest first
  return leaderboard.sort((a, b) => b.emoji_count - a.emoji_count)
}
