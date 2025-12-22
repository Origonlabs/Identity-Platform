/**
 * Enterprise-grade distributed rate limiting middleware
 * Uses Redis for cross-instance rate limiting
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { NextRequest, NextResponse } from 'next/server';
import { getEnvVariable, getNodeEnvironment } from '@opendex/stack-shared/dist/utils/env';

// Rate limit tiers
export enum RateLimitTier {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
  ADMIN = 'admin',
}

// Rate limit configurations per tier
const RATE_LIMITS: Record<RateLimitTier, { requests: number, windowMs: number }> = {
  [RateLimitTier.FREE]: { requests: 100, windowMs: 3600000 },      // 100 requests/hour
  [RateLimitTier.PRO]: { requests: 1000, windowMs: 3600000 },      // 1000 requests/hour
  [RateLimitTier.ENTERPRISE]: { requests: 10000, windowMs: 3600000 }, // 10k requests/hour
  [RateLimitTier.ADMIN]: { requests: 100000, windowMs: 3600000 },  // 100k requests/hour
};

// Special endpoint limits (more restrictive for sensitive operations)
const ENDPOINT_LIMITS: Record<string, { requests: number, windowMs: number }> = {
  '/api/auth/signin': { requests: 5, windowMs: 900000 },        // 5 login attempts per 15 min
  '/api/auth/signup': { requests: 3, windowMs: 3600000 },         // 3 signups per hour
  '/api/auth/reset-password': { requests: 3, windowMs: 3600000 }, // 3 password resets per hour
  '/api/auth/verify-email': { requests: 5, windowMs: 3600000 },   // 5 verifications per hour
  '/api/payment': { requests: 10, windowMs: 3600000 },            // 10 payment requests per hour
};

export class RateLimiter {
  private redis: Redis;
  private limiters: Map<string, Ratelimit>;

  constructor() {
    const upstashRedisUrl = getEnvVariable('UPSTASH_REDIS_REST_URL', '');
    const redisUrl = getEnvVariable('REDIS_URL', '');

    // Initialize Redis connection
    this.redis = new Redis({
      url: upstashRedisUrl || redisUrl,
      token: getEnvVariable('UPSTASH_REDIS_REST_TOKEN', ''),
    });

    this.limiters = new Map();
    this.initializeLimiters();
  }

  private initializeLimiters() {
    // Create rate limiters for each tier
    for (const [tier, config] of Object.entries(RATE_LIMITS)) {
      this.limiters.set(tier, new Ratelimit({
        redis: this.redis,
        limiter: Ratelimit.slidingWindow(config.requests, `${config.windowMs} ms`),
        analytics: true,
        prefix: `@ratelimit:tier:${tier}`,
      }));
    }

    // Create rate limiters for specific endpoints
    for (const [endpoint, config] of Object.entries(ENDPOINT_LIMITS)) {
      this.limiters.set(endpoint, new Ratelimit({
        redis: this.redis,
        limiter: Ratelimit.slidingWindow(config.requests, `${config.windowMs} ms`),
        analytics: true,
        prefix: `@ratelimit:endpoint:${endpoint.replace(/\//g, ':')}`,
      }));
    }

    // Global IP-based rate limiter (DDoS protection)
    this.limiters.set('global-ip', new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(500, '3600000 ms'), // 500 requests per hour per IP
      analytics: true,
      prefix: '@ratelimit:global:ip',
    }));
  }

  /**
   * Get client identifier from request
   */
  private getClientIdentifier(req: NextRequest): string {
    // Priority: User ID > API Key > IP Address
    const userId = req.headers.get('x-user-id');
    if (userId) return `user:${userId}`;

    const apiKey = req.headers.get('x-api-key');
    if (apiKey) return `api:${apiKey}`;

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
              || req.headers.get('x-real-ip')
              || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Get rate limit tier for the request
   */
  private getRateLimitTier(req: NextRequest): RateLimitTier {
    const tier = req.headers.get('x-rate-limit-tier');
    if (tier && Object.values(RateLimitTier).includes(tier as RateLimitTier)) {
      return tier as RateLimitTier;
    }

    // Default to FREE tier
    return RateLimitTier.FREE;
  }

  /**
   * Check if request should be rate limited
   */
  async checkRateLimit(req: NextRequest): Promise<{
    success: boolean,
    limit: number,
    remaining: number,
    reset: number,
    reason?: string,
  }> {
    const identifier = this.getClientIdentifier(req);
    const pathname = new URL(req.url).pathname;

    // 1. Check endpoint-specific limits first
    const endpointLimiter = this.limiters.get(pathname);
    if (endpointLimiter) {
      const endpointResult = await endpointLimiter.limit(identifier);
      if (!endpointResult.success) {
        return {
          success: false,
          limit: endpointResult.limit,
          remaining: endpointResult.remaining,
          reset: endpointResult.reset,
          reason: `Endpoint rate limit exceeded for ${pathname}`,
        };
      }
    }

    // 2. Check tier-based limits
    const tier = this.getRateLimitTier(req);
    const tierLimiter = this.limiters.get(tier);
    if (tierLimiter) {
      const tierResult = await tierLimiter.limit(identifier);
      if (!tierResult.success) {
        return {
          success: false,
          limit: tierResult.limit,
          remaining: tierResult.remaining,
          reset: tierResult.reset,
          reason: `Tier rate limit exceeded for ${tier}`,
        };
      }
    }

    // 3. Check global IP-based limits (DDoS protection)
    const ipLimiter = this.limiters.get('global-ip');
    if (ipLimiter && identifier.startsWith('ip:')) {
      const ipResult = await ipLimiter.limit(identifier);
      if (!ipResult.success) {
        return {
          success: false,
          limit: ipResult.limit,
          remaining: ipResult.remaining,
          reset: ipResult.reset,
          reason: 'Global IP rate limit exceeded',
        };
      }

      return {
        success: true,
        limit: ipResult.limit,
        remaining: ipResult.remaining,
        reset: ipResult.reset,
      };
    }

    // All checks passed
    const tierLimiterForHeaders = this.limiters.get(tier);
    const result = tierLimiterForHeaders
      ? await tierLimiterForHeaders.limit(identifier)
      : { success: true, limit: 0, remaining: 0, reset: 0 };

    return {
      success: true,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getRateLimitStatus(identifier: string, tier: RateLimitTier): Promise<{
    limit: number,
    remaining: number,
    reset: number,
  }> {
    const limiter = this.limiters.get(tier);
    if (!limiter) {
      return { limit: 0, remaining: 0, reset: 0 };
    }

    // Use Redis MULTI to get info without incrementing
    const key = `@ratelimit:tier:${tier}:${identifier}`;
    const ttl = await this.redis.ttl(key);
    const count = await this.redis.get<number>(key) || 0;
    const config = RATE_LIMITS[tier];

    return {
      limit: config.requests,
      remaining: Math.max(0, config.requests - count),
      reset: Date.now() + (ttl > 0 ? ttl * 1000 : 0),
    };
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async resetRateLimit(identifier: string, tier: RateLimitTier): Promise<void> {
    const key = `@ratelimit:tier:${tier}:${identifier}`;
    await this.redis.del(key);
  }

  /**
   * Get analytics for rate limiting
   */
  async getAnalytics(period: '1h' | '24h' | '7d' = '24h'): Promise<{
    totalRequests: number,
    blockedRequests: number,
    topBlockedIPs: Array<{ ip: string, count: number }>,
    topBlockedEndpoints: Array<{ endpoint: string, count: number }>,
  }> {
    // This would integrate with your analytics system (PostHog, etc.)
    // For now, return a placeholder
    return {
      totalRequests: 0,
      blockedRequests: 0,
      topBlockedIPs: [],
      topBlockedEndpoints: [],
    };
  }
}

// Singleton instance
let rateLimiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiter) {
    rateLimiter = new RateLimiter();
  }
  return rateLimiter;
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export async function rateLimitMiddleware(req: NextRequest): Promise<NextResponse | null> {
  // Skip rate limiting in development
  if (getNodeEnvironment() === 'development' && getEnvVariable('SKIP_RATE_LIMIT', '') === 'true') {
    return null;
  }

  const limiter = getRateLimiter();
  const result = await limiter.checkRateLimit(req);

  // Add rate limit headers to all responses
  const headers = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.reset).toISOString(),
  };

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: result.reason || 'Too many requests',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          ...headers,
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Reason': result.reason || 'Unknown',
        },
      }
    );
  }

  return null;
}
