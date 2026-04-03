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

    const scores = await prisma.visibilityScore.findMany({
      where:   { brandId: id },
      orderBy: { weekOf: 'asc' },
    });

    return NextResponse.json({
      data: scores.map((s) => ({
        weekOf:          s.weekOf,
        overallScore:    s.overallScore,
        chatgptScore:    s.chatgptScore,
        perplexityScore: s.perplexityScore,
        geminiScore:     s.geminiScore,
        claudeScore:     s.claudeScore,
        shareOfVoice:    s.shareOfVoice,
        totalPrompts:    s.totalPrompts,
        totalMentions:   s.totalMentions,
      })),
    });
  } catch (err) {
    logger.error({ err }, 'api/v1/brands/scores: error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
