/**
 * Direct implementation of normalizeSlackCurl that ensures the _x_id parameter is included in the URL
 */
function directNormalizeSlackCurl(curlCommand) {
  // Extract _x_id directly from the curl command
  const xIdMatch = curlCommand.match(/[?&]_x_id=([^&\s'"]+)/)
  const xId = xIdMatch ? xIdMatch[1] : generateXId()
  console.log("Directly extracted _x_id:", xId)

  // Extract workspace and team_id
  const workspaceMatch = curlCommand.match(/https:\/\/([^.]+)\.slack\.com/)
  const workspace = workspaceMatch ? workspaceMatch[1] : "workspace"

  const teamIdMatch = curlCommand.match(/slack_route=([^&\s'"]+)/)
  const teamId = teamIdMatch ? teamIdMatch[1] : ""

  // Extract token
  let token = "xoxc-your-token"
  const tokenFormMatch = curlCommand.match(/--form\s+token=([^\s'"]+)/)
  const tokenQuotedMatch =
    curlCommand.match(/--form\s+['"](token)=([^'"]+)['"]/) ||
    curlCommand.match(/-F\s+['"](token)=([^'"]+)['"]/) ||
    curlCommand.match(/name="token"[\s\S]*?\r\n\r\n([\s\S]*?)\r\n/)
  const tokenXoxcMatch = curlCommand.match(/xoxc-[0-9]+-[0-9]+-[0-9]+-[0-9a-f]+/)

  if (tokenFormMatch) {
    token = tokenFormMatch[1]
  } else if (tokenQuotedMatch) {
    token = tokenQuotedMatch[2] || tokenQuotedMatch[1]
  } else if (tokenXoxcMatch) {
    token = tokenXoxcMatch[0]
  }

  // Extract cookie
  let cookie = ""
  const cookieMatch =
    curlCommand.match(/-b\s+['"](.*?)['"]/i) ||
    curlCommand.match(/--cookie\s+['"](.*?)['"]/i) ||
    curlCommand.match(/-H\s+['"](Cookie|cookie):\s*(.*?)['"]/i)
  if (cookieMatch) {
    cookie = cookieMatch[2] || cookieMatch[1]
  }

  // Construct the URL with the _x_id parameter
  const slackUrl = `https://${workspace}.slack.com/api/emoji.adminList?_x_id=${xId}&slack_route=${teamId}&_x_version_ts=noversion&fp=5c&_x_num_retries=0`
  console.log("Constructed URL with _x_id:", slackUrl)

  // Build the canonical curl command
  let canonical = `curl --request POST \
  --url '${slackUrl}'`

  // Add cookie header if available
  if (cookie) {
    canonical += ` \
  --header 'Cookie: ${cookie}'`
  }

  // Add standard headers
  canonical += ` \
  --header 'accept: */*' \
  --header 'accept-language: en-US,en;q=0.9' \
  --header 'cache-control: no-cache' \
  --header 'origin: https://${workspace}.slack.com' \
  --header 'user-agent: Mozilla/5.0'`

  // Add form data
  canonical += ` \
  --form token=${token} \
  --form page=1 \
  --form count=20000`

  // Add other form fields if present
  if (curlCommand.includes("_x_reason")) {
    canonical += ` \
  --form _x_reason=customize-emoji-new-query`
  }

  if (curlCommand.includes("_x_mode")) {
    canonical += ` \
  --form _x_mode=online`
  }

  return canonical
}

/**
 * Generate a new _x_id similar to Slack's format
 */
function generateXId() {
  const timestamp = Math.floor(Date.now() / 1000)
  const randomHex = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")
  return `${randomHex}-${timestamp}.${Math.floor(Math.random() * 1000)}`
}

module.exports = { directNormalizeSlackCurl }
