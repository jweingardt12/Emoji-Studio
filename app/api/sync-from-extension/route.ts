import { NextRequest, NextResponse } from 'next/server'
import { sanitizeErrorResponse } from "@/lib/utils/url-validation"
import { applyRateLimit } from "@/lib/utils/api-security"

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'chrome-extension://', // Allow any Chrome extension (IDs are dynamic)
  'https://app.emojistudio.xyz',
  'https://emojistudio.xyz',
  'http://localhost:3000', // Development
]

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  return ALLOWED_ORIGINS.some(allowed =>
    origin.startsWith(allowed) || origin === allowed
  )
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    // Validate origin
    const origin = request.headers.get('origin')
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json(
        { error: 'Unauthorized origin' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Accept both 'emoji' and 'emojiData' for backward compatibility with extension
    const emojiData = body.emojiData || body.emoji

    // Validate the request
    if (!body.workspace) {
      return NextResponse.json(
        { error: 'Invalid request. Missing workspace field.' },
        { status: 400 }
      )
    }

    if (!emojiData || !Array.isArray(emojiData)) {
      return NextResponse.json(
        { error: 'Invalid request. Missing or invalid emoji data. Expected array of emoji objects.' },
        { status: 400 }
      )
    }

    // Extract data from the request
    const { workspace, emojiCount, lastFetchTime } = body
    
    // Validate emoji data structure
    const invalidEmojis = emojiData.filter((emoji: any) => {
      return !emoji.name || typeof emoji.name !== 'string'
    })

    if (invalidEmojis.length > 0) {
    }

    // Note: This endpoint currently validates the data and returns success.
    // The Chrome extension opens the Emoji Studio app in a tab to store the data
    // in localStorage where the app retrieves it. This approach avoids the need
    // for authentication and server-side storage while still enabling sync.

    // Return success response with helpful metadata
    return NextResponse.json({
      success: true,
      message: 'Data synced successfully. Extension will open Emoji Studio to complete sync.',
      workspace: workspace,
      emojiCount: emojiData.length,
      syncTime: new Date().toISOString(),
      validEmojis: emojiData.length - invalidEmojis.length,
      invalidEmojis: invalidEmojis.length
    })
  } catch (error) {


    const sanitized = sanitizeErrorResponse(error, 'Failed to process sync request')
    return NextResponse.json(
      {
        error: sanitized.message,
        ...(sanitized.details && { details: sanitized.details }),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Add CORS headers for the Chrome extension
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')

  // Only return CORS headers for allowed origins
  const corsOrigin = isAllowedOrigin(origin) ? origin : 'https://app.emojistudio.xyz'

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin!,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
    },
  })
}