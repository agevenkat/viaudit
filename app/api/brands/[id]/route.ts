import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';

const updateBrandSchema = z.object({
  name:        z.string().min(1).max(100).optional(),
  domain:      z.string().min(1).max(253).optional(),
  category:    z.string().min(1).max(100).optional(),
  competitors: z.array(z.string().max(100)).optional(),
});

async function requireOwnership(
  session: { user: { id: string } } | null,
  id: string
) {
  if (!session?.user?.id) return null;
  return prisma.brand.findFirst({ where: { id, userId: session.user.id } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    const { id }  = await params;
    const brand   = await requireOwnership(session, id);
    if (!brand) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body: unknown = await req.json();
    const parsed = updateBrandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { name, domain, category, competitors } = parsed.data;
    const updateData: {
      name?: string;
      domain?: string;
      category?: string;
      competitors?: string[];
    } = {};
    if (name       !== undefined) updateData.name        = name;
    if (domain     !== undefined) updateData.domain      = domain;
    if (category   !== undefined) updateData.category    = category;
    if (competitors !== undefined) updateData.competitors = competitors;

    const updated = await prisma.brand.update({
      where: { id },
      data:  updateData,
    });

    return NextResponse.json({ brand: updated });
  } catch (err) {
    logger.error({ err }, 'api/brands PATCH: unhandled error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    const { id }  = await params;
    const brand   = await requireOwnership(session, id);
    if (!brand) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.brand.delete({ where: { id } });

    logger.info({ brandId: id }, 'api/brands: deleted');
    return NextResponse.json({ deleted: true });
  } catch (err) {
    logger.error({ err }, 'api/brands DELETE: unhandled error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
