import { NextResponse, type NextRequest } from 'next/server';
import { openpanel } from './app/openpanel/server'; // Adjust path as necessary

export async function middleware(request: NextRequest) {
  // Skip tracking for API routes, static files, and Next.js specific paths
  if (
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/static/') ||
    request.nextUrl.pathname.includes('.') // a common way to exclude files like .png, .ico
  ) {
    return NextResponse.next();
  }

  // Track the request with OpenPanel
  openpanel.track('Incoming Request', {
    path: request.nextUrl.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent'),
    searchParams: request.nextUrl.searchParams.toString(),
  });

  return NextResponse.next();
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
