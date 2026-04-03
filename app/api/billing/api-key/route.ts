import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { apiKey: true, apiKeyCreatedAt: true },
    });

    if (!user?.apiKey) {
      return NextResponse.json({ apiKey: null });
    }

    // Return masked key — only show first 8 + last 4 chars
    const masked = user.apiKey.slice(0, 8) + '••••' + user.apiKey.slice(-4);
    return NextResponse.json({
      apiKey:    masked,
      createdAt: user.apiKeyCreatedAt,
    });
  } catch (err) {
    logger.error({ err }, 'api/billing/api-key GET: error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.plan !== 'ENTERPRISE') {
      return NextResponse.json({ error: 'API access requires Enterprise plan' }, { status: 403 });
    }

    const rawKey = `via_${crypto.randomBytes(32).toString('hex')}`;

    await prisma.user.update({
      where: { id: session.user.id },
      data:  { apiKey: rawKey, apiKeyCreatedAt: new Date() },
    });

    logger.info({ userId: session.user.id }, 'api-key: regenerated');

    // Return the raw key once — user must copy it now
    return NextResponse.json({ apiKey: rawKey });
  } catch (err) {
    logger.error({ err }, 'api/billing/api-key: error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
