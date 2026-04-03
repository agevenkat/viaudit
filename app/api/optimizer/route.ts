import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { optimizeContent } from '@/lib/optimizer/contentOptimizer';
import { logger } from '@/lib/logger';

export const maxDuration = 60;

const bodySchema = z.object({
  content:   z.string().min(1, 'Content is required').max(50_000, 'Content too long (max 50 000 chars)'),
  brandName: z.string().min(1, 'Brand name is required').max(100),
  category:  z.string().min(1, 'Category is required').max(100),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const result = await optimizeContent({
      content:   parsed.data.content,
      brandName: parsed.data.brandName,
      category:  parsed.data.category,
    });

    return NextResponse.json(result);
  } catch (err) {
    logger.error({ err }, 'api/optimizer POST: unhandled error');
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
