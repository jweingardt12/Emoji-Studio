// This script directly tests the _x_id extraction and inclusion in the URL

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

// Extract _x_id directly from the curl command
const xIdMatch = testCurl.match(/[?&]_x_id=([^&\s'"]+)/)
const extractedXId = xIdMatch ? xIdMatch[1] : "NOT FOUND"
console.log("\nExtracted _x_id:", extractedXId)

// Generate a canonical URL with the extracted _x_id
const slackUrl = `https://urbankitchens.slack.com/api/emoji.adminList?_x_id=${extractedXId}&slack_route=T0KV71EGN&_x_version_ts=noversion&fp=5c&_x_num_retries=0`
console.log("\nGenerated URL with _x_id:", slackUrl)

// Generate a canonical curl command with the extracted _x_id
const canonicalCurl = `curl --request POST \
  --url '${slackUrl}' \
  --header 'Cookie: d=xoxd-test' \
  --header 'accept: */*' \
  --header 'accept-language: en-US,en;q=0.9' \
  --header 'cache-control: no-cache' \
  --header 'origin: https://urbankitchens.slack.com' \
  --header 'user-agent: Mozilla/5.0' \
  --form token=xoxc-test-token \
  --form page=1 \
  --form count=20000`

console.log("\nGenerated canonical curl:\n", canonicalCurl)

// Check if _x_id is included in the canonical URL
const xIdInCanonical = canonicalCurl.match(/[?&]_x_id=([^&\s'"]+)/)
console.log("\n_x_id in canonical URL:", xIdInCanonical ? xIdInCanonical[1] : "NOT FOUND")
