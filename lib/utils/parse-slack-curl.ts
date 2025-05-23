/**
 * Parses a Slack curl command to extract token, cookie, and workspace information
 * @param curlCommand The curl command copied from browser dev tools
 * @returns Object containing parsed information
 */
export function parseSlackCurl(curlCommand: string) {
  // Collapse escaped newlines so URLs and flags are contiguous
  const cmd = curlCommand.replace(/\\\s*\n/g, " ")

  // Extract the URL (support both --url and Chrome-style)
  let url: string | null = null
  // Try explicit --url
  let urlExtractMatch = cmd.match(/--url\s+['"]([^'"]+)['"]/i)
  if (!urlExtractMatch) {
    // Try curl '...'
    urlExtractMatch = cmd.match(/curl\s+['"]([^'"]+)['"]/i)
  }
  if (!urlExtractMatch) {
    // Try unquoted curl URL
    urlExtractMatch = cmd.match(/curl[^\s]*\s+(https:\/\/[^\s]+)/i)
  }
  if (urlExtractMatch) {
    url = urlExtractMatch[1]
  }

  // Generic fallback: any https:// URL
  if (!url) {
    const genericUrlMatch = cmd.match(/https:\/\/[^'"\s]+/i)
    if (genericUrlMatch) {
      url = genericUrlMatch[0]
      console.log("Found URL via generic match:", url)
    }
  }

  // Basic validation
  if (!curlCommand || typeof curlCommand !== "string") {
    return {
      token: null,
      cookie: null,
      workspace: null,
      teamId: null,
      xId: null,
      isEmojiListRequest: false,
      isValid: false,
      error: "Empty or invalid curl command",
    }
  }

  // Extract token from various locations
  let token = null

  // Check for token in --form parameter (multipart/form-data)
  const formTokenMatch =
    curlCommand.match(/--form\s+token=([^\s'"]+)/) ||
    curlCommand.match(/--form\s+['"]token=([^'"]+)['"]/) ||
    curlCommand.match(/-F\s+['"]?token=([^\s'"]+)['"]?/)

  // Check for token in URL or data
  const tokenInUrlMatch = curlCommand.match(/[?&]token=([^&\s'"]+)/)
  const tokenInDataMatch =
    curlCommand.match(/--data[^'"]+'[^']*token=([^&']+)/) ||
    curlCommand.match(/--data-raw[^'"]+'[^']*token=([^&']+)/) ||
    curlCommand.match(/-d[^'"]+'[^']*token=([^&']+)/)
  const tokenInHeaderMatch = curlCommand.match(/-H\s+['"]Authorization:\s+Bearer\s+([^'"]+)['"]/)
  const xoxcMatch = curlCommand.match(/xoxc-[0-9]+-[0-9]+-[0-9]+-[0-9a-f]+/)

  if (formTokenMatch) {
    token = formTokenMatch[1]
    console.log("Found token in form data:", token.substring(0, 10) + "...")
  } else if (tokenInUrlMatch) {
    token = tokenInUrlMatch[1]
    console.log("Found token in URL:", token.substring(0, 10) + "...")
  } else if (tokenInDataMatch) {
    token = tokenInDataMatch[1]
    console.log("Found token in data:", token.substring(0, 10) + "...")
  } else if (tokenInHeaderMatch) {
    token = tokenInHeaderMatch[1]
    console.log("Found token in Authorization header:", token.substring(0, 10) + "...")
  } else if (xoxcMatch) {
    token = xoxcMatch[0]
    console.log("Found xoxc token in command:", token.substring(0, 10) + "...")
  }

  // Extract all cookies from -b, --cookie, and all Cookie: headers
  let cookie = null
  const cookieStrings: string[] = []
  // -b or --cookie flag
  const bCookieMatches = [...curlCommand.matchAll(/(?:-b|--cookie)\s+'([^']+)'/g)]
  for (const m of bCookieMatches) {
    cookieStrings.push(m[1])
  }
  // All Cookie: headers
  const headerCookieMatches = [...curlCommand.matchAll(/-H\s+['"]Cookie:\s*([^'"]+)['"]/gi)]
  for (const m of headerCookieMatches) {
    cookieStrings.push(m[1])
  }
  // Fallback: single d=... cookie
  const dCookieMatch = curlCommand.match(/d=[a-zA-Z0-9%_\-+.]+/)
  if (dCookieMatch) {
    cookieStrings.push(dCookieMatch[0])
  }
  if (cookieStrings.length > 0) {
    cookie = cookieStrings.join("; ")
    console.log("Found cookies:", cookie)
  }

  // Extract workspace URL - more flexible pattern
  let workspace = null
  const urlMatch = curlCommand.match(/https:\/\/([^.]+)\.slack\.com/)
  const urlMatch2 = curlCommand.match(/slack\.com\/api\/([^/\s]+)/)

  if (urlMatch) {
    workspace = urlMatch[1]
    console.log("Found workspace:", workspace)
  } else if (urlMatch2 && !workspace) {
    // If we can't find a workspace subdomain, we'll use a default
    workspace = "workspace"
    console.log("Using default workspace name")
  }

  // Extract team ID (if present)
  const teamIdExtractMatch = curlCommand.match(/team_id=([^&\s'"]+)/) || curlCommand.match(/slack_route=([^&\s'"]+)/)
  const teamId = teamIdExtractMatch ? teamIdExtractMatch[1] : null

  if (teamId) {
    console.log("Found team ID:", teamId)
  }

  // Check if this is an emoji-related request - more flexible
  const isEmojiListRequest =
    curlCommand.includes("emoji.list") ||
    curlCommand.includes("emoji.adminList") ||
    curlCommand.includes("/api/emoji") ||
    curlCommand.match(/emoji\.[a-zA-Z]+/)

  if (isEmojiListRequest) {
    console.log("Detected emoji-related request")
  }

  // For demo purposes, we'll be more lenient with validation
  // In a real app, you might want stricter validation
  const isValid = !!(
    // Either token or cookie should be present
    (
      (token || cookie) &&
      // Some indication of workspace
      (workspace || teamId) &&
      // Some indication this is emoji-related
      isEmojiListRequest
    )
  )

  // Extract _x_id from URL if present
  let extractedXId = ""
  if (url) {
    const xIdMatch = url.match(/[?&]_x_id=([^&\s'"]+)/)
    if (xIdMatch) {
      extractedXId = xIdMatch[1]
      console.log("Found _x_id in URL:", extractedXId)
    }
  }

  // If not found in URL, try to find in the entire curl command
  if (!extractedXId) {
    const xIdMatch = curlCommand.match(/[?&]_x_id=([^&\s'"]+)/)
    if (xIdMatch) {
      extractedXId = xIdMatch[1]
      console.log("Found _x_id in curl command:", extractedXId)
    }
  }

  // If still not found, try to extract from cookie
  if (!extractedXId && cookie) {
    const dCookieMatch = cookie.match(/\bd=([^;\s]+)/)
    if (dCookieMatch) {
      extractedXId = dCookieMatch[1]
      console.log("Using d cookie as _x_id:", extractedXId)
    }
  }

  // Fallback to a generated _x_id if none found
  if (!extractedXId) {
    // Generate a timestamp-based _x_id similar to Slack's format
    const timestamp = Math.floor(Date.now() / 1000)
    const randomHex = Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")
    extractedXId = `${randomHex}-${timestamp}.${Math.floor(Math.random() * 1000)}`
    console.log("Generated fallback _x_id:", extractedXId)
  }

  return {
    url,
    token,
    cookie,
    workspace,
    teamId,
    xId: extractedXId,
    isEmojiListRequest,
    isValid,
    error: isValid ? null : !url ? "Missing URL" : "Missing required authentication or workspace information",
  }
}
