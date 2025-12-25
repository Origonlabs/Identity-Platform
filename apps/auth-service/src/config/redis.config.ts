import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),

  // Connection options
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },

  // Cache TTLs (in seconds)
  ttl: {
    session: parseInt(process.env.REDIS_SESSION_TTL || '3600', 10), // 1 hour
    oauthState: parseInt(process.env.REDIS_OAUTH_STATE_TTL || '600', 10), // 10 minutes
    rateLimit: parseInt(process.env.REDIS_RATE_LIMIT_TTL || '60', 10), // 1 minute
  },
}));
