/**
 * Test script to verify different Slack API response formats
 */

// Sample Slack API responses for testing
const testResponses = [
  // Format 1: emoji as an object (name -> url mapping)
  {
    ok: true,
    emoji: {
      grinning: "https://emoji.slack-edge.com/T0KV71EGN/grinning/123.png",
      smile: "https://emoji.slack-edge.com/T0KV71EGN/smile/456.png",
      custom_emoji: "https://emoji.slack-edge.com/T0KV71EGN/custom_emoji/789.png",
    },
  },

  // Format 2: emoji_list as an array
  {
    ok: true,
    emoji_list: [
      {
        name: "grinning",
        url: "https://emoji.slack-edge.com/T0KV71EGN/grinning/123.png",
        is_alias: 0,
        user_id: "U12345",
        created: 1620000000,
      },
      {
        name: "smile",
        url: "https://emoji.slack-edge.com/T0KV71EGN/smile/456.png",
        is_alias: 0,
        user_id: "U12345",
        created: 1620000001,
      },
    ],
  },

  // Format 3: adminList response format
  {
    ok: true,
    custom_emoji_total_count: 2,
    custom_emoji_list: [
      {
        name: "custom_emoji1",
        url: "https://emoji.slack-edge.com/T0KV71EGN/custom_emoji1/123.png",
        is_alias: 0,
        user_id: "U12345",
        user_display_name: "User 1",
        created: 1620000000,
        team_id: "T0KV71EGN",
        is_bad: false,
        can_delete: true,
      },
      {
        name: "custom_emoji2",
        url: "https://emoji.slack-edge.com/T0KV71EGN/custom_emoji2/456.png",
        is_alias: 0,
        user_id: "U67890",
        user_display_name: "User 2",
        created: 1620000001,
        team_id: "T0KV71EGN",
        is_bad: false,
        can_delete: true,
      },
    ],
  },

  // Format 4: error response
  {
    ok: false,
    error: "invalid_auth",
  },
]

// Function to process emoji data (similar to server-side code)
function processEmojiData(data) {
  console.log("\nProcessing response format:", JSON.stringify(data, null, 2).substring(0, 100) + "...")
  console.log("Response keys:", Object.keys(data))
  console.log("Response ok status:", data.ok)

  // Process the emoji data
  let emojiArray = []

  // Check different possible response formats
  if (Array.isArray(data.emoji)) {
    // Handle array format
    emojiArray = data.emoji
    console.log("Found emoji array with", emojiArray.length, "items")
  } else if (data.emoji && typeof data.emoji === "object") {
    // Handle object format (name -> url mapping)
    emojiArray = Object.entries(data.emoji).map(([name, url]) => ({
      name,
      url,
      is_alias: 0,
      user_id: "",
      created: 0,
      team_id: "",
      is_bad: false,
      user_display_name: "",
      can_delete: false,
    }))
    console.log("Converted emoji object to array with", emojiArray.length, "items")
  } else if (data.emoji_list && Array.isArray(data.emoji_list)) {
    // Handle emoji_list array format (seen in some API responses)
    emojiArray = data.emoji_list
    console.log("Found emoji_list array with", emojiArray.length, "items")
  } else if (data.emoji_list && typeof data.emoji_list === "object" && !Array.isArray(data.emoji_list)) {
    // Handle emoji_list object format
    emojiArray = Object.entries(data.emoji_list).map(([name, info]) => ({
      name,
      url: info.url || info.image_url || "",
      is_alias: info.is_alias || 0,
      user_id: info.user_id || "",
      created: info.created || 0,
      team_id: info.team_id || "",
      is_bad: info.is_bad || false,
      user_display_name: info.user_display_name || "",
      can_delete: info.can_delete || false,
    }))
    console.log("Converted emoji_list object to array with", emojiArray.length, "items")
  } else if (data.custom_emoji_total_count !== undefined) {
    // Handle adminList response format
    if (data.emoji_list && Array.isArray(data.emoji_list)) {
      emojiArray = data.emoji_list
      console.log("Found adminList emoji_list array with", emojiArray.length, "items")
    } else if (data.custom_emoji_list && Array.isArray(data.custom_emoji_list)) {
      emojiArray = data.custom_emoji_list
      console.log("Found adminList custom_emoji_list array with", emojiArray.length, "items")
    } else if (data.custom_emoji_list && typeof data.custom_emoji_list === "object") {
      // Handle custom_emoji_list as an object (name -> info mapping)
      emojiArray = Object.entries(data.custom_emoji_list).map(([name, info]) => ({
        name,
        url: info.url || info.image_url || "",
        is_alias: info.is_alias || 0,
        user_id: info.user_id || "",
        created: info.created || 0,
        team_id: info.team_id || "",
        is_bad: info.is_bad || false,
        user_display_name: info.user_display_name || "",
        can_delete: info.can_delete || false,
      }))
      console.log("Converted adminList custom_emoji_list object to array with", emojiArray.length, "items")
    }
  } else if (data.ok === false) {
    // Handle error response
    console.error("Slack API returned error:", data.error || "Unknown error")
    return { error: data.error || "Unknown Slack API error", slackResponse: data }
  }

  console.log("Processed emoji array length:", emojiArray.length)
  if (emojiArray.length > 0) {
    console.log("First emoji item:", JSON.stringify(emojiArray[0], null, 2))
  }

  return { emoji: emojiArray }
}

// Test each response format
console.log("=== TESTING SLACK API RESPONSE FORMATS ===")
testResponses.forEach((response, index) => {
  console.log(`\n--- Testing Response Format ${index + 1} ---`)
  const result = processEmojiData(response)
  console.log("Result:", result.emoji ? `${result.emoji.length} emojis found` : `Error: ${result.error}`)
})

// Test with a custom_emoji_list that's not an array
const customResponse = {
  ok: true,
  custom_emoji_total_count: 2,
  custom_emoji_list: {
    custom_emoji1: {
      url: "https://emoji.slack-edge.com/T0KV71EGN/custom_emoji1/123.png",
      is_alias: 0,
      user_id: "U12345",
      created: 1620000000,
    },
    custom_emoji2: {
      url: "https://emoji.slack-edge.com/T0KV71EGN/custom_emoji2/456.png",
      is_alias: 0,
      user_id: "U67890",
      created: 1620000001,
    },
  },
}

console.log("\n--- Testing Custom Response Format ---")
const customResult = processEmojiData(customResponse)
console.log(
  "Custom Result:",
  customResult.emoji ? `${customResult.emoji.length} emojis found` : `Error: ${customResult.error}`,
)
