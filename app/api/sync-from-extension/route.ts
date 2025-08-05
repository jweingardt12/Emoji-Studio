import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request
    if (!body.workspace || !body.emojiData || !Array.isArray(body.emojiData)) {
      return NextResponse.json(
        { error: 'Invalid request. Missing workspace or emojiData.' },
        { status: 400 }
      )
    }
    
    // Extract data from the request
    const { workspace, emojiData, emojiCount, lastFetchTime } = body
    
    // Log the sync request
    console.log(`[Sync API] Received sync request for workspace: ${workspace}`)
    console.log(`[Sync API] Emoji count: ${emojiData.length}`)
    
    // Note: This endpoint currently just validates the data and returns success.
    // In a production environment, this would:
    // 1. Authenticate the user (via API key, OAuth, etc.)
    // 2. Store the data in a database associated with the user
    // 3. Allow the Emoji Studio app to fetch this data without localStorage
    
    // For now, the Chrome extension will still need to open the Emoji Studio
    // app at least once to store the data in localStorage where the app expects it.
    // This API endpoint serves as a future foundation for true server-side sync.
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Data synced successfully',
      workspace: workspace,
      emojiCount: emojiData.length,
      syncTime: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Sync API] Error processing sync request:', error)
    return NextResponse.json(
      { error: 'Failed to process sync request' },
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