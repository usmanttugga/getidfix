/**
 * Redis key namespace constants for the GETIDFIX platform.
 *
 * All keys are namespaced to avoid collisions and to make it easy to
 * identify the purpose of each key in Redis monitoring tools.
 */
export const REDIS_KEYS = {
  /**
   * Stores the refresh token for a user session.
   * TTL: 7 days
   * Value: opaque UUID refresh token string
   */
  REFRESH_TOKEN: (userId: string): string => `refresh:${userId}`,

  /**
   * Blocklist for revoked access tokens (logged-out sessions).
   * TTL: matches the access token's remaining natural expiry
   * Value: '1' (presence indicates the token is revoked)
   */
  ACCESS_BLOCKLIST: (jti: string): string => `blocklist:${jti}`,

  /**
   * Idempotency key for wallet funding operations.
   * Prevents duplicate credits from Paystack webhook retries.
   * TTL: 24 hours
   * Value: transaction ID or 'processed'
   */
  WALLET_IDEMPOTENCY: (reference: string): string =>
    `idempotency:wallet:${reference}`,

  /**
   * Rate limiting key per IP address.
   * Used by express-rate-limit with Redis store.
   * TTL: 15 minutes (sliding window)
   * Value: request count
   */
  RATE_LIMIT: (ip: string): string => `ratelimit:${ip}`,

  /**
   * Stores the last activity timestamp for idle session detection.
   * TTL: 30 minutes
   * Value: ISO timestamp string
   */
  SESSION_ACTIVITY: (userId: string): string => `session:activity:${userId}`,

  /**
   * Caches service configuration to reduce DB reads.
   * TTL: 5 minutes
   * Value: JSON-serialized service array
   */
  SERVICES_CACHE: (): string => `cache:services`,

  /**
   * Tracks failed login attempts per email for account lockout.
   * TTL: 15 minutes
   * Value: integer count
   */
  LOGIN_ATTEMPTS: (email: string): string => `login:attempts:${email}`,
} as const;
