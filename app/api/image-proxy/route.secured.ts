/**
 * Secured image proxy with SSRF protection and caching
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSecureHandler } from '@/lib/utils/api-security'

// Allowed image domains
const ALLOWED_DOMAINS = [
  // Slack CDN domains
  'emoji.slack-edge.com',
  'a.slack-edge.com',
  'ca.slack-edge.com',
  'files.slack.com',
  'slack.com',
  // Common emoji/image CDN domains
  'twemoji.maxcdn.com',
  'github.githubassets.com',
  'raw.githubusercontent.com',
  // Add your own CDN domains here
]

// Allowed image extensions
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']

// Maximum image size (5MB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

// Validate if URL is allowed
function isAllowedUrl(url: string): { allowed: boolean; reason?: string } {
  try {
    const parsedUrl = new URL(url)
    
    // Check protocol
    if (parsedUrl.protocol !== 'https:') {
      return { allowed: false, reason: 'Only HTTPS URLs are allowed' }
    }
    
    // Check domain
    const hostname = parsedUrl.hostname.toLowerCase()
    const isAllowedDomain = ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    )
    
    if (!isAllowedDomain) {
      return { allowed: false, reason: 'Domain not in allowlist' }
    }
    
    // Check file extension
    const pathname = parsedUrl.pathname.toLowerCase()
    const hasAllowedExtension = ALLOWED_EXTENSIONS.some(ext => 
      pathname.endsWith(ext)
    )
    
    if (!hasAllowedExtension) {
      return { allowed: false, reason: 'File type not allowed' }
    }
    
    // Check for common SSRF patterns
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname.includes('internal') ||
      hostname.includes('private')
    ) {
      return { allowed: false, reason: 'Internal URLs not allowed' }
    }
    
    return { allowed: true }
  } catch {
    return { allowed: false, reason: 'Invalid URL format' }
  }
}

async function handleImageProxy(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')
  
  if (!imageUrl) {
    return NextResponse.json(
      { error: 'Missing image URL parameter' },
      { status: 400 }
    )
  }
  
  // Validate URL
  const validation = isAllowedUrl(imageUrl)
  if (!validation.allowed) {
    return NextResponse.json(
      { error: 'Invalid image URL', reason: validation.reason },
      { status: 400 }
    )
  }
  
  try {
    // Set up request with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Emoji-Studio-Image-Proxy/1.0',
        'Accept': 'image/*',
      },
      // Prevent following too many redirects
      redirect: 'follow',
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }
    
    // Check content type
    const contentType = response.headers.get('Content-Type')
    if (!contentType || !contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Response is not an image' },
        { status: 400 }
      )
    }
    
    // Check content length
    const contentLength = response.headers.get('Content-Length')
    if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: 'Image too large', maxSize: MAX_IMAGE_SIZE },
        { status: 413 }
      )
    }
    
    // Stream the image with size limit
    const reader = response.body?.getReader()
    if (!reader) {
      return NextResponse.json(
        { error: 'Failed to read image data' },
        { status: 500 }
      )
    }
    
    const chunks: Uint8Array[] = []
    let totalSize = 0
    
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      totalSize += value.length
      
      // Enforce size limit while streaming
      if (totalSize > MAX_IMAGE_SIZE) {
        reader.cancel()
        return NextResponse.json(
          { error: 'Image too large', maxSize: MAX_IMAGE_SIZE },
          { status: 413 }
        )
      }
      
      chunks.push(value)
    }
    
    // Combine chunks
    const imageData = new Uint8Array(totalSize)
    let offset = 0
    for (const chunk of chunks) {
      imageData.set(chunk, offset)
      offset += chunk.length
    }
    
    // Return the image with appropriate headers
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Content-Length', totalSize.toString())
    
    // Add caching headers
    headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400') // 24 hours
    headers.set('Vary', 'Accept-Encoding')
    
    // Add security headers
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('Content-Security-Policy', "default-src 'none'; img-src 'self'")
    
    return new NextResponse(imageData, {
      status: 200,
      headers
    })
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 504 }
      )
    }
    
    console.error('Image proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    )
  }
}

// Export secured handler with rate limiting
export const GET = createSecureHandler(handleImageProxy, {
  rateLimit: true,
  cors: true
})

// Add HEAD support for efficient caching checks
export const HEAD = createSecureHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')
  
  if (!imageUrl) {
    return new NextResponse(null, { status: 400 })
  }
  
  const validation = isAllowedUrl(imageUrl)
  if (!validation.allowed) {
    return new NextResponse(null, { status: 400 })
  }
  
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' })
    
    if (!response.ok) {
      return new NextResponse(null, { status: response.status })
    }
    
    const headers = new Headers()
    const contentType = response.headers.get('Content-Type')
    const contentLength = response.headers.get('Content-Length')
    
    if (contentType) headers.set('Content-Type', contentType)
    if (contentLength) headers.set('Content-Length', contentLength)
    headers.set('Cache-Control', 'public, max-age=86400')
    
    return new NextResponse(null, { status: 200, headers })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}, {
  rateLimit: true,
  cors: true
})