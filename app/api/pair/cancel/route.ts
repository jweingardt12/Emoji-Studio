import { NextResponse } from "next/server"
import { cancelPairing } from "@/lib/pairing-store"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { code?: string }
    const code = (body.code || "").toString().trim()
    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 })
    const ok = cancelPairing(code)
    return NextResponse.json({ ok })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}
