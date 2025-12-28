export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining: number;
  resetAt: Date;
}

export interface RateLimitOptions {
  limit: number;
  window: number;
  strategy?: 'fixed' | 'sliding';
}

export class RateLimiter {
  constructor(redisUrl?: string);
  checkLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

export function createRateLimiter(redisUrl?: string): RateLimiter;
