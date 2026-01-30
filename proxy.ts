import { NextResponse, type NextRequest } from 'next/server';
import { openpanel } from './app/openpanel/server';

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Skip tracking for API routes, static files, and Next.js specific paths
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // a common way to exclude files like .png, .ico
  ) {
    return NextResponse.next();
  }

  // Handle extension redirect at root - server-side optimization
  // This avoids client-side JavaScript execution for extension users
  if (pathname === '/' && searchParams.get('extension') === 'true') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    // Keep the extension parameter for the dashboard to handle
    return NextResponse.redirect(url);
  }

  // Track the request with OpenPanel
  openpanel.track('Incoming Request', {
    path: pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent'),
    searchParams: searchParams.toString(),
  });

  // Add security headers to response
  const response = NextResponse.next();

  // X-Content-Type-Options prevents MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options prevents clickjacking (allow same origin for extension)
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  // X-XSS-Protection for legacy browser support
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy for privacy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
