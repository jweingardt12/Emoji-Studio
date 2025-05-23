import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { curl } = await request.json()

    // Extract URL from curl command
    const urlMatch = curl.match(/curl\s+['"]?([^'"]+)['"]?/)
    const url = urlMatch ? urlMatch[1] : null

    // Extract headers from curl command
    const headers: Record<string, string> = {}
    const headerMatches = curl.matchAll(/-H\s+['"]([^:]+):\s*([^'"]+)['"]/g)
    for (const match of headerMatches) {
      headers[match[1]] = match[2]
    }

    // Extract form data from curl command
    const formData: Record<string, string> = {}
    const formMatches = curl.matchAll(/--data-urlencode\s+['"]([^=]+)=([^'"]+)['"]/g)
    for (const match of formMatches) {
      formData[match[1]] = match[2]
    }

    // Check for post_type
    const hasPostType = Object.keys(formData).some((key) => key === "post_type")

    return NextResponse.json({
      success: true,
      debug: {
        curlLength: curl.length,
        url,
        headers: Object.keys(headers),
        formDataKeys: Object.keys(formData),
        hasPostType,
        formData: formData,
      },
    })
  } catch (error) {
    console.error("Debug error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
