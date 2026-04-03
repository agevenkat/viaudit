import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import { processScan } from '@/lib/scan/processScan';
import { logger } from '@/lib/logger';

// Allow up to 5 minutes — needed for the scan to complete within this function
export const maxDuration = 300;

const triggerSchema = z.object({
  brandId: z.string().cuid(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await req.json();
    const parsed = triggerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { brandId } = parsed.data;

    // Verify ownership
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId: session.user.id },
    });
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Prevent duplicate in-flight scans
    const running = await prisma.scan.findFirst({
      where: { brandId, status: { in: ['PENDING', 'RUNNING'] } },
    });
    if (running) {
      return NextResponse.json({ error: 'Scan already in progress', scanId: running.id }, { status: 409 });
    }

    const weekOf = getMonday(new Date());

    // Create scan record immediately so the UI sees PENDING right away
    let scan;
    try {
      scan = await prisma.scan.upsert({
        where:  { brandId_weekOf: { brandId, weekOf } },
        update: { status: 'PENDING', errorMsg: null },
        create: { brandId, weekOf, status: 'PENDING' },
      });
    } catch (upsertErr) {
      // Fallback: if upsert fails (e.g. constraint issue), try create
      logger.warn({ upsertErr, brandId, weekOf }, 'api/scans: upsert failed, trying create');
      scan = await prisma.scan.create({
        data: { brandId, weekOf, status: 'PENDING' },
      });
    }

    logger.info({ brandId, scanId: scan.id }, 'api/scans: scan queued');

    // Fire-and-forget: start the scan pipeline without blocking the response.
    // We don't await this — the function stays alive due to maxDuration.
    processScan(brandId, weekOf).catch((scanErr) => {
      logger.error({ scanErr, brandId, scanId: scan.id }, 'api/scans: background scan failed');
    });

    return NextResponse.json({ queued: true, scanId: scan.id }, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, message }, 'api/scans POST: unhandled error');
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId');

    const brands = await prisma.brand.findMany({
      where:  { userId: session.user.id },
      select: { id: true },
    });
    const allowedIds = new Set(brands.map((b) => b.id));

    if (brandId && !allowedIds.has(brandId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const scans = await prisma.scan.findMany({
      where:   { brandId: brandId ?? { in: Array.from(allowedIds) } },
      orderBy: { createdAt: 'desc' },
      take:    50,
    });

    return NextResponse.json({ scans });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, message }, 'api/scans GET: unhandled error');
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}

function getMonday(date: Date): Date {
  const d    = new Date(date);
  const day  = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
