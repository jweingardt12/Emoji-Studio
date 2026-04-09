import { NextResponse } from "next/server"

const WEBHOOK_URLS: Record<string, string | undefined> = {
  feedback: process.env.WEBHOOK_FEEDBACK_URL,
  "email-capture": process.env.WEBHOOK_EMAIL_CAPTURE_URL,
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, ...payload } = body

    const webhookUrl = WEBHOOK_URLS[type]
    if (!webhookUrl) {
      return NextResponse.json({ error: "Unknown webhook type" }, { status: 400 })
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Webhook failed" }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
