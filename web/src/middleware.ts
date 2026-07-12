import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEMO_PROFILES: Record<string, string> = {
  buyer: 'buyer-surabaya-restaurant',
  seller: 'seller-probolinggo-cabai',
};

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const isDemo = url.searchParams.get('demo') === '1';
  const role = url.searchParams.get('role');

  if (isDemo && role && DEMO_PROFILES[role]) {
    const actorId = DEMO_PROFILES[role];
    const currentCookie = request.cookies.get('mock_actor')?.value;

    if (currentCookie !== actorId) {
      const response = NextResponse.next();
      response.cookies.set('mock_actor', actorId, {
        path: '/',
        maxAge: 86400,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
