/**
 * Slack alert helpers — score-drop notifications + weekly digest.
 * Uses Incoming Webhooks (no OAuth required).
 */

interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

interface SlackPayload {
  blocks: SlackBlock[];
  text?: string;
}

export async function sendSlackMessage(
  webhookUrl: string,
  payload: SlackPayload,
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Slack webhook failed: ${res.status} ${await res.text()}`);
  }
}

// ── Score-drop alert ──────────────────────────────────────────

export function buildScoreDropAlert(
  brandName:    string,
  currentScore: number,
  prevScore:    number,
  reportUrl:    string,
): SlackPayload {
  const drop = Math.round(prevScore - currentScore);
  return {
    text: `⚠️ ${brandName} AI visibility dropped ${drop} points`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `⚠️ AI Visibility Drop — ${brandName}`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Previous score*\n${prevScore}/100` },
          { type: 'mrkdwn', text: `*Current score*\n${currentScore}/100` },
          { type: 'mrkdwn', text: `*Drop*\n-${drop} points this week` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `Fewer AI engines are mentioning *${brandName}* in responses compared to last week. ` +
            `Check your report for recommended actions.`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type:  'button',
            style: 'primary',
            text:  { type: 'plain_text', text: 'View Full Report', emoji: true },
            url:   reportUrl,
          },
        ],
      },
    ],
  };
}

// ── Weekly digest ─────────────────────────────────────────────

export function buildWeeklyDigest(
  brandName:   string,
  score:       number,
  delta:       number | null,
  shareOfVoice: number,
  topRec:      string | null,
  reportUrl:   string,
): SlackPayload {
  const deltaText =
    delta === null   ? 'First scan 🎉' :
    delta  >   0     ? `+${delta} pts ↑` :
    delta  === 0     ? 'No change →' :
                       `${delta} pts ↓`;

  const scoreEmoji =
    score >= 70 ? '🟢' :
    score >= 40 ? '🟡' :
                  '🔴';

  return {
    text: `📊 Weekly AI Visibility Report for ${brandName}: ${score}/100`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📊 Weekly AI Visibility Report — ${brandName}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*AI Visibility Score*\n${scoreEmoji} ${score}/100` },
          { type: 'mrkdwn', text: `*Week-over-week*\n${deltaText}` },
          { type: 'mrkdwn', text: `*Share of Voice*\n${Math.round(shareOfVoice)}%` },
        ],
      },
      ...(topRec
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*🎯 Top action this week:*\n${topRec}`,
              },
            },
          ]
        : []),
      {
        type: 'actions',
        elements: [
          {
            type:  'button',
            style: 'primary',
            text:  { type: 'plain_text', text: 'View Full Report', emoji: true },
            url:   reportUrl,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'Sent by <https://www.viaudit.com|ViAudit> · AI Visibility Intelligence',
          },
        ],
      },
    ],
  };
}
