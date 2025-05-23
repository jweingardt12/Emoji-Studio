// SECURITY WARNING: This endpoint is a stateless proxy. It does not log or store any data, but will forward whatever is sent to it to the specified URL. Do not expose to untrusted users.
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    // Get URL to proxy to from query param or header
    const url = req.nextUrl.searchParams.get("url") || req.headers.get("x-slack-proxy-url")
    if (!url) {
      return NextResponse.json({ error: "Missing url in query or header" }, { status: 400 })
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
    // Debug: log Slack's response status and a snippet of the body
    const clone = slackRes.clone()
    const text = await clone.text()
    console.log("Slack response status:", slackRes.status, "body snippet:", text.slice(0, 500))
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
  } catch (err: any) {
    console.error("Slack proxy error:", err)
    return NextResponse.json({ error: err.message, stack: err.stack, raw: JSON.stringify(err) }, { status: 500 })
  }
}
