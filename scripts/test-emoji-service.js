/**
 * Test script for the emoji service with direct extraction of _x_id
 */

// Import the direct implementation of normalizeSlackCurl
const { directNormalizeSlackCurl } = require("../lib/utils/direct-normalize-slack-curl.js")

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

// Simulate the parseCurlToRequest function
function parseCurlToRequest(curlCommand) {
  // Extract URL
  const urlMatch = curlCommand.match(/curl\s+['"](https?:\/\/[^'"]+)['"]/)
  const url = urlMatch ? urlMatch[1] : null

  // Extract _x_id
  const xIdMatch = url ? url.match(/[?&]_x_id=([^&\s'"]+)/) : null
  const xId = xIdMatch ? xIdMatch[1] : null
  console.log("Extracted _x_id from URL:", xId)

  // Extract headers
  const headers = {}
  const headerMatches = curlCommand.matchAll(
    /-H\s+['"](.*?):\s*(.*?)['"]|--header\s+['"](.*?):\s*(.*?)['"]|--header\s+['"]([^:]+):\s*([^'"]+)['"]|--header\s+([^\s]+)=([^\s]+)/g,
  )
  for (const match of headerMatches) {
    const key = match[1] || match[3] || match[5] || match[7]
    const value = match[2] || match[4] || match[6] || match[8]
    if (key && value) {
      headers[key] = value
    }
  }

  // Extract form data
  const formData = {}
  const formMatches = curlCommand.matchAll(
    /--form\s+([^=]+)=([^\s]+)|--form\s+['"](.*?)=([^'"]+)['"]|-F\s+['"](.*?)=([^'"]+)['"]|-F\s+([^=]+)=([^\s]+)/g,
  )
  for (const match of formMatches) {
    const key = match[1] || match[3] || match[5] || match[7]
    const value = match[2] || match[4] || match[6] || match[8]
    if (key && value) {
      formData[key] = value
    }
  }

  return { url, method: "POST", headers, formData }
}

// Simulate the fetchSlackEmojis function
function simulateFetchSlackEmojis(curlCommand) {
  console.log("\nSimulating fetchSlackEmojis with curl command:\n", curlCommand)

  // Extract _x_id directly from the curl command
  const xIdMatch = curlCommand.match(/[?&]_x_id=([^&\s'"]+)/)
  const xId = xIdMatch ? xIdMatch[1] : generateXId()
  console.log(xIdMatch ? "Extracted _x_id =" : "Generated new _x_id =", xId)

  // Function to generate a new _x_id similar to Slack's format
  function generateXId() {
    const timestamp = Math.floor(Date.now() / 1000)
    const randomHex = Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")
    return `${randomHex}-${timestamp}.${Math.floor(Math.random() * 1000)}`
  }

  // Convert curl command to request object
  const request = parseCurlToRequest(curlCommand)

  // Ensure _x_id is included in the URL if it was found
  if (xId && request.url && !request.url.includes(`_x_id=${xId}`)) {
    // Add or replace _x_id in the URL
    if (request.url.includes("_x_id=")) {
      request.url = request.url.replace(/(_x_id=)[^&]+/, `$1${xId}`)
    } else {
      const separator = request.url.includes("?") ? "&" : "?"
      request.url = `${request.url}${separator}_x_id=${xId}`
    }
    console.log("Updated URL with _x_id =", request.url)
  }

  console.log("Parsed request.url =", request.url)
  console.log("Full parsed request =", JSON.stringify(request, null, 2))

  // Check if _x_id is in the final URL
  const finalXIdMatch = request.url ? request.url.match(/[?&]_x_id=([^&\s'"]+)/) : null
  if (finalXIdMatch) {
    console.log("\nSUCCESS: _x_id is correctly included in the final URL:", finalXIdMatch[1])
  } else {
    console.log("\nERROR: _x_id is missing from the final URL!")
  }

  return request
}

// Test with direct extraction
console.log("\n=== Testing with direct extraction ===")
let simulateSlackRequest = simulateFetchSlackEmojis(testCurl)

// Test with direct normalization
console.log("\n=== Testing with direct normalization ===")
const normalizedCurl = directNormalizeSlackCurl(testCurl)
console.log("\nNormalized curl command:\n", normalizedCurl)

// Test with a curl command that doesn't have _x_id
const testCurlNoXId = testCurl.replace(/_x_id=[^&]+/, "")
console.log("\n=== Testing with curl command without _x_id ===")
console.log("\nCurl command without _x_id:\n", testCurlNoXId)
simulateSlackRequest = simulateFetchSlackEmojis(testCurlNoXId)
