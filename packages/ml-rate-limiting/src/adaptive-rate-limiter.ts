import { RateLimiter } from '@opendex/rate-limiting';
import { TrafficAnalyzer } from './traffic-analyzer';
import type { AdaptiveLimit } from './types';

export class AdaptiveRateLimiter {
  private readonly baseLimiter: RateLimiter;
  private readonly analyzer: TrafficAnalyzer;

  constructor(redisUrl?: string) {
    this.baseLimiter = new RateLimiter(redisUrl);
    this.analyzer = new TrafficAnalyzer(redisUrl);
  }

  async checkLimit(
    identifier: string,
    baseConfig: { limit: number; window: number; strategy?: 'sliding' | 'fixed' }
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date; retryAfter?: number }> {
    const adaptiveLimit = await this.analyzer.getAdaptiveLimit(identifier);
    const effectiveLimit = adaptiveLimit?.currentLimit || baseConfig.limit;

    const pattern = await this.analyzer.analyzePattern(identifier, baseConfig.window);
    const optimalLimit = await this.analyzer.calculateOptimalLimit(pattern);

    if (Math.abs(optimalLimit - effectiveLimit) > effectiveLimit * 0.2) {
      await this.updateAdaptiveLimit(identifier, optimalLimit, effectiveLimit);
    }

    const result = await this.baseLimiter.checkLimit(identifier, {
      ...baseConfig,
      limit: effectiveLimit,
    });

    return result;
  }

  async recordRequest(
    identifier: string,
    endpoint: string,
    responseTime: number,
    status: number
  ): Promise<void> {
    await this.analyzer.recordRequest(identifier, endpoint, responseTime, status);
  }

  private async updateAdaptiveLimit(
    identifier: string,
    newLimit: number,
    oldLimit: number
  ): Promise<void> {
    const adjustmentFactor = newLimit / oldLimit;
    const reason = adjustmentFactor > 1
      ? 'traffic_healthy'
      : 'high_error_rate_or_latency';

    const limit: AdaptiveLimit = {
      identifier,
      baseLimit: oldLimit,
      currentLimit: newLimit,
      adjustmentFactor,
      reason,
      lastUpdated: new Date(),
    };

    await this.analyzer.setAdaptiveLimit(limit);
  }

  async close(): Promise<void> {
    await this.analyzer.close();
  }
}
