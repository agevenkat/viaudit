import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';

const onboardingSchema = z.object({
  name:        z.string().min(1).max(100),
  domain:      z.string().min(1).max(253),
  category:    z.string().min(1).max(100),
  competitors: z.array(z.string().min(1).max(100)).max(3),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await req.json();
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, domain, category, competitors } = parsed.data;

    const [brand] = await prisma.$transaction([
      prisma.brand.create({
        data: {
          userId: session.user.id,
          name,
          domain,
          category,
          competitors,
        },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data:  { onboardingComplete: true },
      }),
    ]);

    logger.info({ userId: session.user.id, brandId: brand.id }, 'onboarding: brand created');

    return NextResponse.json({ brand }, { status: 201 });
  } catch (err) {
    logger.error({ err }, 'onboarding: unhandled error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
