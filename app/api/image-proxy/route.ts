import { NextRequest, NextResponse } from 'next/server';
import { validateImageProxyUrl, sanitizeErrorResponse } from "@/lib/utils/url-validation"
import { applyRateLimit } from "@/lib/utils/api-security"

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

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
    // Optionally, add Cache-Control headers
    // headers.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

    return new NextResponse(imageBlob, { status: 200, headers });

  } catch (error: unknown) {
    console.error(`Image proxy error for URL ${imageUrl}:`, error);
    const sanitized = sanitizeErrorResponse(error, "Error fetching image")
    return new NextResponse(sanitized.message, { status: 500 });
  }
}
