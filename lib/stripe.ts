import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] ?? '', {
      apiVersion: '2026-03-25.dahlia',
      typescript:  true,
    });
  }
  return _stripe;
}

// Convenience re-export for inline use
export const stripe = {
  get checkout()       { return getStripe().checkout; },
  get billingPortal()  { return getStripe().billingPortal; },
  get webhooks()       { return getStripe().webhooks; },
  get subscriptions()  { return getStripe().subscriptions; },
  get customers()      { return getStripe().customers; },
};

export const STRIPE_PRICE_IDS = {
  STARTER:    process.env['STRIPE_STARTER_PRICE_ID']    ?? '',
  AGENCY:     process.env['STRIPE_AGENCY_PRICE_ID']     ?? '',
  ENTERPRISE: process.env['STRIPE_ENTERPRISE_PRICE_ID'] ?? '',
} as const;
