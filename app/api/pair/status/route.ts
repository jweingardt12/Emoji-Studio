import { NextResponse } from "next/server"
import { getStatus } from "@/lib/pairing-store"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = (searchParams.get("code") || "").trim()
    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 })
    const status = getStatus(code)
    return NextResponse.json({ status })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}
