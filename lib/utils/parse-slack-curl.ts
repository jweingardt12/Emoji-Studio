/**
 * Validates structured Slack auth data (format sent by Chrome extension)
 * @param authData Structured object with token, cookie, workspace, etc.
 * @returns Validated and normalized auth data
 */
export function validateStructuredAuthData(authData: any) {
  // Handle both token formats: 'token' and 'formToken'
  const token = authData.token || authData.formToken || null

  // Handle cookie - can be string or need to extract 'd' value
  let cookie = authData.cookie || null

  // Extract 'd' cookie value if not already in cookie format
  if (authData.d && !cookie) {
    cookie = `d=${authData.d}`
  }

  // Handle workspace/teamId
  const workspace = authData.workspace || authData.teamId || null
  const teamId = authData.teamId || authData.team_id || null

  // Handle xId (various formats)
  const xId = authData.xId || authData._x_id || authData.x_id || null

  // Validate token format (should be xoxc- or xoxd- prefixed for Slack)
  const isValidToken = token && (
    token.startsWith('xoxc-') ||
    token.startsWith('xoxd-') ||
    token.startsWith('xoxb-') ||
    token.startsWith('xoxp-')
  )

  const isValid = !!(
    (token || cookie) &&
    (workspace || teamId)
  )

  if (!isValidToken && token) {
    console.warn('[Auth Validation] Token does not match expected Slack format (xoxc-, xoxd-, etc.)')
  }

  return {
    token,
    cookie,
    workspace,
    teamId,
    xId,
    isValid,
    error: isValid ? null : 'Missing required authentication (token/cookie) or workspace information'
  }
}

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
  } else if (tokenInUrlMatch) {
    token = tokenInUrlMatch[1]
  } else if (tokenInDataMatch) {
    token = tokenInDataMatch[1]
  } else if (tokenInHeaderMatch) {
    token = tokenInHeaderMatch[1]
  } else if (xoxcMatch) {
    token = xoxcMatch[0]
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
  }

  // Extract workspace URL - more flexible pattern
  let workspace = null
  const urlMatch = curlCommand.match(/https:\/\/([^.]+)\.slack\.com/)

  if (urlMatch && urlMatch[1] !== 'app' && urlMatch[1] !== 'api' && urlMatch[1] !== 'files') {
    // Found a real workspace subdomain (not app.slack.com, api.slack.com, etc.)
    workspace = urlMatch[1]
  }

  // If subdomain is "app" or not found, try to extract from slack_route cookie or URL path
  if (!workspace || workspace === 'app') {
    // Try to find workspace in slack_route (format: T0ABC123 or workspace-name)
    const slackRouteMatch = curlCommand.match(/slack_route=([A-Z][A-Z0-9]+)/i)
    if (slackRouteMatch) {
      // This is a team ID, we'll use it as workspace identifier
      workspace = slackRouteMatch[1]
    }
  }

  // Try to find in URL path like /client/T0ABC123/
  if (!workspace || workspace === 'app') {
    const clientPathMatch = curlCommand.match(/\/client\/([A-Z][A-Z0-9]+)/i)
    if (clientPathMatch) {
      workspace = clientPathMatch[1]
    }
  }

  // Try to find team parameter in URL or body
  if (!workspace || workspace === 'app') {
    const teamMatch = curlCommand.match(/[?&]team=([^&\s'"]+)/) ||
                      curlCommand.match(/team_id=([^&\s'"]+)/) ||
                      curlCommand.match(/"team":"([^"]+)"/) ||
                      curlCommand.match(/'team':'([^']+)'/)
    if (teamMatch) {
      workspace = teamMatch[1]
    }
  }

  // Last resort - if URL points to a workspace-specific endpoint
  if (!workspace || workspace === 'app') {
    const apiWorkspaceMatch = curlCommand.match(/https:\/\/([a-zA-Z0-9-]+)\.enterprise\.slack\.com/)
    if (apiWorkspaceMatch) {
      workspace = apiWorkspaceMatch[1]
    }
  }

  // Fallback
  if (!workspace || workspace === 'app') {
    workspace = "workspace"
  }

  // Extract team ID (if present)
  const teamIdExtractMatch = curlCommand.match(/team_id=([^&\s'"]+)/) || curlCommand.match(/slack_route=([^&\s'"]+)/)
  const teamId = teamIdExtractMatch ? teamIdExtractMatch[1] : null

  // Check if this is an emoji-related request - more flexible
  const isEmojiListRequest =
    curlCommand.includes("emoji.list") ||
    curlCommand.includes("emoji.adminList") ||
    curlCommand.includes("/api/emoji") ||
    curlCommand.match(/emoji\.[a-zA-Z]+/)

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
    }
  }

  // If not found in URL, try to find in the entire curl command
  if (!extractedXId) {
    const xIdMatch = curlCommand.match(/[?&]_x_id=([^&\s'"]+)/)
    if (xIdMatch) {
      extractedXId = xIdMatch[1]
    }
  }

  // If still not found, try to extract from cookie
  if (!extractedXId && cookie) {
    const dCookieMatch = cookie.match(/\bd=([^;\s]+)/)
    if (dCookieMatch) {
      extractedXId = dCookieMatch[1]
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
