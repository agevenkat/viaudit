import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await requireApiAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { user } = authResult;
    const { id }   = await params;

    const brand = await prisma.brand.findFirst({
      where: { id, userId: user.id },
    });
    if (!brand) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const recs = await prisma.recommendation.findMany({
      where:   { brandId: id, resolved: false },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      data: recs.map((r) => ({
        id:             r.id,
        type:           r.type,
        priority:       r.priority,
        title:          r.title,
        description:    r.description,
        expectedImpact: r.expectedImpact,
        weekOf:         r.weekOf,
        createdAt:      r.createdAt,
      })),
    });
  } catch (err) {
    logger.error({ err }, 'api/v1/recommendations: error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
