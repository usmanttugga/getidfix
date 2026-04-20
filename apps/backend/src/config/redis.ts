import Redis from 'ioredis';
import { logger } from './logger';

// ─── Redis Client Singleton ───────────────────────────────────────────────────

let redisClient: Redis | null = null;

/**
 * Returns the Redis client singleton.
 * Creates the client on first call with connection error handling and
 * automatic reconnection logic.
 */
export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = new Redis(redisUrl, {
    // Reconnection strategy: exponential backoff capped at 30 seconds
    retryStrategy(times: number): number | null {
      if (times > 10) {
        logger.error('[Redis] Max reconnection attempts reached. Giving up.');
        return null; // Stop retrying
      }
      const delay = Math.min(times * 200, 30_000);
      logger.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${times})...`);
      return delay;
    },

    // Connection options
    connectTimeout: 10_000,
    commandTimeout: 5_000,
    keepAlive: 30_000,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,

    // Lazy connect — don't throw on startup if Redis is unavailable
    lazyConnect: false,
  });

  // ── Event Handlers ──────────────────────────────────────────────────────────

  redisClient.on('connect', () => {
    logger.info('[Redis] Connecting to Redis...');
  });

  redisClient.on('ready', () => {
    logger.info('[Redis] Connection established and ready.');
  });

  redisClient.on('error', (err: Error) => {
    logger.error('[Redis] Connection error', {
      message: err.message,
      name: err.name,
    });
  });

  redisClient.on('close', () => {
    logger.warn('[Redis] Connection closed.');
  });

  redisClient.on('reconnecting', () => {
    logger.warn('[Redis] Attempting to reconnect...');
  });

  redisClient.on('end', () => {
    logger.warn('[Redis] Connection ended. No more reconnection attempts.');
  });

  return redisClient;
}

/**
 * Gracefully closes the Redis connection.
 * Should be called on application shutdown.
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('[Redis] Connection closed gracefully.');
  }
}

/**
 * Checks if Redis is reachable by sending a PING command.
 * Returns true if Redis responds with PONG, false otherwise.
 */
export async function pingRedis(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const response = await client.ping();
    return response === 'PONG';
  } catch (err) {
    logger.error('[Redis] Health check failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export default getRedisClient;
