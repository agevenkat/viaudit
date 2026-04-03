import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';

const registerSchema = z.object({
  name:     z.string().min(1, 'Name is required').max(100),
  email:    z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      logger.error('register: failed to parse JSON body');
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    logger.info({ bodyKeys: body ? Object.keys(body as Record<string, unknown>) : 'null' }, 'register: received');

    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      // Build a human-readable message from field errors
      const messages = Object.entries(fieldErrors)
        .map(([field, errs]) => `${field}: ${(errs ?? []).join(', ')}`)
        .join('; ');
      logger.warn({ fieldErrors }, 'register: validation failed');
      return NextResponse.json(
        { error: messages || 'Invalid input', issues: fieldErrors },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, email: true, name: true },
    });

    logger.info({ userId: user.id }, 'register: new user');

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, message }, 'register: unhandled error');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
