import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';
import type { Plan } from '@prisma/client';

const PRICE_TO_PLAN: Record<string, Plan> = {
  [process.env['STRIPE_STARTER_PRICE_ID']    ?? '']: 'STARTER',
  [process.env['STRIPE_AGENCY_PRICE_ID']     ?? '']: 'AGENCY',
  [process.env['STRIPE_ENTERPRISE_PRICE_ID'] ?? '']: 'ENTERPRISE',
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body      = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env['STRIPE_WEBHOOK_SECRET'] ?? ''
    );
  } catch (err) {
    logger.warn({ err }, 'stripe: invalid webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }
      default:
        // Unhandled event types are silently ignored
        break;
    }
  } catch (err) {
    logger.error({ err, eventType: event.type }, 'stripe: webhook handler error');
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
  const customerId     = session.customer as string;
  const subscriptionId = session.subscription as string;
  const userId         = session.metadata?.['userId'];

  if (!userId) {
    logger.warn({ customerId }, 'stripe: checkout.session.completed missing userId metadata');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });
  const priceId = subscription.items.data[0]?.price?.id ?? '';
  const plan    = PRICE_TO_PLAN[priceId] ?? 'STARTER';

  await prisma.user.update({
    where: { id: userId },
    data:  {
      stripeCustomerId:     customerId,
      stripeSubscriptionId: subscriptionId,
      plan,
    },
  });

  logger.info({ userId, plan, customerId }, 'stripe: subscription activated');
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const customerId = sub.customer as string;
  const priceId    = sub.items.data[0]?.price?.id ?? '';
  const plan       = PRICE_TO_PLAN[priceId] ?? 'STARTER';

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data:  { plan, stripeSubscriptionId: sub.id },
  });

  logger.info({ customerId, plan }, 'stripe: subscription updated');
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const customerId = sub.customer as string;

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data:  { plan: 'STARTER', stripeSubscriptionId: null },
  });

  logger.info({ customerId }, 'stripe: subscription cancelled, downgraded to STARTER');
}
