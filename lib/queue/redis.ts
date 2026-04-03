import { Redis } from 'ioredis';
import { logger } from '@/lib/logger';

function createRedis(): Redis {
  const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck:     false,
  });

  redis.on('error', (err: Error) => {
    logger.error({ err }, 'redis: connection error');
  });

  redis.on('connect', () => {
    logger.info('redis: connected');
  });

  return redis;
}

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

export const redis: Redis = globalThis.__redis ?? createRedis();

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__redis = redis;
}
