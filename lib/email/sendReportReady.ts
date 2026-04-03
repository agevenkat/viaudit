import { Resend } from 'resend';
import { logger } from '@/lib/logger';
import { EMAIL, APP_NAME, ROUTES } from '@/lib/constants';

const resend = new Resend(process.env['RESEND_API_KEY']);

interface ReportReadyParams {
  to:          string;
  brandName:   string;
  overallScore: number;
  weekOf:      Date;
}

export async function sendReportReady(params: ReportReadyParams): Promise<void> {
  const { to, brandName, overallScore, weekOf } = params;
  const appUrl  = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://www.viaudit.com';
  const weekStr = weekOf.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  try {
    await resend.emails.send({
      from:    EMAIL.FROM,
      to:      [to],
      subject: `${brandName} AI visibility report ready — week of ${weekStr}`,
      html: `
        <div style="font-family:'DM Sans',Arial,sans-serif;background:#08090a;color:#f0f0ee;padding:40px 24px;max-width:600px;margin:0 auto;border-radius:12px;">
          <h1 style="font-size:22px;margin-bottom:4px;color:#b8ff57;">${APP_NAME}</h1>
          <h2 style="font-size:18px;font-weight:700;margin-bottom:24px;">Your weekly AI visibility report is ready</h2>
          <p style="color:#8a8a86;margin-bottom:20px;">Week of ${weekStr}</p>

          <div style="background:#0f1012;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
            <p style="margin:0;color:#8a8a86;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Overall AI Visibility Score</p>
            <p style="margin:8px 0 0;font-size:52px;font-weight:800;color:#b8ff57;">${overallScore}</p>
            <p style="margin:4px 0 0;color:#8a8a86;font-size:13px;">/100</p>
          </div>

          <p style="color:#8a8a86;">
            We've scanned <strong style="color:#f0f0ee;">${brandName}</strong> across ChatGPT, Perplexity, Gemini, and Claude.
            View your full score breakdown, competitor comparison, and fix recommendations below.
          </p>

          <a href="${appUrl}${ROUTES.REPORTS}"
             style="display:inline-block;margin-top:24px;padding:12px 28px;background:#b8ff57;color:#08090a;border-radius:8px;font-weight:700;text-decoration:none;">
            View full report →
          </a>

          <p style="margin-top:40px;color:#8a8a86;font-size:12px;">
            You're receiving this because you have a ${APP_NAME} account.
          </p>
        </div>
      `,
    });

    logger.info({ to, brandName, overallScore }, 'email: report ready sent');
  } catch (err) {
    logger.error({ err, to }, 'email: failed to send report ready');
  }
}
