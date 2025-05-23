// This script directly tests and fixes the _x_id extraction and URL generation

// Import the parseSlackCurl function
const { parseSlackCurl } = require("../lib/utils/parse-slack-curl.js")

// Sample curl command with _x_id
const testCurl = `curl 'https://urbankitchens.slack.com/api/emoji.adminList?_x_id=7ec08bbd-1747751651.513&slack_route=T0KV71EGN&_x_version_ts=noversion&fp=5c&_x_num_retries=0' \
  -H 'accept: */*' \
  -H 'accept-language: en-US,en;q=0.9' \
  -H 'cookie: d=xoxd-test' \
  -H 'origin: https://urbankitchens.slack.com' \
  -H 'user-agent: Mozilla/5.0' \
  --form token=xoxc-test-token \
  --form page=1 \
  --form count=100`

console.log("Original curl command:\n", testCurl)

// Parse the curl command
console.log("\nParsing curl command...")
const parsed = parseSlackCurl(testCurl)
console.log("Parsed result:", JSON.stringify(parsed, null, 2))

// Manually generate a canonical curl command with the _x_id parameter
const generateCanonicalCurl = (parsedData) => {
  // Extract or generate _x_id
  let xId = ""

  // Try to extract from URL
  if (parsedData.url) {
    const xIdMatch = parsedData.url.match(/[?&]_x_id=([^&\s'"]+)/)
    if (xIdMatch) {
      xId = xIdMatch[1]
      console.log("Found _x_id in URL:", xId)
    }
  }

  // If not found, use the one from parsed data
  if (!xId && parsedData.xId) {
    xId = parsedData.xId
    console.log("Using _x_id from parsed data:", xId)
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

  // Construct the URL with the _x_id parameter
  const slackUrl = `https://${parsedData.workspace}.slack.com/api/emoji.adminList?_x_id=${xId}&slack_route=${parsedData.teamId || ""}&_x_version_ts=noversion&fp=5c&_x_num_retries=0`
  console.log("Constructed URL:", slackUrl)

  // Start building the canonical curl command
  let canonical = `curl --request POST \
  --url '${slackUrl}'`

  // Add cookie header if available
  if (parsedData.cookie) {
    canonical += ` \
  --header 'Cookie: ${parsedData.cookie}'`
  }

  // Add standard headers
  canonical += ` \
  --header 'accept: */*' \
  --header 'accept-language: en-US,en;q=0.9' \
  --header 'cache-control: no-cache' \
  --header 'origin: https://${parsedData.workspace}.slack.com' \
  --header 'user-agent: Mozilla/5.0'`

  // Add token as form data
  canonical += ` \
  --form token=${parsedData.token || "xoxc-your-token"} \
  --form page=1 \
  --form count=20000`

  return canonical
}

// Generate and print the canonical curl command
const canonicalCurl = generateCanonicalCurl(parsed)
console.log("\nGenerated canonical curl:\n", canonicalCurl)

// Check if _x_id is included in the canonical URL
const xIdInCanonical = canonicalCurl.match(/[?&]_x_id=([^&\s'"]+)/)
console.log("\n_x_id in canonical URL:", xIdInCanonical ? xIdInCanonical[1] : "NOT FOUND")

// Export the function for use in the actual code
module.exports = { generateCanonicalCurl }
