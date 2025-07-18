/**
 * Secured version of the Slack emoji API route
 * This demonstrates how to properly secure API endpoints
 */

import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createSecureHandler, validateRequestBody } from "@/lib/utils/api-security"

// Define the request schema
const SlackCurlRequestSchema = z.object({
  curlRequest: z.object({
    url: z.string().url("Invalid URL format"),
    method: z.string().optional().default("POST"),
    headers: z.record(z.string()).optional(),
    formData: z.record(z.string()).optional(),
    data: z.string().optional()
  })
})

// Whitelist of allowed Slack domains
const ALLOWED_SLACK_DOMAINS = [
  "slack.com",
  "*.slack.com",
  "slack-edge.com",
  "*.slack-edge.com"
]

// Validate if URL is a valid Slack emoji endpoint
function isValidSlackEmojiUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    
    // Check if it's a Slack domain
    const isSlackDomain = ALLOWED_SLACK_DOMAINS.some(domain => {
      if (domain.startsWith("*.")) {
        const baseDomain = domain.substring(2)
        return parsedUrl.hostname === baseDomain || parsedUrl.hostname.endsWith(`.${baseDomain}`)
      }
      return parsedUrl.hostname === domain
    })
    
    if (!isSlackDomain) return false
    
    // Check if it's an emoji-related endpoint
    const path = parsedUrl.pathname
    return (
      path.includes("/emoji.") ||
      path.includes("/api/emoji") ||
      path.includes("/client.action") // Some emoji endpoints use this
    )
  } catch {
    return false
  }
}

// Extract and validate Slack token
function extractSlackToken(request: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  formData?: Record<string, string>;
  data?: string;
}): string | null {
  // Check form data
  if (request.formData?.token) {
    return request.formData.token
  }
  
  // Check URL parameters
  if (request.url) {
    const urlParams = new URL(request.url).searchParams
    const token = urlParams.get("token")
    if (token) return token
  }
  
  // Check for xoxc token in headers (for cookie-based auth)
  if (request.headers?.Cookie || request.headers?.cookie) {
    const cookieHeader = request.headers.Cookie || request.headers.cookie
    const xoxcMatch = cookieHeader.match(/xoxc-[^\s;]+/)
    if (xoxcMatch) return xoxcMatch[0]
  }
  
  return null
}

// Main handler
async function handleSlackEmojiRequest(request: NextRequest) {
  // Parse and validate request body
  const body = await request.json()
  const { data, error } = validateRequestBody(body, SlackCurlRequestSchema)
  
  if (error) return error
  if (!data) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
  }
  
  const { curlRequest } = data
  
  // Validate URL
  if (!isValidSlackEmojiUrl(curlRequest.url)) {
    return NextResponse.json(
      { 
        error: "Invalid URL",
        message: "Only Slack emoji endpoints are allowed"
      },
      { status: 400 }
    )
  }
  
  // Validate authentication
  const token = extractSlackToken(curlRequest)
  if (!token) {
    return NextResponse.json(
      {
        error: "Missing authentication",
        message: "A valid Slack token is required"
      },
      { status: 401 }
    )
  }
  
  // Add security headers
  const secureHeaders: Record<string, string> = {
    ...curlRequest.headers,
    "X-Forwarded-For": request.headers.get("x-forwarded-for") || "unknown",
    "X-Request-ID": crypto.randomUUID()
  }
  
  // Remove potentially dangerous headers
  delete secureHeaders["Host"]
  delete secureHeaders["host"]
  
  // Prepare the request
  const method = (curlRequest.method || "POST").toUpperCase()
  const options: RequestInit = {
    method,
    headers: secureHeaders
  }
  
  // Handle request body
  if (method !== "GET" && method !== "HEAD") {
    if (curlRequest.formData && Object.keys(curlRequest.formData).length > 0) {
      const params = new URLSearchParams()
      
      // Always include these for Slack API
      params.append("post_type", "json")
      if (!curlRequest.formData.token && token) {
        params.append("token", token)
      }
      
      // Add other form fields
      Object.entries(curlRequest.formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value))
        }
      })
      
      options.body = params.toString()
      secureHeaders["Content-Type"] = "application/x-www-form-urlencoded"
    } else if (curlRequest.data) {
      options.body = curlRequest.data
    }
  }
  
  try {
    // Make the request to Slack with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
    const response = await fetch(curlRequest.url, {
      ...options,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    // Parse response
    const responseData = await response.json()
    
    if (!response.ok || !responseData.ok) {
      return NextResponse.json(
        {
          error: "Slack API error",
          message: responseData.error || "Request failed",
          code: responseData.error_code
        },
        { status: response.status || 400 }
      )
    }
    
    // Process and sanitize emoji data
    const emojis = processEmojiData(responseData)
    
    return NextResponse.json({
      emojis,
      metadata: {
        count: emojis.length,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timeout", message: "The request took too long to complete" },
        { status: 504 }
      )
    }
    
    console.error("Slack API request failed:", error)
    return NextResponse.json(
      { error: "Request failed", message: "Failed to fetch emoji data from Slack" },
      { status: 500 }
    )
  }
}

// Process and sanitize emoji data from various Slack response formats
function processEmojiData(data: any): any[] {
  let emojiArray: any[] = []
  
  // Handle different response formats
  if (Array.isArray(data.emoji)) {
    emojiArray = data.emoji
  } else if (data.emoji && typeof data.emoji === "object") {
    emojiArray = Object.entries(data.emoji).map(([name, url]) => ({
      name,
      url: String(url),
      is_alias: 0,
      created: 0
    }))
  } else if (data.emoji_list) {
    if (Array.isArray(data.emoji_list)) {
      emojiArray = data.emoji_list
    } else if (typeof data.emoji_list === "object") {
      emojiArray = Object.entries(data.emoji_list).map(([name, info]: [string, any]) => ({
        name,
        url: info.url || info.image_url || "",
        is_alias: info.is_alias || 0,
        user_id: info.user_id || "",
        created: info.created || 0,
        user_display_name: info.user_display_name || "",
      }))
    }
  }
  
  // Sanitize and validate each emoji
  return emojiArray
    .filter(emoji => emoji.name && (emoji.url || emoji.is_alias))
    .map(emoji => ({
      name: String(emoji.name).substring(0, 100), // Limit name length
      url: emoji.url ? String(emoji.url).substring(0, 500) : "", // Limit URL length
      is_alias: Boolean(emoji.is_alias),
      user_id: emoji.user_id ? String(emoji.user_id).substring(0, 50) : "",
      created: Number(emoji.created) || 0,
      user_display_name: emoji.user_display_name ? String(emoji.user_display_name).substring(0, 100) : "",
    }))
}

// Export secured handlers
export const POST = createSecureHandler(handleSlackEmojiRequest, {
  requireAuth: true,
  rateLimit: true,
  cors: true
})

// OPTIONS handler for CORS preflight
export const OPTIONS = createSecureHandler(
  async () => new NextResponse(null, { status: 204 }),
  { cors: true }
)

// GET handler - not supported for this endpoint
export const GET = createSecureHandler(
  async () => NextResponse.json(
    { error: "Method not allowed", message: "Use POST to fetch emoji data" },
    { status: 405 }
  ),
  { rateLimit: true }
)