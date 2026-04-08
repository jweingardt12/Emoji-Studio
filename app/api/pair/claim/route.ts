import { NextResponse } from "next/server"
import { claimPairing } from "@/lib/pairing-store"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { code?: string }
    const code = (body.code || "").toString().trim()
    
    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 })
    }
    
    const result = claimPairing(code)
    
    if (!result.ok) {
      // Provide more helpful error messages
      const errorMessage = result.reason === "not_found" 
        ? "Pairing code not found or expired. Please generate a new QR code."
        : result.reason === "expired"
        ? "Pairing code has expired. Please generate a new QR code."
        : result.reason === "claimed"
        ? "This code has already been used."
        : result.reason || "Pairing failed"
        
      return NextResponse.json({ error: errorMessage, reason: result.reason }, { status: 400 })
    }
    
    return NextResponse.json({ curl: result.curl })
  } catch (e: any) {
    console.error("[/api/pair/claim] Internal error:", e)
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}
