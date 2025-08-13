import { NextResponse } from "next/server"
import { claimPairing } from "@/lib/pairing-store"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { code?: string }
    const code = (body.code || "").toString().trim()
    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 })
    const result = claimPairing(code)
    if (!result.ok) {
      return NextResponse.json({ error: result.reason || "not_found" }, { status: 400 })
    }
    return NextResponse.json({ curl: result.curl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}
