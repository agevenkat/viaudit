import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import { sendSlackMessage } from '@/lib/alerts/sendSlackAlert';
import { logger } from '@/lib/logger';

const schema = z.object({
  webhookUrl: z.string().url().startsWith('https://hooks.slack.com/').or(z.literal('')),
});

// PATCH /api/settings/slack — save webhook URL
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body   = (await req.json()) as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data:  { slackWebhookUrl: parsed.data.webhookUrl || null },
  });

  logger.info({ userId: session.user.id }, 'settings: slack webhook updated');
  return NextResponse.json({ ok: true });
}

// POST /api/settings/slack/test — send a test message
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({
    where:  { id: session.user.id },
    select: { slackWebhookUrl: true },
  });

  if (!user.slackWebhookUrl) {
    return NextResponse.json({ error: 'No webhook URL configured' }, { status: 400 });
  }

  try {
    await sendSlackMessage(user.slackWebhookUrl, {
      text: "✅ ViAudit is connected! You'll receive weekly AI visibility reports and score-drop alerts here.",
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '✅ ViAudit is connected to Slack!', emoji: true },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              "You\\'ll receive *weekly AI visibility digest* reports and *score-drop alerts* " +
              'here whenever your brand visibility changes significantly.',
          },
        },
      ],
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'settings: slack test failed');
    return NextResponse.json({ error: 'Failed to send test message. Check your webhook URL.' }, { status: 400 });
  }
}
