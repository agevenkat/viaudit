/**
 * Edge-safe NextAuth config — no Node.js-only imports (no Prisma, no bcrypt).
 * Used by proxy.ts (middleware) to verify sessions without touching the DB.
 * The full config with Prisma adapter lives in lib/auth.ts.
 */
import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: {
    signIn:  '/login',
    newUser: '/onboarding',
    error:   '/login',
  },
  providers: [
    Google({
      clientId:     process.env['GOOGLE_CLIENT_ID']     ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
    }),
    // Stub — real authorize() is in lib/auth.ts; this satisfies NextAuth's type check.
    Credentials({
      credentials: { email: {}, password: {} },
      authorize:   async () => null,
    }),
  ],
  callbacks: {
    /**
     * Map the JWT fields (written by lib/auth.ts's jwt callback) back onto
     * session.user so the proxy can read session.user.onboardingComplete etc.
     */
    session({ session, token }) {
      if (token['userId']) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = session.user as unknown as Record<string, unknown>;
        u['id']                 = token['userId'];
        u['plan']               = token['plan'];
        u['onboardingComplete'] = token['onboardingComplete'];
      }
      return session;
    },
  },
};
