import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';
import { GEO_COUNTRIES, GEO_LANGUAGES } from '@/lib/geo/countries';

const validCountryCodes = new Set(GEO_COUNTRIES.map((c) => c.code));
const validLanguageCodes = new Set(GEO_LANGUAGES.map((l) => l.code));

const updateGeoSchema = z.object({
  geoCountries: z
    .array(z.string().length(2))
    .min(1, 'At least one country required')
    .refine((arr) => arr.every((c) => validCountryCodes.has(c)), {
      message: 'Invalid country code',
    }),
  geoLanguages: z
    .array(z.string().min(2).max(3))
    .min(1, 'At least one language required')
    .refine((arr) => arr.every((l) => validLanguageCodes.has(l)), {
      message: 'Invalid language code',
    }),
});

async function requireOwnership(
  session: { user: { id: string } } | null,
  brandId: string,
) {
  if (!session?.user?.id) return null;
  return prisma.brand.findFirst({
    where: { id: brandId, userId: session.user.id },
    select: { id: true, geoCountries: true, geoLanguages: true },
  });
}

/** GET  /api/brands/[id]/geo — return current geo settings */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const { id } = await params;
    const brand = await requireOwnership(session, id);
    if (!brand) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      geoCountries: brand.geoCountries,
      geoLanguages: brand.geoLanguages,
    });
  } catch (err) {
    logger.error({ err }, 'api/brands/[id]/geo GET: unhandled error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PATCH  /api/brands/[id]/geo — update geo countries + languages */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const { id } = await params;
    const brand = await requireOwnership(session, id);
    if (!brand) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body: unknown = await req.json();
    const parsed = updateGeoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await prisma.brand.update({
      where: { id },
      data: {
        geoCountries: parsed.data.geoCountries,
        geoLanguages: parsed.data.geoLanguages,
      },
      select: { id: true, geoCountries: true, geoLanguages: true },
    });

    logger.info(
      { brandId: id, countries: updated.geoCountries.length, languages: updated.geoLanguages.length },
      'api/brands/[id]/geo: updated',
    );

    return NextResponse.json(updated);
  } catch (err) {
    logger.error({ err }, 'api/brands/[id]/geo PATCH: unhandled error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
