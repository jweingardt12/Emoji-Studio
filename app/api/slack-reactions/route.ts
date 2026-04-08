// app/api/slack-reactions/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { validateProxyUrl, sanitizeErrorResponse } from "@/lib/utils/url-validation"
import { applyRateLimit } from "@/lib/utils/api-security"

interface SlackCurlRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  formData?: Record<string, string>
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const curlRequest: SlackCurlRequest = body.curlRequest

    if (!curlRequest?.url) {
      return NextResponse.json({ error: "Invalid request: missing URL" }, { status: 400 })
    }

    const validation = validateProxyUrl(curlRequest.url)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Only allow conversations endpoints
    const isConversationsEndpoint =
      curlRequest.url.includes("/conversations.list") ||
      curlRequest.url.includes("/conversations.view") ||
      curlRequest.url.includes("/conversations.history")

    if (!isConversationsEndpoint) {
      return NextResponse.json(
        { error: "Only conversations.list, conversations.view, and conversations.history endpoints are supported" },
        { status: 400 }
      )
    }

    // Ensure _x_id is in the URL
    if (!curlRequest.url.includes("_x_id=")) {
      const timestamp = Math.floor(Date.now() / 1000)
      const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")
      const xId = `${randomHex}-${timestamp}.${Math.floor(Math.random() * 1000)}`
      const separator = curlRequest.url.includes("?") ? "&" : "?"
      curlRequest.url = `${curlRequest.url}${separator}_x_id=${xId}`
    }

    // Build fetch options
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(curlRequest.headers || {}),
    }

    const params = new URLSearchParams()
    if (curlRequest.formData) {
      for (const [key, value] of Object.entries(curlRequest.formData)) {
        params.append(key, value)
      }
    }

    const slackRes = await fetch(curlRequest.url, {
      method: "POST",
      headers,
      body: params.toString(),
    })

    const slackData = await slackRes.json()

    if (!slackData.ok) {
      return NextResponse.json(
        { error: slackData.error || "Slack API error", ok: false },
        { status: 200 }
      )
    }

    // For conversations.list, return channel list as-is (no message content)
    if (curlRequest.url.includes("/conversations.list")) {
      const channels = (slackData.channels || []).map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        is_private: ch.is_private || false,
        num_members: ch.num_members || 0,
      }))
      return NextResponse.json({
        ok: true,
        channels,
        response_metadata: slackData.response_metadata,
      })
    }

    // For conversations.view / conversations.history:
    // STRIP ALL MESSAGE CONTENT. Return ONLY reactions + timestamp.
    const messages = slackData.messages || []
    const reactions: Array<{
      emoji_name: string
      count: number
      users: string[]
      timestamp: number
    }> = []

    for (const msg of messages) {
      if (!msg.reactions || !Array.isArray(msg.reactions)) continue
      const msgTs = parseFloat(msg.ts) || 0
      for (const reaction of msg.reactions) {
        reactions.push({
          emoji_name: reaction.name,
          count: reaction.count || reaction.users?.length || 0,
          users: reaction.users || [],
          timestamp: Math.floor(msgTs),
        })
      }
    }

    return NextResponse.json({
      ok: true,
      reactions,
      has_more: slackData.has_more || false,
      response_metadata: slackData.response_metadata,
    })
  } catch (err: unknown) {
    console.error("Slack reactions proxy error:", err)
    const sanitized = sanitizeErrorResponse(err, "Reactions proxy request failed")
    return NextResponse.json({ error: sanitized.message }, { status: 500 })
  }
}
