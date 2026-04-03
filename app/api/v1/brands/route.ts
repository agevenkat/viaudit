import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authResult = await requireApiAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { user } = authResult;

    const brands = await prisma.brand.findMany({
      where:   { userId: user.id },
      include: {
        visibilityScores: {
          orderBy: { weekOf: 'desc' },
          take:    1,
          select:  {
            overallScore:    true,
            chatgptScore:    true,
            perplexityScore: true,
            geminiScore:     true,
            claudeScore:     true,
            shareOfVoice:    true,
            weekOf:          true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      data: brands.map((b) => ({
        id:          b.id,
        name:        b.name,
        domain:      b.domain,
        category:    b.category,
        competitors: b.competitors,
        latestScore: b.visibilityScores[0] ?? null,
        createdAt:   b.createdAt,
      })),
    });
  } catch (err) {
    logger.error({ err }, 'api/v1/brands: error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
