import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing image URL', { status: 400 });
  }

  try {
    // Validate the URL to prevent potential SSRF vulnerabilities if needed, though for known emoji sources it might be less critical.
    // For example, ensure it's an http/https URL and optionally restrict to known domains.
    const parsedUrl = new URL(imageUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return new NextResponse('Invalid image URL protocol', { status: 400 });
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

  } catch (error: any) {
    console.error(`Image proxy error for URL ${imageUrl}:`, error);
    return new NextResponse(`Error fetching image: ${error.message}`, { status: 500 });
  }
}
