import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';
import type { Plan } from '@prisma/client';

const credentialsSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn:  '/login',
    newUser: '/onboarding',
    error:   '/login',
  },
  providers: [
    Google({
      clientId:     process.env['GOOGLE_CLIENT_ID'] ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          logger.warn({ email }, 'auth: invalid password attempt');
          return null;
        }

        return { id: user.id, email: user.email, name: user.name ?? null };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Allow client-side session.update({ onboardingComplete: true }) to patch the JWT
      if (trigger === 'update' && session) {
        const s = session as Record<string, unknown>;
        if (s['onboardingComplete'] !== undefined) {
          token['onboardingComplete'] = s['onboardingComplete'];
        }
        if (s['plan'] !== undefined) {
          token['plan'] = s['plan'];
        }
      }

      if (user?.id) {
        token['userId'] = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { plan: true, onboardingComplete: true },
        });
        token['plan']               = dbUser?.plan ?? 'STARTER';
        token['onboardingComplete'] = dbUser?.onboardingComplete ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token['userId']) {
        session.user.id                = token['userId'] as string;
        session.user.plan              = token['plan'] as Plan;
        session.user.onboardingComplete = token['onboardingComplete'] as boolean;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      logger.info({ userId: user.id, email: user.email }, 'auth: new user created');
    },
    async signIn({ user }) {
      logger.info({ userId: user.id }, 'auth: sign-in');
    },
  },
});
