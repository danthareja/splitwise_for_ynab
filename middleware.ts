import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authorizationHeader = request.headers.get('authorization');
  const token = authorizationHeader?.split('Bearer ')?.[1];
  const allowedTokens = process.env.API_SECRET_KEY_LIST?.split(',') || [];

  // Skip authorization for non-API routes or other specific paths if needed in the future
  // For now, this middleware is only applied to paths defined in the matcher
  
  if (!token || !allowedTokens.includes(token)) {
    console.log('Middleware: Rejected token:', token, 'for path:', request.nextUrl.pathname);
    return NextResponse.json(
      { data: null, error: "You're not authorized" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

// Matcher specifies which routes this middleware will run on
export const config = {
  matcher: ['/api/splitwise_to_ynab/:path*', '/api/ynab_to_splitwise/:path*'],
}; 