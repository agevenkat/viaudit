/**
 * Enterprise API bearer-token authentication helper.
 * Usage: call requireApiAuth(req) — returns the user or a NextResponse error.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';
import type { User } from '@prisma/client';

// Simple in-memory rate limiter: token → { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests per hour
const WINDOW_MS  = 60 * 60 * 1000;

function checkRateLimit(token: string): boolean {
  const now  = Date.now();
  const entry = rateLimitMap.get(token);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(token, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  return true;
}

export async function requireApiAuth(
  req: NextRequest
): Promise<{ user: User } | NextResponse> {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
  }

  const token = authHeader.slice(7);

  if (!checkRateLimit(token)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, {
      status:  429,
      headers: { 'Retry-After': '3600' },
    });
  }

  const user = await prisma.user.findUnique({ where: { apiKey: token } });

  if (!user || user.plan !== 'ENTERPRISE') {
    logger.warn({ token: token.slice(0, 8) }, 'api: invalid or non-enterprise API key');
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  return { user };
}
