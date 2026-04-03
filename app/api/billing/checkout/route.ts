import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';

const checkoutSchema = z.object({
  plan: z.enum(['STARTER', 'AGENCY', 'ENTERPRISE']),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const { plan } = parsed.data;
    const priceId  = STRIPE_PRICE_IDS[plan];
    const appUrl   = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';

    const user = await prisma.user.findUniqueOrThrow({
      where:  { id: session.user.id },
      select: { email: true, stripeCustomerId: true },
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      mode:                'subscription',
      payment_method_types: ['card'],
      line_items:          [{ price: priceId, quantity: 1 }],
      success_url:         `${appUrl}/settings?checkout=success`,
      cancel_url:          `${appUrl}/settings`,
      metadata:            { userId: session.user.id },
      ...(user.stripeCustomerId
        ? { customer: user.stripeCustomerId }
        : { customer_email: user.email }),
    });

    logger.info({ userId: session.user.id, plan }, 'stripe: checkout session created');

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    logger.error({ err }, 'api/billing/checkout: error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
