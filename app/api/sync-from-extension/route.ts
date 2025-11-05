import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
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
      console.warn(`[Sync API] Found ${invalidEmojis.length} invalid emoji objects (missing name field)`)
    }

    // Log the sync request with more details
    console.log(`[Sync API] Received sync request for workspace: ${workspace}`)
    console.log(`[Sync API] Emoji count: ${emojiData.length}`)
    console.log(`[Sync API] Request included emojiCount: ${emojiCount || 'not provided'}`)
    console.log(`[Sync API] Request included lastFetchTime: ${lastFetchTime || 'not provided'}`)
    console.log(`[Sync API] Data provided via: ${body.emojiData ? 'emojiData' : 'emoji'} property`)

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
    console.error('[Sync API] Error processing sync request:', error)

    // Provide more helpful error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isJSONError = errorMessage.includes('JSON')

    return NextResponse.json(
      {
        error: 'Failed to process sync request',
        details: isJSONError
          ? 'Invalid JSON in request body. Ensure data is properly formatted.'
          : 'Server error processing request. Check server logs for details.',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Add CORS headers for the Chrome extension
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}