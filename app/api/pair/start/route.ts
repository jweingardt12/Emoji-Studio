import { NextResponse } from "next/server"
import { createPairing, createQrSession } from "@/lib/pairing-store"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { curl?: string, mode?: "code" | "qr" }
    const curl = body.curl?.toString().trim()
    if (!curl) {
      return NextResponse.json({ error: "Missing curl" }, { status: 400 })
    }
    if (body.mode === "qr") {
      const { sid, expiresAt } = createQrSession(curl)
      return NextResponse.json({ sid, expiresAt })
    }
    const { code, expiresAt } = createPairing(curl)
    return NextResponse.json({ code, expiresAt })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}
