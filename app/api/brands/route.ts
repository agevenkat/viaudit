import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';
import { PLAN_LIMITS } from '@/lib/constants';

const createBrandSchema = z.object({
  name:        z.string().min(1).max(100),
  domain:      z.string().min(1).max(253),
  category:    z.string().min(1).max(100),
  competitors: z.array(z.string().max(100)),
});

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const brands = await prisma.brand.findMany({
      where:   { userId: session.user.id },
      include: {
        visibilityScores: {
          orderBy: { weekOf: 'desc' },
          take:    1,
        },
        scans: {
          orderBy: { createdAt: 'desc' },
          take:    1,
          select:  { status: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ brands });
  } catch (err) {
    logger.error({ err }, 'api/brands GET: unhandled error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await req.json();
    const parsed = createBrandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Enforce plan brand limit
    const plan   = session.user.plan;
    const limits = PLAN_LIMITS[plan];
    const count  = await prisma.brand.count({ where: { userId: session.user.id } });

    if (count >= limits.brands) {
      return NextResponse.json(
        { error: `Your ${limits.label} plan allows a maximum of ${limits.brands} brands.` },
        { status: 403 }
      );
    }

    // Enforce competitor limit
    const maxComps = limits.competitors;
    const comps    = parsed.data.competitors.slice(0, maxComps === Infinity ? undefined : maxComps);

    const brand = await prisma.brand.create({
      data: {
        userId:      session.user.id,
        name:        parsed.data.name,
        domain:      parsed.data.domain,
        category:    parsed.data.category,
        competitors: comps,
      },
    });

    logger.info({ userId: session.user.id, brandId: brand.id }, 'api/brands: created');

    return NextResponse.json({ brand }, { status: 201 });
  } catch (err) {
    logger.error({ err }, 'api/brands POST: unhandled error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
