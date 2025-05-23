// This script demonstrates a working curl command for Slack emoji.adminList API based on the Supabase Edge Function example

console.log("Creating a working curl command for Slack emoji.adminList API...")

// Based on the Supabase Edge Function example
const workingCurl = `curl --request POST \
  --url 'https://urbankitchens.slack.com/api/emoji.adminList?_x_id=634fa7ae-1746662526.783&slack_route=T0KV71EGN&_x_version_ts=noversion&fp=5c&_x_num_retries=0' \
  --header 'Cookie: YOUR_COOKIE_HERE' \
  --header 'origin: https://urbankitchens.slack.com' \
  --header 'user-agent: Mozilla/5.0' \
  --form token=YOUR_TOKEN_HERE \
  --form page=1 \
  --form count=20000 \
  --form _x_reason=customize-emoji-new-query \
  --form _x_mode=online`

console.log("\nWorking curl command for Postman:\n")
console.log(workingCurl)

console.log("\n\nTo use this in Postman:")
console.log("1. Copy this curl command")
console.log('2. In Postman, click "Import" > "Raw text" and paste the curl command')
console.log("3. Replace YOUR_COOKIE_HERE with your actual Slack cookie")
console.log("4. Replace YOUR_TOKEN_HERE with your actual Slack token")
console.log(
  "\nThis format works because it uses the standard --form parameter instead of multipart/form-data with boundary",
)
