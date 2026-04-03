import React from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma/client';
import { ROUTES, PLAN_LIMITS } from '@/lib/constants';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SettingsForm } from '@/components/dashboard/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect(ROUTES.LOGIN);

  const [user, brandCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where:  { id: session.user.id },
      select: { id: true, name: true, email: true, plan: true, stripeCustomerId: true, apiKey: true, slackWebhookUrl: true },
    }),
    prisma.brand.count({ where: { userId: session.user.id } }),
  ]);

  const limits    = PLAN_LIMITS[user.plan];
  const brandsMax = limits.brands === Infinity ? '∞' : String(limits.brands);

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold">Settings</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">Account, billing and API access.</p>
      </div>

      {/* Profile */}
      <Card className="mb-6">
        <h2 className="font-heading text-lg font-bold mb-4">Profile</h2>
        <SettingsForm name={user.name ?? ''} email={user.email} userId={user.id} slackWebhookUrl={user.slackWebhookUrl ?? null} />
      </Card>

      {/* Plan */}
      <Card className="mb-6">
        <h2 className="font-heading text-lg font-bold mb-4">Plan & Usage</h2>
        <div className="flex items-center gap-3 mb-4">
          <Badge variant="accent">{limits.label}</Badge>
          <span className="text-sm text-[var(--text-muted)]">${limits.price}/month</span>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Brands</span>
            <span>{brandCount} / {brandsMax}</span>
          </div>
          <div className="w-full h-1.5 bg-[var(--bg3)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{
                width: limits.brands === Infinity
                  ? '10%'
                  : `${Math.min(100, (brandCount / limits.brands) * 100)}%`,
              }}
            />
          </div>
        </div>
        {user.stripeCustomerId && (
          <form action="/api/billing/portal" method="POST" className="mt-4">
            <button
              type="submit"
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Manage subscription in Stripe →
            </button>
          </form>
        )}
      </Card>

      {/* API key (Enterprise only) */}
      {user.plan === 'ENTERPRISE' && (
        <Card>
          <h2 className="font-heading text-lg font-bold mb-4">API Access</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Use your API key to access the ViAudit REST API. Keep it secret.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-[var(--bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono truncate">
              {user.apiKey ? `${user.apiKey.slice(0, 8)}${'•'.repeat(24)}` : 'No key generated'}
            </code>
            <form action="/api/billing/api-key" method="POST">
              <button
                type="submit"
                className="text-sm text-[var(--accent)] hover:underline whitespace-nowrap"
              >
                {user.apiKey ? 'Regenerate' : 'Generate key'}
              </button>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}
