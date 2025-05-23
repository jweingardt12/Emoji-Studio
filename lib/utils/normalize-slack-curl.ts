import { parseSlackCurl } from "./parse-slack-curl"

/**
 * Normalize a Slack curl command (Chrome or Postman style) to canonical Postman style.
 * Ensures count=20000 is always used.
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
  const formRegex = /--form\s+['"](\w+)=([^'"\s]+)/g
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
        // Find the value (after two line breaks)
        const valueMatch = part.match(/\r\n\r\n([\s\S]*?)\r\n?$/)
        if (valueMatch) {
          formFields[nameMatch[1]] = valueMatch[1].trim()
        }
      }
    }
  }

  // 3. Ensure count=20000
  formFields["count"] = "20000"

  // 4. Extract _x_id directly from the curl command
  // This is the most reliable approach based on our testing
  let xId = ""
  const directXIdMatch = curlCommand.match(/[?&]_x_id=([^&\s'"]+)/)
  if (directXIdMatch) {
    xId = directXIdMatch[1]
    console.log("Directly extracted _x_id from curl command:", xId)
  } else if (parsed.xId) {
    // Fallback to parsed.xId if available
    xId = parsed.xId
    console.log("Using _x_id from parsed data:", xId)
  } else {
    // Generate a new one if all else fails
    const timestamp = Math.floor(Date.now() / 1000)
    const randomHex = Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")
    xId = `${randomHex}-${timestamp}.${Math.floor(Math.random() * 1000)}`
    console.log("Generated new _x_id:", xId)
  }

  // Construct the URL with the _x_id parameter
  const slackUrl = `https://${parsed.workspace}.slack.com/api/emoji.adminList?_x_id=${xId}&slack_route=${parsed.teamId || ""}&_x_version_ts=noversion&fp=5c&_x_num_retries=0`
  console.log("Constructed URL with _x_id:", slackUrl)

  // Start building the canonical curl command
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
