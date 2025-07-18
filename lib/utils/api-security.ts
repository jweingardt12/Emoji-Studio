import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

/**
 * Rate limiter using in-memory storage (for production, use Redis)
 */
class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>()
  
  constructor(
    private maxRequests: number = 60,
    private windowMs: number = 60 * 1000 // 1 minute
  ) {}

  async check(identifier: string): Promise<boolean> {
    const now = Date.now()
    const record = this.requests.get(identifier)
    
    if (!record || record.resetTime < now) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      })
      return true
    }
    
    if (record.count >= this.maxRequests) {
      return false
    }
    
    record.count++
    return true
  }

  getRemainingRequests(identifier: string): number {
    const record = this.requests.get(identifier)
    if (!record || record.resetTime < Date.now()) {
      return this.maxRequests
    }
    return Math.max(0, this.maxRequests - record.count)
  }

  getResetTime(identifier: string): number {
    const record = this.requests.get(identifier)
    return record?.resetTime || Date.now() + this.windowMs
  }
}

// Singleton rate limiter
export const rateLimiter = new RateLimiter()

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get("x-forwarded-for")
  const real = request.headers.get("x-real-ip")
  const ip = forwarded?.split(",")[0] || real || "unknown"
  
  // You could also use a session ID or API key here
  return ip
}

/**
 * Apply rate limiting to a request
 */
export async function applyRateLimit(
  request: NextRequest,
  limiter: RateLimiter = rateLimiter
): Promise<NextResponse | null> {
  const identifier = getClientIdentifier(request)
  const allowed = await limiter.check(identifier)
  
  if (!allowed) {
    const resetTime = limiter.getResetTime(identifier)
    const remaining = limiter.getRemainingRequests(identifier)
    
    return NextResponse.json(
      { 
        error: "Too many requests", 
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      },
      { 
        status: 429,
        headers: {
          "X-RateLimit-Limit": "60",
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": new Date(resetTime).toISOString(),
          "Retry-After": Math.ceil((resetTime - Date.now()) / 1000).toString()
        }
      }
    )
  }
  
  return null
}

/**
 * Validate request body against a Zod schema
 */
export function validateRequestBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): { data?: T; error?: NextResponse } {
  try {
    const data = schema.parse(body)
    return { data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: NextResponse.json(
          {
            error: "Invalid request body",
            details: error.errors.map(e => ({
              path: e.path.join("."),
              message: e.message
            }))
          },
          { status: 400 }
        )
      }
    }
    
    return {
      error: NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      )
    }
  }
}

/**
 * Verify API key or session token
 */
export async function verifyAuth(
  request: NextRequest
): Promise<{ authorized: boolean; userId?: string; error?: NextResponse }> {
  // Check for API key in header
  const apiKey = request.headers.get("x-api-key")
  if (apiKey) {
    // In production, validate against database
    if (apiKey === process.env.API_KEY) {
      return { authorized: true, userId: "api" }
    }
  }
  
  // Check for session cookie
  const sessionCookie = request.cookies.get("session")
  if (sessionCookie) {
    // In production, validate session against database/cache
    // For now, just check if it exists
    return { authorized: true, userId: "session" }
  }
  
  // Check for Bearer token
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    // In production, validate JWT or OAuth token
    if (token === process.env.BEARER_TOKEN) {
      return { authorized: true, userId: "bearer" }
    }
  }
  
  return {
    authorized: false,
    error: NextResponse.json(
      { error: "Unauthorized", message: "Valid authentication required" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
    )
  }
}

/**
 * Sanitize error messages for production
 */
export function sanitizeError(error: unknown): { message: string; details?: any } {
  if (process.env.NODE_ENV === "development") {
    // In development, return full error details
    if (error instanceof Error) {
      return {
        message: error.message,
        details: {
          stack: error.stack,
          name: error.name
        }
      }
    }
    return { message: String(error) }
  }
  
  // In production, return generic messages
  if (error instanceof Error) {
    // Log the full error server-side
    console.error("API Error:", error)
    
    // Return sanitized message to client
    return {
      message: "An error occurred processing your request"
    }
  }
  
  return { message: "An unexpected error occurred" }
}

/**
 * CORS configuration
 */
export function setCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
  response.headers.set("Access-Control-Max-Age", "86400")
  return response
}

/**
 * Log API request for monitoring
 */
export function logApiRequest(
  request: NextRequest,
  response: NextResponse,
  startTime: number
) {
  const duration = Date.now() - startTime
  const logData = {
    timestamp: new Date().toISOString(),
    method: request.method,
    path: request.nextUrl.pathname,
    status: response.status,
    duration,
    ip: getClientIdentifier(request),
    userAgent: request.headers.get("user-agent")
  }
  
  // In production, send to logging service
  console.log("API Request:", JSON.stringify(logData))
}

/**
 * Create a secure API handler with common middleware
 */
export function createSecureHandler<T = any>(
  handler: (request: NextRequest, params?: any) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean
    rateLimit?: boolean
    schema?: z.ZodSchema<T>
    cors?: boolean
  } = {}
): (request: NextRequest, params?: any) => Promise<NextResponse> {
  return async (request: NextRequest, params?: any) => {
    const startTime = Date.now()
    
    try {
      // Apply CORS if needed
      if (request.method === "OPTIONS" && options.cors) {
        const response = new NextResponse(null, { status: 204 })
        return setCorsHeaders(response)
      }
      
      // Apply rate limiting
      if (options.rateLimit) {
        const rateLimitResponse = await applyRateLimit(request)
        if (rateLimitResponse) {
          logApiRequest(request, rateLimitResponse, startTime)
          return rateLimitResponse
        }
      }
      
      // Verify authentication
      if (options.requireAuth) {
        const { authorized, error } = await verifyAuth(request)
        if (!authorized && error) {
          logApiRequest(request, error, startTime)
          return error
        }
      }
      
      // Handle the request
      const response = await handler(request, params)
      
      // Apply CORS headers to response
      if (options.cors) {
        setCorsHeaders(response)
      }
      
      // Log the request
      logApiRequest(request, response, startTime)
      
      return response
    } catch (error) {
      const errorData = sanitizeError(error)
      const response = NextResponse.json(
        { error: errorData.message, ...errorData },
        { status: 500 }
      )
      
      logApiRequest(request, response, startTime)
      return response
    }
  }
}