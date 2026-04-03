/**
 * GET /api/public/badge/[brandId]
 * Returns an SVG badge showing the brand's current AI visibility score.
 * No auth required — designed to be embedded in websites.
 *
 * Query params:
 *   ?style=flat|round|shield   (default: round)
 *   ?theme=dark|light          (default: dark)
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic  = 'force-dynamic';
export const revalidate = 0;

function scoreColor(score: number): string {
  if (score >= 70) return '#4ade80'; // green
  if (score >= 40) return '#facc15'; // yellow
  return '#f87171';                  // red
}

function buildSVG(score: number, style: string, theme: string): string {
  const color      = scoreColor(score);
  const bg         = theme === 'light' ? '#f4f4f5' : '#18181b';
  const labelColor = theme === 'light' ? '#3f3f46' : '#a1a1aa';
  const textColor  = theme === 'light' ? '#18181b' : '#f4f4f5';
  const radius     = style === 'flat' ? '4' : '20';
  const scoreStr   = Math.round(score).toString();

  if (style === 'shield') {
    // Compact badge (shields.io style)
    const w = 120, h = 20;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="75" height="${h}" rx="3" fill="${bg}"/>
  <rect x="75" width="45" height="${h}" rx="3" fill="${color}"/>
  <text x="37" y="14" font-family="DejaVu Sans,sans-serif" font-size="11" fill="${labelColor}" text-anchor="middle">AI Visibility</text>
  <text x="97" y="14" font-family="DejaVu Sans,sans-serif" font-size="11" fill="#000" font-weight="bold" text-anchor="middle">${scoreStr}/100</text>
</svg>`;
  }

  // Round / flat styles — large embeddable badge
  const w = 160, h = 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" rx="${radius}" fill="${bg}"/>
  <text x="12" y="20" font-family="-apple-system,sans-serif" font-size="10" fill="${labelColor}" letter-spacing="0.05em">AI VISIBILITY SCORE</text>
  <text x="12" y="48" font-family="-apple-system,sans-serif" font-size="30" font-weight="700" fill="${textColor}">${scoreStr}</text>
  <text x="64" y="48" font-family="-apple-system,sans-serif" font-size="14" fill="${labelColor}">/100</text>
  <circle cx="140" cy="32" r="14" fill="${color}22"/>
  <circle cx="140" cy="32" r="8"  fill="${color}"/>
</svg>`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> },
): Promise<NextResponse> {
  const { brandId } = await params;
  const { searchParams } = req.nextUrl;
  const style = searchParams.get('style') ?? 'round';
  const theme = searchParams.get('theme') ?? 'dark';

  const latestScore = await prisma.visibilityScore.findFirst({
    where:   { brandId },
    orderBy: { weekOf: 'desc' },
  });

  const score = latestScore?.overallScore ?? 0;
  const svg   = buildSVG(score, style, theme);

  return new NextResponse(svg, {
    headers: {
      'Content-Type':  'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
