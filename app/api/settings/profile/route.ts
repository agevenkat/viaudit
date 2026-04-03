import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';

const profileSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await req.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data:  { name: parsed.data.name },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'api/settings/profile: error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
