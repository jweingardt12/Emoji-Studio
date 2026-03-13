import { NextRequest } from "next/server"

export const ALLOWED_ORIGINS = [
  'chrome-extension://',
  'https://app.emojistudio.xyz',
  'https://emojistudio.xyz',
  'http://localhost:3000',
]

const DEFAULT_ORIGIN = 'https://app.emojistudio.xyz'

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  return ALLOWED_ORIGINS.some(allowed =>
    origin.startsWith(allowed) || origin === allowed
  )
}

export function getCorsOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin')
  if (origin && isAllowedOrigin(origin)) {
    return origin
  }
  return DEFAULT_ORIGIN
}
