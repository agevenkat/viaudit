import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';

export async function POST(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUniqueOrThrow({
      where:  { id: session.user.id },
      select: { stripeCustomerId: true },
    });

    if (!user.stripeCustomerId) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
    }

    const appUrl  = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
    const portal  = await stripe.billingPortal.sessions.create({
      customer:   user.stripeCustomerId,
      return_url: `${appUrl}/settings`,
    });

    return NextResponse.redirect(portal.url);
  } catch (err) {
    logger.error({ err }, 'api/billing/portal: error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
