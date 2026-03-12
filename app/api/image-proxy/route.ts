import { NextRequest, NextResponse } from 'next/server';
import { validateImageProxyUrl, sanitizeErrorResponse } from "@/lib/utils/url-validation"

const ALLOWED_ORIGINS = [
  'chrome-extension://',
  'https://app.emojistudio.xyz',
  'https://emojistudio.xyz',
  'http://localhost:3000',
]

function getCorsOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin')
  if (origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed) || origin === allowed)) {
    return origin
  }
  return 'https://app.emojistudio.xyz'
}

export async function GET(request: NextRequest) {
  // Note: Rate limiting removed to support bulk emoji downloads (500+ emojis)
  // This endpoint only proxies images and is low-risk for abuse

  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing image URL', { status: 400 });
  }

  try {
    // Validate URL - only allow whitelisted image domains
    const validation = validateImageProxyUrl(imageUrl);
    if (!validation.valid) {
      return new NextResponse(validation.error || 'Invalid image URL', { status: 400 });
    }

    const response = await fetch(imageUrl, {
      headers: {
        // It's good practice to pass through some headers if needed, e.g., User-Agent,
        // but for simple image fetching, it's often not required for public emoji sites.
        // 'User-Agent': 'Emoji-Dashboard-Image-Proxy/1.0',
      },
    });

    if (!response.ok) {
      console.error(`Image proxy: Failed to fetch ${imageUrl}, status: ${response.status}`);
      return new NextResponse(`Failed to fetch image: ${response.status} ${response.statusText}`, {
        status: response.status,
      });
    }

    const imageBlob = await response.blob();
    const headers = new Headers();
    // Pass through the original Content-Type from the source
    const contentType = response.headers.get('Content-Type');
    if (contentType) {
      headers.set('Content-Type', contentType);
    }
    // Enable caching for proxied images (emojis are static content)
    headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800'); // Cache 1 day, stale for 7 days
    headers.set('Access-Control-Allow-Origin', getCorsOrigin(request));

    return new NextResponse(imageBlob, { status: 200, headers });

  } catch (error: unknown) {
    console.error(`Image proxy error for URL ${imageUrl}:`, error);
    const sanitized = sanitizeErrorResponse(error, "Error fetching image")
    return new NextResponse(sanitized.message, { status: 500 });
  }
}
