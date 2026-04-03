/**
 * Next.js 16 middleware — must export a function named `proxy`.
 *
 * Uses NextAuth(authConfig).auth as the wrapper so it reads the v5 cookie
 * (`authjs.session-token` / `__Secure-authjs.session-token`) correctly.
 * getToken from next-auth/jwt looked for the v4 cookie name and always
 * returned null, causing the /login?callbackUrl= redirect loop.
 */
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';
import { ROUTES } from '@/lib/constants';
import type { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ['/', ROUTES.LOGIN, ROUTES.REGISTER];

// auth() wraps our handler and injects `req.auth` (Session | null)
export const proxy = auth(function middleware(
  req: NextRequest & { auth: Session | null },
) {
  const session  = req.auth;
  const pathname = req.nextUrl.pathname;

  const isAuthApi    = pathname.startsWith('/api/auth');
  const isPublicApi  = pathname.startsWith('/api/public');
  const isPublic     = PUBLIC_PATHS.some((p) => pathname === p) || isAuthApi || isPublicApi;
  const isAuthPage   = pathname === ROUTES.LOGIN || pathname === ROUTES.REGISTER;
  const isOnboarding = pathname === ROUTES.ONBOARDING;
  const isClientPage = pathname.startsWith('/client/');
  const isApi        = pathname.startsWith('/api/');

  // Public routes, auth API, public API, white-label client share links — always allowed
  if (isPublic || isClientPage) return NextResponse.next();

  // Not authenticated → login with callbackUrl
  if (!session) {
    const loginUrl = new URL(ROUTES.LOGIN, req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting auth pages → send to dashboard
  if (isAuthPage) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD, req.url));
  }

  // Onboarding not complete → force /onboarding (skip for API routes)
  const onboardingComplete =
    (session.user as unknown as Record<string, unknown>)['onboardingComplete'];
  if (!onboardingComplete && !isOnboarding && !isApi) {
    return NextResponse.redirect(new URL(ROUTES.ONBOARDING, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|api/auth/.*|api/public/.*).*)'],
};
