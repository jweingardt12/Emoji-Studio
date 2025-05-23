import { parseSlackCurl } from "./parse-slack-curl"

/**
 * Normalize a Slack curl command (Chrome or Postman style) to canonical Postman style.
 * Ensures count=20000 is always used.
 * This version fixes the _x_id parameter extraction and inclusion in the URL.
 */
export function normalizeSlackCurl(curlCommand: string): string {
  // Parse the original command
  const parsed = parseSlackCurl(curlCommand)
  if (!parsed.isValid) {
    return curlCommand // fallback to original if parsing fails
  }

  // Extract all form fields from --form or multipart if present
  const formFields: Record<string, string> = {}

  // 1. Look for --form key=value pairs
  const formRegex = /--form\s+['"]?(\w+)=([^'"\s]+)/g
  let match: RegExpExecArray | null
  while ((match = formRegex.exec(curlCommand))) {
    formFields[match[1]] = match[2]
  }

  // 2. Look for multipart fields in --data-raw $'...'
  const dataRawMatch = curlCommand.match(/--data-raw \$'([\s\S]+?)'/)
  if (dataRawMatch) {
    const multipart = dataRawMatch[1]
    // Split by boundary
    const parts = multipart.split(/------[\w-]+/).filter(Boolean)
    for (const part of parts) {
      const nameMatch = part.match(/name="([^"]+)"/)
      if (nameMatch) {
        const name = nameMatch[1]
        // Find the value (after two line breaks)
        const valueMatch = part.match(/\r\n\r\n([\s\S]*?)\r\n?$/)
        if (valueMatch) {
          formFields[name] = valueMatch[1].trim()
        }
      }
    }
  }

  // 3. Ensure count=20000
  formFields["count"] = "20000"

  // 4. Extract _x_id from URL or generate a new one
  let xId = ""

  // First try to extract from URL in parsed data
  if (parsed.url) {
    const xIdMatch = parsed.url.match(/[?&]_x_id=([^&\s'"]+)/)
    if (xIdMatch) {
      xId = xIdMatch[1]
      console.log("Found _x_id in URL:", xId)
    }
  }

  // If not found in URL, try to find in the entire curl command
  if (!xId) {
    const xIdMatch = curlCommand.match(/[?&]_x_id=([^&\s'"]+)/)
    if (xIdMatch) {
      xId = xIdMatch[1]
      console.log("Found _x_id in curl command:", xId)
    }
  }

  // If still not found, try to extract from cookie
  if (!xId && parsed.cookie) {
    const dCookieMatch = parsed.cookie.match(/\bd=([^;\s]+)/)
    if (dCookieMatch) {
      xId = dCookieMatch[1]
      console.log("Using d cookie as _x_id:", xId)
    }
  }

  // If still not found, generate a new one
  if (!xId) {
    const timestamp = Math.floor(Date.now() / 1000)
    const randomHex = Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")
    xId = `${randomHex}-${timestamp}.${Math.floor(Math.random() * 1000)}`
    console.log("Generated new _x_id:", xId)
  }

  // 5. Construct the canonical URL with the _x_id parameter
  const slackUrl = `https://${parsed.workspace}.slack.com/api/emoji.adminList?_x_id=${xId}&slack_route=${parsed.teamId || ""}&_x_version_ts=noversion&fp=5c&_x_num_retries=0`
  console.log("Constructed URL with _x_id:", slackUrl)

  // 6. Build the canonical curl command
  let canonical = `curl --request POST \
  --url '${slackUrl}'`

  // Add cookie header if available
  if (parsed.cookie) {
    canonical += ` \
  --header 'Cookie: ${parsed.cookie}'`
  }

  // Add standard headers
  canonical += ` \
  --header 'accept: */*' \
  --header 'accept-language: en-US,en;q=0.9' \
  --header 'cache-control: no-cache' \
  --header 'origin: https://${parsed.workspace}.slack.com' \
  --header 'user-agent: Mozilla/5.0'`

  // Add token as form data
  const token = parsed.token || formFields["token"] || "xoxc-your-token"
  canonical += ` \
  --form token=${token} \
  --form page=${formFields["page"] || "1"} \
  --form count=20000`

  // Add other form fields if present
  if (formFields["_x_reason"]) {
    canonical += ` \
  --form _x_reason=${formFields["_x_reason"]}`
  }

  if (formFields["_x_mode"]) {
    canonical += ` \
  --form _x_mode=${formFields["_x_mode"]}`
  }

  return canonical
}
