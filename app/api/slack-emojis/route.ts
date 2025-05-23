// SECURITY WARNING: This endpoint handles Slack API requests. Do NOT expose to untrusted users.
import { type NextRequest, NextResponse } from "next/server"

// Interface for the curl request object
interface SlackCurlRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  formData?: Record<string, string>
  data?: string
}

// Make sure SLACK_TOKEN is set in your environment
const token = process.env.SLACK_TOKEN

export async function GET() {
  if (!token) {
    return NextResponse.json({ error: "SLACK_TOKEN environment variable not set." }, { status: 500 })
  }

  try {
    // For direct API access, you would use the WebClient from @slack/web-api
    // Since we're focusing on the curl approach, we'll leave this as a placeholder
    return NextResponse.json({ message: "Please use POST with a curl request" })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json()
    const curlRequest = body.curlRequest

    if (!curlRequest || !curlRequest.url) {
      return NextResponse.json({ error: "Invalid request: missing URL" }, { status: 400 })
    }

    console.log("Received curl request:", JSON.stringify(curlRequest, null, 2))

    // Ensure _x_id is in the URL
    const xIdMatch = curlRequest.url.match(/[?&]_x_id=([^&\s'"]+)/)
    if (!xIdMatch) {
      // Generate a new _x_id if not found
      const timestamp = Math.floor(Date.now() / 1000)
      const randomHex = Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, "0")
      const xId = `${randomHex}-${timestamp}.${Math.floor(Math.random() * 1000)}`

      // Add _x_id to the URL
      const separator = curlRequest.url.includes("?") ? "&" : "?"
      curlRequest.url = `${curlRequest.url}${separator}_x_id=${xId}`
      console.log("Added _x_id to URL:", curlRequest.url)
    } else {
      console.log("Found _x_id in URL:", xIdMatch[1])
    }

    // Log the URL for debugging
    console.log("Processing URL:", curlRequest.url)

    // Check if this is an emoji-related endpoint
    const isEmojiEndpoint =
      curlRequest.url.includes("/emoji.") ||
      curlRequest.url.includes("/api/emoji") ||
      Boolean(curlRequest.url.match(/emoji\.[a-zA-Z]+/))

    if (!isEmojiEndpoint) {
      return NextResponse.json({ error: "Only emoji-related endpoints are supported" }, { status: 400 })
    }

    // Prepare options for fetch
    const method = (curlRequest.method || "POST").toUpperCase()
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(curlRequest.headers || {}),
      },
    }

    // PATCH: If method is GET, do not include body/formData/data (GET must not have a body)
    if (method === "GET") {
      if ((curlRequest.formData && Object.keys(curlRequest.formData).length > 0) || curlRequest.data) {
        console.warn("[Proxy] GET request attempted with body/formData/data. This is not allowed by HTTP spec.")
        return NextResponse.json({ error: "Request with GET method cannot have body/formData/data. Please use POST for emoji endpoints." }, { status: 400 })
      }
      // Remove any accidental body
      delete options.body
    }

    // Preserve and enhance headers for Slack API authentication
    if (options.headers) {
      const headers = options.headers as Record<string, string>
      
      // Preserve original Cookie header if present - critical for Slack auth
      const hasCookie = headers["Cookie"] || headers["cookie"]
      console.log("[Proxy] Cookie header present:", !!hasCookie)
      
      // Check for d= cookie which is essential for Slack auth
      const dCookie = hasCookie ? (hasCookie.match(/d=[a-zA-Z0-9%_\-+.]+/) || ["none"])[0] : "none"
      console.log("[Proxy] d= cookie found:", dCookie !== "none")
      
      // Check for token in form data
      const hasToken = curlRequest.formData && (
        curlRequest.formData["token"] || 
        Object.keys(curlRequest.formData).some(k => k.includes("token"))
      )
      console.log("[Proxy] Token in form data:", !!hasToken)
      
      // Set content type after preserving important headers
      delete headers["content-type"]
      delete headers["Content-Type"]
      headers["Content-Type"] = "application/x-www-form-urlencoded"
    }

    // Handle form data - use URLSearchParams for simplicity and reliability
    if (curlRequest.formData && Object.keys(curlRequest.formData).length > 0) {
      const params = new URLSearchParams()

      // Always add post_type=json first
      params.append("post_type", "json")
      
      // Check if token exists in formData
      const hasToken = "token" in curlRequest.formData
      console.log("[Proxy] Token exists in formData:", hasToken)
      
      // If token is missing but we found one in the URL or elsewhere, add it
      if (!hasToken && curlRequest.url) {
        const tokenMatch = curlRequest.url.match(/[?&]token=([^&\s'"]+)/)
        if (tokenMatch && tokenMatch[1]) {
          params.append("token", tokenMatch[1])
          console.log("[Proxy] Added token from URL:", tokenMatch[1].substring(0, 10) + "...")
        }
      }

      // Add all other form fields
      for (const [key, value] of Object.entries(curlRequest.formData)) {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value))
          // Don't log full token value for security
          const logValue = key.includes("token") ? String(value).substring(0, 10) + "..." : value
          console.log(`Added form field: ${key}=${logValue}`)
        }
      }

      // Set the body
      options.body = params.toString()
      console.log("[Proxy] Using URLSearchParams for request (length):", params.toString().length)
    } else if (curlRequest.data) {
      // Use raw data if provided
      options.body = curlRequest.data
      console.log("[Proxy] Using raw data for request")
    } else {
      // Ensure we at least have post_type=json
      options.body = "post_type=json"
      console.log("[Proxy] Using minimal form data: post_type=json")
    }

    console.log("Making request to Slack API with method:", options.method)
    console.log("Headers:", options.headers ? JSON.stringify(options.headers) : "(none)")
    console.log("Body:", options.body)

    // Ensure we have all required headers for Slack auth
    if (options.headers && typeof options.headers === 'object') {
      const headers = options.headers as Record<string, string>
      
      // Make sure we have the correct accept header
      if (!headers['Accept']) {
        headers['Accept'] = 'application/json, text/plain, */*'
      }
      
      // Ensure we have the correct referer if it was in the original request
      if (curlRequest.headers && curlRequest.headers['Referer'] && !headers['Referer']) {
        headers['Referer'] = curlRequest.headers['Referer']
      }
    }
    
    console.log("[Proxy] Final request URL:", curlRequest.url)
    console.log("[Proxy] Final request headers:", JSON.stringify(options.headers))
    console.log("[Proxy] Final request method:", options.method)
    
    // Forward the request to Slack
    try {
      const response = await fetch(curlRequest.url, options)

      // Get the response text first for debugging
      const responseText = await response.text()
      console.log("Raw response from Slack API:", responseText)

      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError)
        return NextResponse.json(
          {
            error: "Failed to parse Slack API response as JSON",
            rawResponse: responseText,
          },
          { status: 500 },
        )
      }

      if (!response.ok) {
        console.error("Slack API error:", data)
        return NextResponse.json(
          { error: data.error || "Slack API error", slackResponse: data },
          { status: response.status },
        )
      }

      console.log("Received response from Slack API with status:", response.status)
      console.log("Slack API response data structure:", Object.keys(data))
      console.log("Slack API response ok status:", data.ok)

      // Process the emoji data
      let emojiArray: any[] = []

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
        emojiArray = Object.entries(data.emoji_list).map(([name, info]: [string, any]) => ({
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
          emojiArray = Object.entries(data.custom_emoji_list).map(([name, info]: [string, any]) => ({
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
        return NextResponse.json(
          {
            error: data.error || "Unknown Slack API error",
            slackResponse: data,
          },
          { status: 400 },
        )
      }

      if (emojiArray && Array.isArray(emojiArray) && emojiArray.length > 0) {
        return NextResponse.json({ emoji: emojiArray })
      } else {
        // If we couldn't find or process emoji data, return the raw response for debugging
        console.log("No emoji data found in response. Returning full response for debugging.")
        return NextResponse.json(
          {
            error: "No emoji data found in Slack response",
            slackResponse: data,
          },
          { status: 200 },
        )
      }
    } catch (fetchError) {
      console.error("Fetch error:", fetchError)
      return NextResponse.json(
        {
          error: `Error fetching from Slack API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
          details: fetchError instanceof Error ? fetchError.stack : undefined,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error processing Slack emoji request:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
