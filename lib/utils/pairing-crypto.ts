const SHARED_SECRET = process.env.NEXT_PUBLIC_PAIRING_SECRET || "emoji-studio-shared-secret-v1"

let cachedKey: CryptoKey | null = null
let cachedKeyPromise: Promise<CryptoKey> | null = null
let cryptoRef: Crypto | typeof import("crypto").webcrypto | null = null

function getCrypto(): Crypto | typeof import("crypto").webcrypto {
  if (cryptoRef) return cryptoRef
  if (typeof globalThis.crypto !== "undefined") {
    cryptoRef = globalThis.crypto
    return cryptoRef
  }
  throw new Error("Web Crypto API is not available in this environment")
}

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  if (cachedKeyPromise) return cachedKeyPromise

  const crypto = getCrypto()
  const subtle = crypto.subtle
  if (!subtle) {
    throw new Error("SubtleCrypto is not available")
  }

  const encoder = new TextEncoder()
  const material = encoder.encode(SHARED_SECRET)
  const hash = await subtle.digest("SHA-256", material)

  cachedKeyPromise = subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  ).then(key => {
    cachedKey = key
    cachedKeyPromise = null
    return key
  })

  return cachedKeyPromise
}

function base64UrlEncode(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = ""
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  }

  const BufferCtor = (globalThis as any).Buffer as any
  if (BufferCtor) {
    const base64 = BufferCtor.from(bytes).toString("base64")
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  }

  throw new Error("No base64 encoder available")
}

function base64UrlDecode(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64 + "=".repeat((4 - (base64.length % 4 || 4)) % 4)
  if (typeof atob === "function") {
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  const BufferCtor = (globalThis as any).Buffer as any
  if (BufferCtor) {
    return new Uint8Array(BufferCtor.from(padded, "base64"))
  }

  throw new Error("No base64 decoder available")
}

export async function encryptCurl(curl: string): Promise<string> {
  const crypto = getCrypto()
  const subtle = crypto.subtle
  if (!subtle) {
    throw new Error("Encryption not supported in this environment")
  }

  const key = await getKey()
  const encoder = new TextEncoder()
  const data = encoder.encode(curl)
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encrypted = await subtle.encrypt({ name: "AES-GCM", iv }, key, data)
  const encryptedBytes = new Uint8Array(encrypted)
  const combined = new Uint8Array(iv.length + encryptedBytes.length)
  combined.set(iv)
  combined.set(encryptedBytes, iv.length)

  return base64UrlEncode(combined)
}

export async function decryptCurlCode(code: string): Promise<string> {
  const crypto = getCrypto()
  const subtle = crypto.subtle
  if (!subtle) {
    throw new Error("Decryption not supported in this environment")
  }

  const bytes = base64UrlDecode(code)
  if (bytes.length <= 12) {
    throw new Error("Invalid encrypted payload")
  }

  const iv = bytes.slice(0, 12)
  const payload = bytes.slice(12)
  const key = await getKey()

  const decrypted = await subtle.decrypt({ name: "AES-GCM", iv }, key, payload)
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}
