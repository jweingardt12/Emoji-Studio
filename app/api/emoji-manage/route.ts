import { NextRequest, NextResponse } from 'next/server'
import { sanitizeErrorResponse } from "@/lib/utils/url-validation"
import { applyRateLimit } from "@/lib/utils/api-security"

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const { action, emojiName, newName, newAlias, imageData, workspace, slackCurl } = body
    
    // Get Slack credentials from body or fallback to headers
    const curlCommand = slackCurl || request.headers.get('x-slack-curl') || ''
    
    if (!curlCommand) {
      return NextResponse.json({ 
        error: 'No Slack credentials found. Please configure in Settings.' 
      }, { status: 401 })
    }

    // Parse the curl command to extract token and cookie
    const parseCurl = (curl: string) => {
      // First look for token in the form data section of curl
      // The token appears after 'name="token"' and some newlines
      const tokenMatch = curl.match(/name=["']token["']\s*\r?\n\s*\r?\n([^\r\n\\]+)/) || 
                        curl.match(/token["']?\s*\r?\n\r?\n([^\\]+)/) || 
                        curl.match(/token=([^&\s'"]+)/)
      const cookieMatch = curl.match(/-H\s+["']Cookie:\s*([^"']+)["']/) || curl.match(/--cookie\s+["']([^"']+)["']/)
      const workspaceMatch = curl.match(/https:\/\/([^\.]+)\.slack\.com/)
      
      return {
        token: tokenMatch?.[1] || '',
        cookie: cookieMatch?.[1] || '',
        workspace: workspaceMatch?.[1] || workspace || 'slack-workspace'
      }
    }

    const { token, cookie } = parseCurl(curlCommand)

    if (!token) {
      return NextResponse.json({ 
        error: 'Invalid Slack credentials. Please update in Settings.' 
      }, { status: 401 })
    }

    // Handle different actions
    switch (action) {
      case 'rename': {
        if (!emojiName || !newName) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Step 1: Delete old emoji
        const deleteFormData = new FormData()
        deleteFormData.append('token', token)
        deleteFormData.append('name', emojiName)
        deleteFormData.append('_x_reason', 'customize-emoji-remove')
        deleteFormData.append('_x_mode', 'online')

        const deleteResponse = await fetch('https://slack.com/api/emoji.remove', {
          method: 'POST',
          headers: {
            'Cookie': cookie
          },
          body: deleteFormData
        })

        const deleteResult = await deleteResponse.json()
        if (!deleteResult.ok) {
          return NextResponse.json({ 
            error: `Failed to delete old emoji: ${deleteResult.error}` 
          }, { status: 400 })
        }

        // Step 2: Re-add with new name
        // This would require the original image data which we don't have
        // In a real implementation, we'd need to fetch and store the original image
        return NextResponse.json({ 
          message: 'Rename requires re-uploading the emoji image. Please use the Replace function instead.',
          requiresImage: true
        })
      }

      case 'replace': {
        if (!emojiName || !imageData) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Convert base64 image to form data
        const base64Data = imageData.split(',')[1]
        const buffer = Buffer.from(base64Data, 'base64')
        
        const formData = new FormData()
        formData.append('token', token)
        formData.append('name', emojiName)
        formData.append('mode', 'data')
        formData.append('image', new Blob([buffer], { type: 'image/png' }), `${emojiName}.png`)

        const response = await fetch('https://slack.com/api/emoji.add', {
          method: 'POST',
          headers: {
            'Cookie': cookie
          },
          body: formData
        })

        const result = await response.json()
        return NextResponse.json(result)
      }

      case 'alias': {
        if (!emojiName || !newAlias) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Create FormData for multipart request
        const formData = new FormData()
        formData.append('token', token)
        formData.append('name', newAlias)
        formData.append('mode', 'alias')
        formData.append('alias_for', emojiName)
        formData.append('_x_reason', 'customize-emoji-add')
        formData.append('_x_mode', 'online')

        const response = await fetch('https://slack.com/api/emoji.add', {
          method: 'POST',
          headers: {
            'Cookie': cookie
          },
          body: formData
        })

        const result = await response.json()
        return NextResponse.json(result)
      }

      case 'delete': {
        // Get pre-parsed values from the client
        const { token: directToken, cookie: directCookie, boundary, formData: rawFormData } = body
        
        if (!emojiName || !directToken || !directCookie) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Make the request exactly as the browser would
        const response = await fetch(`https://${workspace}.slack.com/api/emoji.remove`, {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=----${boundary}`,
            'Cookie': directCookie,
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Origin': `https://${workspace}.slack.com`,
            'Pragma': 'no-cache',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
          },
          body: rawFormData
        })

        const result = await response.json()
        return NextResponse.json(result)
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Emoji management error:', error)
    const sanitized = sanitizeErrorResponse(error, 'Failed to manage emoji')
    return NextResponse.json({
      error: sanitized.message,
      ...(sanitized.details && { details: sanitized.details })
    }, { status: 500 })
  }
}