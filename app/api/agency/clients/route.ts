import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';

const inviteSchema = z.object({
  clientEmail: z.string().email(),
  brandId:     z.string().cuid(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['AGENCY', 'ENTERPRISE'].includes(session.user.plan)) {
      return NextResponse.json({ error: 'Agency or Enterprise plan required' }, { status: 403 });
    }

    const body: unknown = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { clientEmail, brandId } = parsed.data;

    // Verify brand ownership
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId: session.user.id },
    });
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const link = await prisma.clientLink.create({
      data: {
        agencyId:    session.user.id,
        brandId,
        clientEmail,
      },
    });

    const shareUrl = `${process.env['NEXT_PUBLIC_APP_URL'] ?? ''}/client/${link.token}`;

    logger.info({ agencyId: session.user.id, brandId, clientEmail }, 'agency: client link created');

    return NextResponse.json({ token: link.token, shareUrl }, { status: 201 });
  } catch (err) {
    logger.error({ err }, 'api/agency/clients: error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const links = await prisma.clientLink.findMany({
      where:   { agencyId: session.user.id },
      include: { brand: { select: { name: true, domain: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ links });
  } catch (err) {
    logger.error({ err }, 'api/agency/clients GET: error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
