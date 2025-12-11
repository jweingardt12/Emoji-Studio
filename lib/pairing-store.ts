type PairingStatus = "pending" | "claimed" | "expired" | "not_found" | "canceled"

type PairingSession = {
  code: string
  curl: string
  createdAt: number
  expiresAt: number
  status: Exclude<PairingStatus, "not_found">
  attempts: number
  claimedAt?: number
}

// Ensure a global singleton store across HMR/server reloads
// NOTE: This in-memory store works locally but has limitations on Vercel:
// - Each serverless function instance has its own memory
// - Store is not shared between instances
// - Store is lost when function cold starts
// For production, consider using Redis, Upstash, or another persistent store
const g = globalThis as unknown as { __PAIRING_STORE__?: Map<string, PairingSession> }
if (!g.__PAIRING_STORE__) {
  g.__PAIRING_STORE__ = new Map()
}

const store = g.__PAIRING_STORE__!

const TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_ATTEMPTS = 10

function cleanupExpired() {
  const now = Date.now()
  for (const [code, session] of store.entries()) {
    if (session.status !== "claimed" && (session.expiresAt <= now || session.status === "canceled")) {
      store.delete(code)
    }
  }
}

function randomCode(): string {
  // 6 digit numeric code using cryptographically secure randomness
  // Range: 100000-999999 (avoids leading zeros)
  const crypto = require("crypto") as typeof import("crypto")
  return String(crypto.randomInt(100000, 1000000))
}

function randomSid(length = 12): string {
  // Generate an alphanumeric session id using crypto (required, no fallback)
  const crypto = require("crypto") as typeof import("crypto")
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length)
}

export function createPairing(curl: string): { code: string; expiresAt: number } {
  cleanupExpired()
  let code = randomCode()
  let guard = 0
  while (store.has(code) && guard < 20) {
    code = randomCode()
    guard++
  }
  const now = Date.now()
  const session: PairingSession = {
    code,
    curl,
    createdAt: now,
    expiresAt: now + TTL_MS,
    status: "pending",
    attempts: 0,
  }
  store.set(code, session)
  return { code, expiresAt: session.expiresAt }
}

export function createQrSession(curl: string): { sid: string; expiresAt: number } {
  cleanupExpired()
  let sid = randomSid(12)
  let guard = 0
  while (store.has(sid) && guard < 20) {
    sid = randomSid(12)
    guard++
  }
  const now = Date.now()
  const session: PairingSession = {
    code: sid,
    curl,
    createdAt: now,
    expiresAt: now + TTL_MS,
    status: "pending",
    attempts: 0,
  }
  store.set(sid, session)
  return { sid, expiresAt: session.expiresAt }
}

export function getStatus(code: string): PairingStatus {
  cleanupExpired()
  const s = store.get(code)
  if (!s) return "not_found"
  const now = Date.now()
  if (s.status === "pending" && s.expiresAt <= now) {
    s.status = "expired"
    store.delete(code)
    return "expired"
  }
  return s.status
}

export function cancelPairing(code: string): boolean {
  const s = store.get(code)
  if (!s) return false
  s.status = "canceled"
  store.delete(code)
  return true
}

export function claimPairing(code: string): { ok: boolean; reason?: PairingStatus; curl?: string } {
  // Don't cleanup expired immediately to avoid race conditions
  const s = store.get(code)
  if (!s) return { ok: false, reason: "not_found" }
  const now = Date.now()
  
  // Give a 10 second grace period after expiration for in-flight requests
  const graceTime = 10000
  if (s.expiresAt + graceTime <= now) {
    store.delete(code)
    return { ok: false, reason: "expired" }
  }
  
  if (s.status === "claimed" && s.curl) {
    // Allow re-claiming within a short window (for retries)
    if (s.claimedAt && now - s.claimedAt < 5000) {
      return { ok: true, curl: s.curl }
    }
    return { ok: false, reason: s.status }
  }
  
  if (s.status !== "pending") {
    return { ok: false, reason: s.status }
  }
  
  s.attempts++
  if (s.attempts > MAX_ATTEMPTS) {
    store.delete(code)
    return { ok: false, reason: "expired" }
  }
  
  s.status = "claimed"
  s.claimedAt = now
  const curl = s.curl
  
  // Keep the session for a short time to handle retries
  setTimeout(() => {
    store.delete(code)
  }, 5000)
  
  return { ok: true, curl }
}
