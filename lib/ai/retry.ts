import { logger } from '@/lib/logger';
import { AI_MAX_RETRIES, AI_RETRY_BASE_DELAY_MS } from '@/lib/constants';

export async function withRetry<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T | null> {
  let lastError: unknown;

  for (let attempt = 0; attempt < AI_MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = AI_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      logger.warn(
        { context, attempt: attempt + 1, maxRetries: AI_MAX_RETRIES, err },
        'ai: retrying after error'
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  logger.error({ context, err: lastError }, 'ai: all retries exhausted');
  return null;
}
