export interface RateLimitOptions {
  limit: number;
  window: number;
  strategy?: 'fixed' | 'sliding';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}
