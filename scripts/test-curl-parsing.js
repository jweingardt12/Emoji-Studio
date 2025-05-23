// This script tests the curl command parsing to ensure it correctly extracts all necessary fields

// Import the parseSlackCurl function from the lib/utils/parse-slack-curl.js file
const { normalizeSlackCurl } = require("../lib/utils/normalize-slack-curl.js")

// Sample curl command from the Supabase Edge Function example
const edgeFunctionCurl = `curl --request POST \
  --url 'https://urbankitchens.slack.com/api/emoji.adminList?_x_id=634fa7ae-1746662526.783&slack_route=T0KV71EGN&_x_version_ts=noversion&fp=4c&_x_num_retries=0' \
  --header 'cookie: YOUR_COOKIE_HERE' \
  --header 'origin: https://urbankitchens.slack.com' \
  --header 'user-agent: Mozilla/5.0' \
  --form token=YOUR_TOKEN_HERE \
  --form page=1 \
  --form count=20000 \
  --form _x_reason=customize-emoji-new-query \
  --form _x_mode=online`

// Original curl command with multipart/form-data
const originalCurl = `curl 'https://urbankitchens.slack.com/api/emoji.adminList?_x_id=7ec08bbd-1747751651.513&slack_route=T0KV71EGN&_x_version_ts=noversion&fp=5c&_x_num_retries=0' \
  -H 'accept: */*' \
  -H 'accept-language: en-US,en;q=0.9' \
  -H 'cache-control: no-cache' \
  -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundaryfrnG03lNvmZYvVuk' \
  -b 'd-s=1713281859; b=.09d135ae70f5c638bcd26df652ab436b; utm=%7B%7D; _gcl_au=1.1.465713859.1747408281; OptanonConsent=isGpcEnabled=1&datestamp=Fri+May+16+2025+14%3A53%3A17+GMT-0400+(Eastern+Daylight+Time)&version=202402.1.0&groups=1%3A1%2C3%3A1%2C2%3A1%2C4%3A0&consentId=6eb84a58-b537-4cf0-be37-d8daed754577&hosts=; d=xoxd-hgLNkw5LPzfp7iilm7aAGoL6CEm5EsDRd2EK%2BprZyuy5p%2FujtUlE5bpyzmffcA%2Fv6bKX5KRzNhNUUtvt1o3a%2ByQzzcDxvvCBn1ObUBfbvjAZ%2BFdZiJQRj%2FRQ4JZerGiOQC6KHbT7LZfZSS%2BrNiBTP%2FD758fa3BlAwRbfRmZEDKOi0TSZ63j0mWhvWX7kDhf6ETBqzipOEw%3D%3D; x=09d135ae70f5c638bcd26df652ab436b.1747751640; PageCount=41' \
  -H 'dnt: 1' \
  -H 'origin: https://urbankitchens.slack.com' \
  -H 'pragma: no-cache' \
  -H 'priority: u=1, i' \
  -H 'sec-ch-ua: "Not.A/Brand";v="99", "Chromium";v="136"' \
  -H 'sec-ch-ua-mobile: ?1' \
  -H 'sec-ch-ua-platform: "Android"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'sec-gpc: 1' \
  -H 'user-agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36' \
  --data-raw $'------WebKitFormBoundaryfrnG03lNvmZYvVuk\r\nContent-Disposition: form-data; name="token"\r\n\r\nxoxc-19993048566-1485274920231-7263455073525-54b90a11600ba25a1544841b6e319b0fbc85e5f8d2e38856fba0517eb5035f96\r\n------WebKitFormBoundaryfrnG03lNvmZYvVuk\r\nContent-Disposition: form-data; name="page"\r\n\r\n1\r\n------WebKitFormBoundaryfrnG03lNvmZYvVuk\r\nContent-Disposition: form-data; name="count"\r\n\r\n100\r\n------WebKitFormBoundaryfrnG03lNvmZYvVuk\r\nContent-Disposition: form-data; name="_x_reason"\r\n\r\ncustomize-emoji-new-query\r\n------WebKitFormBoundaryfrnG03lNvmZYvVuk\r\nContent-Disposition: form-data; name="_x_mode"\r\n\r\nonline\r\n------WebKitFormBoundaryfrnG03lNvmZYvVuk--\r\n'`

console.log("Testing curl command parsing...")

// Parse the Edge Function curl command
console.log("\nEdge Function curl command:")
console.log(edgeFunctionCurl)

// Extract _x_id directly from the curl command
const edgeFunctionXIdMatch = edgeFunctionCurl.match(/[?&]_x_id=([^&\s'"]+)/)
const edgeFunctionXId = edgeFunctionXIdMatch ? edgeFunctionXIdMatch[1] : "generated-id"
console.log("Extracted _x_id from Edge Function curl:", edgeFunctionXId)

// Use the normalizeSlackCurl function
const edgeFunctionCanonical = normalizeSlackCurl(edgeFunctionCurl)
console.log("\nCanonical Edge Function curl:")
console.log(edgeFunctionCanonical)

// Parse the original curl command
console.log("\nOriginal curl command:")
console.log(originalCurl)

// Extract _x_id directly from the original curl command
const originalXIdMatch = originalCurl.match(/[?&]_x_id=([^&\s'"]+)/)
const originalXId = originalXIdMatch ? originalXIdMatch[1] : "generated-id"
console.log("Extracted _x_id from original curl:", originalXId)

// Use the normalizeSlackCurl function
const originalCanonical = normalizeSlackCurl(originalCurl)
console.log("\nCanonical original curl:")
console.log(originalCanonical)

console.log("\nTest completed. Check that both canonical curl commands include:")
console.log("1. A valid _x_id parameter in the URL")
console.log("2. The token form field")
console.log("3. count=20000 form field")
console.log("4. All required headers (Cookie, origin, user-agent)")
