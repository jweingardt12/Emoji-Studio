// This script debugs the _x_id extraction and inclusion in the canonical URL

// Import the parseSlackCurl and normalizeSlackCurl functions
const { parseSlackCurl } = require("../lib/utils/parse-slack-curl.js")
const { normalizeSlackCurl } = require("../lib/utils/normalize-slack-curl.js")

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

// Normalize the curl command
console.log("\nNormalizing curl command...")
const canonical = normalizeSlackCurl(testCurl)
console.log("Canonical curl:\n", canonical)

// Check if _x_id is included in the canonical URL
const xIdInCanonical = canonical.match(/[?&]_x_id=([^&\s'"]+)/)
console.log("\n_x_id in canonical URL:", xIdInCanonical ? xIdInCanonical[1] : "NOT FOUND")
