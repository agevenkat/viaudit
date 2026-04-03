import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import { runGeoAudit } from '@/lib/audit/geoAuditScorer';
import { logger } from '@/lib/logger';

export const maxDuration = 60;

const auditSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .refine(
      (v) => {
        try {
          new URL(v.startsWith('http') ? v : `https://${v}`);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Invalid URL format' },
    ),
  brandId: z.string().cuid().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await req.json();
    const parsed = auditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { url, brandId } = parsed.data;

    // If brandId provided, verify ownership
    if (brandId) {
      const brand = await prisma.brand.findFirst({
        where: { id: brandId, userId: session.user.id },
      });
      if (!brand) {
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
      }
    }

    logger.info({ userId: session.user.id, url, brandId }, 'api/audit: starting GEO audit');

    const result = await runGeoAudit(url);

    // Save to database
    const audit = await prisma.geoAudit.create({
      data: {
        url: result.url,
        overallScore: result.overallScore,
        factors: JSON.parse(JSON.stringify(result.factors)),
        suggestions: JSON.parse(JSON.stringify(result.suggestions)),
        brandId: brandId ?? null,
        userId: session.user.id,
      },
    });

    logger.info(
      { auditId: audit.id, score: result.overallScore, url },
      'api/audit: GEO audit complete',
    );

    return NextResponse.json({ audit: { id: audit.id, ...result } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, message }, 'api/audit POST: unhandled error');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
