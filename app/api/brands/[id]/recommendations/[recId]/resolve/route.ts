import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; recId: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: brandId, recId } = await params;

    // Verify brand ownership
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId: session.user.id },
    });
    if (!brand) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.recommendation.update({
      where: { id: recId, brandId },
      data:  { resolved: true, resolvedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'api/recommendations/resolve: error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
