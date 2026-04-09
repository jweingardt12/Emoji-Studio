import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url, formData, headers, blob, fileName, mimeType } = body

    // Detailed validation with helpful error messages
    if (!url) {
      return NextResponse.json(
        { error: "Missing 'url' parameter - Slack API endpoint required" },
        { status: 400 }
      )
    }

    if (!blob) {
      return NextResponse.json(
        { error: "Missing 'blob' parameter - image data required (data URL or blob URL)" },
        { status: 400 }
      )
    }

    if (!fileName) {
      return NextResponse.json(
        { error: "Missing 'fileName' parameter - emoji filename required" },
        { status: 400 }
      )
    }

    // Convert the data/blob URL back to binary
    let blobData: Blob
    if (blob.startsWith('data:')) {
      // Handle data URL (base64)
      const parts = blob.split(',')
      if (parts.length !== 2) {
        return NextResponse.json(
          { error: "Invalid data URL format - expected 'data:mime/type;base64,data'" },
          { status: 400 }
        )
      }

      const base64Data = parts[1]
      const binaryData = Buffer.from(base64Data, 'base64')
      blobData = new Blob([binaryData], { type: mimeType || 'image/png' })
    } else if (blob.startsWith('blob:') || blob.startsWith('http')) {
      // Handle blob URL or HTTP URL
      try {
        blobData = await fetch(blob).then(res => res.blob())
      } catch (fetchError) {
        return NextResponse.json(
          { error: "Failed to fetch blob from URL - ensure URL is accessible" },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: "Invalid blob format - expected data URL (data:...) or blob URL (blob:...)" },
        { status: 400 }
      )
    }

    // Create a proper FormData object
    const form = new FormData()
    
    // Add all the form fields
    if (formData && typeof formData === 'object') {
      for (const [key, value] of Object.entries(formData)) {
        if (key !== 'image' && value !== undefined && value !== null) {
          form.append(key, String(value))
        }
      }
    }

    // Add the image file as a Blob
    // In Node.js, we need to use Blob instead of File
    form.append("image", blobData, fileName)

    // Make the request to Slack
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: form,
    })

    let responseData
    const responseText = await response.text()
    
    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      responseData = { error: "Invalid response from Slack", responseText }
    }

    // Check if Slack returned an error
    if (!response.ok || responseData.error || responseData.ok === false) {
      const slackError = responseData.error || "Unknown error"


      return NextResponse.json(
        {
          error: `Slack API error: ${slackError}`,
          details: responseData,
          hint: slackError === 'invalid_auth'
            ? 'Authentication failed - token may be expired or invalid'
            : slackError === 'error_name_taken'
            ? 'An emoji with this name already exists'
            : slackError === 'error_bad_image'
            ? 'Invalid image format or size'
            : 'Check Slack API documentation for error details'
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      fileName: fileName
    })

  } catch (error) {


    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network')

    return NextResponse.json(
      {
        error: isNetworkError
          ? "Network error while uploading to Slack"
          : "Failed to upload emoji to Slack",
        details: errorMessage,
        hint: isNetworkError
          ? "Check internet connection and Slack API availability"
          : "Check server logs for details"
      },
      { status: 500 }
    )
  }
}