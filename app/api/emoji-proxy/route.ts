import { type NextRequest, NextResponse } from "next/server"
import { validateImageProxyUrl, sanitizeErrorResponse } from "@/lib/utils/url-validation"
import { applyRateLimit } from "@/lib/utils/api-security"

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return new NextResponse("Missing URL parameter", { status: 400 })
  }

  // Validate URL - only allow whitelisted domains
  const validation = validateImageProxyUrl(url)
  if (!validation.valid) {
    return new NextResponse(validation.error || "Invalid URL", { status: 400 })
  }

  try {
    // Fetch the image from the external URL
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://emojis.slackmojis.com/",
      },
    })

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status })
    }

    // Get the image data as an array buffer
    const imageData = await response.arrayBuffer()

    // Get the content type from the response
    const contentType = response.headers.get("content-type") || "image/png"

    // Return the image with appropriate headers
    return new NextResponse(imageData, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
        "Access-Control-Allow-Origin": "*", // Allow cross-origin requests
      },
    })
  } catch (error: unknown) {
    const sanitized = sanitizeErrorResponse(error, "Error proxying image")
    return new NextResponse(sanitized.message, { status: 500 })
  }
}
