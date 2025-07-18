import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url, formData, headers, blob, fileName, mimeType } = body

    if (!url || !blob || !fileName) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      )
    }

    console.log("Slack upload request:", { url, formData, fileName, mimeType })

    // Convert the base64 blob back to binary
    const blobData = await fetch(blob).then(res => res.blob())

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
      console.error("Failed to parse Slack response as JSON:", responseText)
      responseData = { error: "Invalid response from Slack", responseText }
    }

    console.log("Slack response:", responseData)

    // Check if Slack returned an error
    if (!response.ok || responseData.error || responseData.ok === false) {
      return NextResponse.json(
        { 
          error: responseData.error || "Failed to upload emoji to Slack",
          details: responseData 
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true,
      data: responseData 
    })

  } catch (error) {
    console.error("Slack emoji upload error:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload emoji" },
      { status: 500 }
    )
  }
}