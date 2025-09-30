import { parseSlackCurl } from "./parse-slack-curl"
import { ProcessedEmoji } from "./emoji-processor"
import { formatEmojiName } from "../utils"

interface SlackUploadResult {
  success: boolean
  error?: string
  emojiName?: string
}

export async function uploadEmojiToSlack(
  emoji: ProcessedEmoji,
  customName?: string
): Promise<SlackUploadResult> {
  console.log("[uploadEmojiToSlack] Starting upload for emoji:", customName || emoji.name)

  try {
    // Get the stored curl command from localStorage
    const storedCurl = localStorage.getItem("slackCurlCommand")
    console.log("[uploadEmojiToSlack] Slack curl found:", !!storedCurl)

    if (!storedCurl) {
      console.error("[uploadEmojiToSlack] No Slack connection found")
      return {
        success: false,
        error: "No Slack connection found. Please connect to Slack in Settings first."
      }
    }

    // Parse the curl command to extract necessary information
    const parsed = parseSlackCurl(storedCurl)
    console.log("[uploadEmojiToSlack] Parsed curl:", { isValid: parsed.isValid, hasUrl: !!parsed.url, hasToken: !!parsed.token })

    if (!parsed.isValid || !parsed.url) {
      console.error("[uploadEmojiToSlack] Invalid Slack connection:", parsed)
      return {
        success: false,
        error: "Invalid Slack connection. Please reconnect in Settings."
      }
    }

    // Extract workspace URL
    const workspaceMatch = parsed.url.match(/https:\/\/([^.]+)\.slack\.com/)
    if (!workspaceMatch) {
      console.error("[uploadEmojiToSlack] Could not extract workspace from URL:", parsed.url)
      return {
        success: false,
        error: "Could not extract workspace from Slack connection."
      }
    }
    const workspace = workspaceMatch[1]
    console.log("[uploadEmojiToSlack] Workspace:", workspace)

    // Convert the emoji data URL to a blob
    const response = await fetch(emoji.blob)
    const blob = await response.blob()

    // Create FormData for multipart upload
    const formData = new FormData()
    
    // Add the required fields based on the curl example
    if (parsed.token) {
      formData.append("token", parsed.token)
    }
    
    const emojiName = formatEmojiName(customName || emoji.name)
    formData.append("name", emojiName)
    formData.append("mode", "data")
    formData.append("search_args", "{}")
    
    // Add the image file
    const fileName = `${emojiName}.${emoji.format === 'gif' ? 'gif' : 'png'}`
    const file = new File([blob], fileName, { 
      type: emoji.format === 'gif' ? 'image/gif' : 'image/png' 
    })
    formData.append("image", file)

    // Add additional fields from the curl example
    formData.append("_x_reason", "add-custom-emoji-dialog-content")
    formData.append("_x_mode", "online")

    // Extract _x_id and other parameters from the URL
    const urlParams = new URL(parsed.url).searchParams
    const xId = urlParams.get("_x_id") || parsed.xId || ""
    const slackRoute = urlParams.get("slack_route") || parsed.teamId || ""
    
    // Construct the upload URL
    const uploadUrl = `https://${workspace}.slack.com/api/emoji.add?_x_id=${xId}&slack_route=${slackRoute}&_x_version_ts=noversion&fp=5c&_x_num_retries=0`

    // Prepare headers
    const headers: Record<string, string> = {
      "Accept": "*/*",
      "Origin": `https://${workspace}.slack.com`,
      "Referer": `https://${workspace}.slack.com/`,
    }

    // Add cookie if available
    if (parsed.cookie) {
      headers["Cookie"] = parsed.cookie
    }

    // Convert FormData to a plain object, handling File objects
    const formDataObj: Record<string, any> = {}
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        // Skip file entries, we'll handle them separately
        continue
      }
      formDataObj[key] = value
    }

    // Make the request through our API proxy to avoid CORS issues
    console.log("[uploadEmojiToSlack] Making API request to /api/slack-emoji-upload")
    console.log("[uploadEmojiToSlack] Upload URL:", uploadUrl)
    console.log("[uploadEmojiToSlack] Form data:", formDataObj)

    const apiResponse = await fetch("/api/slack-emoji-upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: uploadUrl,
        formData: formDataObj,
        headers: headers,
        blob: emoji.blob,
        fileName: fileName,
        mimeType: file.type
      })
    })

    console.log("[uploadEmojiToSlack] API response status:", apiResponse.status)
    const result = await apiResponse.json()
    console.log("[uploadEmojiToSlack] API response result:", result)

    if (!apiResponse.ok || result.error || result.details?.error) {
      let errorMessage = "Failed to upload emoji to Slack"

      // Handle specific error cases
      if (result.error === "error_name_taken" || result.details?.error === "error_name_taken") {
        errorMessage = `The emoji name ":${emojiName}:" is already taken. Please choose a different name.`
      } else if (result.error) {
        errorMessage = result.error
      }

      console.error("[uploadEmojiToSlack] Upload failed:", errorMessage)
      return {
        success: false,
        error: errorMessage,
        emojiName: emojiName
      }
    }

    console.log("[uploadEmojiToSlack] Upload successful for:", emojiName)
    return {
      success: true,
      emojiName: emojiName
    }

  } catch (error) {
    console.error("[uploadEmojiToSlack] Exception during upload:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload emoji"
    }
  }
}

// Check if user has a valid Slack connection
export function hasSlackConnection(): boolean {
  const storedCurl = localStorage.getItem("slackCurlCommand")
  if (!storedCurl) return false
  
  const parsed = parseSlackCurl(storedCurl)
  return parsed.isValid && !!parsed.url
}