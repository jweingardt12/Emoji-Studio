import { parseSlackCurl } from './parse-slack-curl'

/**
 * Compresses a Slack curl command to just the essential data
 * Returns a compressed string that can fit in a QR code
 */
export function compressCurl(curlCommand: string): string {
  const parsed = parseSlackCurl(curlCommand)
  
  if (!parsed.isValid) {
    throw new Error('Invalid curl command')
  }
  
  // Extract only the d cookie value from the full cookie string
  let dValue = ''
  if (parsed.cookie) {
    // Extract just the d cookie value
    const dMatch = parsed.cookie.match(/\bd=([^;]+)/)
    if (dMatch) {
      dValue = dMatch[1]
    } else {
      // Fallback to full cookie if d= not found
      dValue = parsed.cookie
    }
  }
  
  // New optimized format: only send d cookie value
  const essentials = {
    t: parsed.token,  // token
    d: dValue,        // just the d cookie value (not full cookie string)
    w: parsed.workspace, // workspace
  }
  
  // Convert to JSON and compress using base64
  const json = JSON.stringify(essentials)

  // Use URL-safe base64 encoding
  const encoded = btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  return encoded
}

/**
 * Decompresses the essential data and reconstructs a functional curl command
 */
export function decompressCurl(compressed: string): string {
  try {
    // Restore base64 padding if needed
    const padding = compressed.length % 4
    const padded = compressed + (padding ? '='.repeat(4 - padding) : '')
    
    // Convert from URL-safe base64
    const base64 = padded
      .replace(/-/g, '+')
      .replace(/_/g, '/')
    
    // Decode and parse
    const json = atob(base64)
    const essentials = JSON.parse(json)
    
    const { t: token, w: workspace } = essentials
    
    // Handle both old format (full cookie in 'c') and new format (d cookie value in 'd')
    let cookie = ''
    if (essentials.d) {
      // New optimized format - just the d cookie value
      cookie = `d=${essentials.d}`
    } else if (essentials.c) {
      // Old format - full cookie string
      cookie = essentials.c
    }
    
    if (!token || !cookie || !workspace) {
      throw new Error('Missing essential data')
    }
    
    // Reconstruct a minimal but functional curl command
    const timestamp = Math.floor(Date.now() / 1000)
    const curl = `curl 'https://${workspace}.slack.com/api/emoji.adminList?_x_id=generated-${timestamp}&_x_version_ts=noversion&fp=98' \
  -H 'accept: */*' \
  -H 'accept-language: en-US,en;q=0.9' \
  -H 'cache-control: no-cache' \
  -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' \
  -b '${cookie}' \
  -H 'pragma: no-cache' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  --data-raw $'------WebKitFormBoundary7MA4YWxkTrZu0gW\\r\\nContent-Disposition: form-data; name="token"\\r\\n\\r\\n${token}\\r\\n------WebKitFormBoundary7MA4YWxkTrZu0gW\\r\\nContent-Disposition: form-data; name="count"\\r\\n\\r\\n20000\\r\\n------WebKitFormBoundary7MA4YWxkTrZu0gW--\\r\\n'`
    
    return curl
  } catch (e) {
    console.error('Failed to decompress curl:', e)
    throw new Error('Invalid compressed data')
  }
}