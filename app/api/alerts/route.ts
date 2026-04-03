import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';

const PAGE_SIZE = 20;

/**
 * GET /api/alerts?page=1
 * Returns paginated alerts for the current user (most recent first).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? '1'));
    const skip = (page - 1) * PAGE_SIZE;

    const [alerts, total, unreadCount] = await Promise.all([
      prisma.alert.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: PAGE_SIZE,
      }),
      prisma.alert.count({ where: { userId: session.user.id } }),
      prisma.alert.count({
        where: { userId: session.user.id, readAt: null },
      }),
    ]);

    return NextResponse.json({
      alerts,
      unreadCount,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
      total,
    });
  } catch (err) {
    logger.error({ err }, 'api/alerts GET: unhandled error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const markReadSchema = z.object({
  alertIds: z.array(z.string().min(1)).min(1),
});

/**
 * PATCH /api/alerts
 * Mark alerts as read by setting readAt to now.
 * Body: { alertIds: string[] }
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await req.json();
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { alertIds } = parsed.data;

    // Only update alerts owned by this user
    const result = await prisma.alert.updateMany({
      where: {
        id: { in: alertIds },
        userId: session.user.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    logger.info(
      { userId: session.user.id, marked: result.count },
      'api/alerts PATCH: marked read',
    );

    return NextResponse.json({ marked: result.count });
  } catch (err) {
    logger.error({ err }, 'api/alerts PATCH: unhandled error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
