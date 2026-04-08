// Slack API proxy endpoint - restricted to slack.com domains only
import { type NextRequest, NextResponse } from "next/server"
import { validateProxyUrl, sanitizeErrorResponse } from "@/lib/utils/url-validation"
import { applyRateLimit } from "@/lib/utils/api-security"

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(req)
    if (rateLimitResponse) return rateLimitResponse

    // Get URL to proxy to from query param or header
    const url = req.nextUrl.searchParams.get("url") || req.headers.get("x-slack-proxy-url")
    if (!url) {
      return NextResponse.json({ error: "Missing url in query or header" }, { status: 400 })
    }

    // Validate URL - only allow slack.com domains
    const validation = validateProxyUrl(url)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Copy all headers except host/origin/content-length/content-type
    const headers: Record<string, string> = {}
    for (const [k, v] of req.headers.entries()) {
      if (["host", "origin", "content-length", "content-type"].includes(k.toLowerCase())) continue
      headers[k] = v
    }
    // Stream the body directly
    const slackRes = await fetch(url, {
      method: "POST",
      headers,
      body: req.body,
      redirect: "manual", 
    })
    // Stream Slack's response back
    const resHeaders = new Headers()
    slackRes.headers.forEach((v, k) => {
      const lower = k.toLowerCase()
      if (lower !== "content-encoding" && lower !== "content-length") {
        resHeaders.set(k, v)
      }
    })
    return new NextResponse(slackRes.body, {
      status: slackRes.status,
      statusText: slackRes.statusText,
      headers: resHeaders,
    })
  } catch (err: unknown) {
    console.error("Slack proxy error:", err)
    const sanitized = sanitizeErrorResponse(err, "Proxy request failed")
    return NextResponse.json({ error: sanitized.message }, { status: 500 })
  }
}
