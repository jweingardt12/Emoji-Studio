/**
 * URL validation utilities for proxy routes
 * Prevents SSRF attacks by whitelisting domains and blocking private IP ranges
 */

// Allowed domains for proxy requests
const ALLOWED_DOMAINS = [
  'slack.com',
  'slack-edge.com',
  'slackmojis.com',
  'a.]slack-edge.com',
  'ca.slack-edge.com',
  'emoji.slack-edge.com',
  'files.slack.com',
  'avatars.slack-edge.com',
]

// Private/internal IP patterns to block
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./, // AWS metadata endpoint
  /^0\./, // Invalid
  /^\[::1\]$/, // IPv6 localhost
  /^fc00:/i, // IPv6 private
  /^fe80:/i, // IPv6 link-local
]

export interface UrlValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates a URL for proxy requests
 * @param url The URL to validate
 * @param options Configuration options
 * @returns Validation result with error message if invalid
 */
export function validateProxyUrl(
  url: string,
  options: {
    allowedDomains?: string[]
    requireHttps?: boolean
  } = {}
): UrlValidationResult {
  const { allowedDomains = ALLOWED_DOMAINS, requireHttps = true } = options

  // Check if URL is provided
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' }
  }

  // Parse the URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }

  // Check protocol
  if (requireHttps && parsedUrl.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTPS URLs are allowed' }
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { valid: false, error: 'Invalid URL protocol - only HTTP/HTTPS allowed' }
  }

  const hostname = parsedUrl.hostname.toLowerCase()

  // Block private/internal IPs
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, error: 'Access to private/internal networks is not allowed' }
    }
  }

  // Check against allowed domains
  const isAllowedDomain = allowedDomains.some(domain => {
    const domainLower = domain.toLowerCase()
    return hostname === domainLower || hostname.endsWith('.' + domainLower)
  })

  if (!isAllowedDomain) {
    return {
      valid: false,
      error: `Domain not allowed. Allowed domains: ${allowedDomains.join(', ')}`
    }
  }

  return { valid: true }
}

/**
 * Validates a URL for image proxy requests (slightly more permissive)
 * Allows additional image hosting domains
 */
export function validateImageProxyUrl(url: string): UrlValidationResult {
  const imageAllowedDomains = [
    ...ALLOWED_DOMAINS,
    'githubusercontent.com',
    'raw.githubusercontent.com',
    'emojis.slackmojis.com',
  ]

  return validateProxyUrl(url, {
    allowedDomains: imageAllowedDomains,
    requireHttps: false // Allow HTTP for some image sources
  })
}

/**
 * Sanitizes error messages for production
 * Only returns detailed errors in development mode
 */
export function sanitizeErrorResponse(
  error: unknown,
  defaultMessage = 'An error occurred'
): { message: string; details?: string; stack?: string } {
  const isDev = process.env.NODE_ENV === 'development'

  if (error instanceof Error) {
    if (isDev) {
      return {
        message: error.message,
        details: error.message,
        stack: error.stack
      }
    }
    // Log the full error server-side
    console.error('API Error:', error)
    return { message: defaultMessage }
  }

  if (isDev) {
    return {
      message: String(error),
      details: String(error)
    }
  }

  console.error('API Error:', error)
  return { message: defaultMessage }
}

/**
 * Redacts sensitive values from log output
 */
export function redactSensitive(value: string, visibleChars = 4): string {
  if (!value || value.length <= visibleChars) {
    return '[REDACTED]'
  }
  return value.substring(0, visibleChars) + '...[REDACTED]'
}

/**
 * Checks if logging is allowed for sensitive data
 * Only allows detailed logging in development
 */
export function shouldLogSensitive(): boolean {
  return process.env.NODE_ENV === 'development'
}
