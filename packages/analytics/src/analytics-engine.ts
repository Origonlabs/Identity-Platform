import Redis from 'ioredis';
import type { AnalyticsEvent, AnalyticsMetric } from './types';

export class AnalyticsEngine {
  private readonly redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async track(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    const analyticsEvent: AnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      timestamp: new Date(),
      ...event,
    };

    const key = `analytics:${analyticsEvent.timestamp.toISOString().split('T')[0]}`;
    await this.redis.lpush(key, JSON.stringify(analyticsEvent));
    await this.redis.expire(key, 86400 * 90);

    await this.updateMetrics(analyticsEvent);
  }

  async getMetrics(
    metricName: string,
    startDate: Date,
    endDate: Date,
    dimensions?: Record<string, string>
  ): Promise<AnalyticsMetric[]> {
    const key = `metrics:${metricName}`;
    const metrics = await this.redis.zrangebyscore(
      key,
      startDate.getTime(),
      endDate.getTime()
    );

    return metrics
      .map((m) => JSON.parse(m) as AnalyticsMetric)
      .filter((m) => {
        if (!dimensions) return true;
        for (const [key, value] of Object.entries(dimensions)) {
          if (m.dimensions[key] !== value) return false;
        }
        return true;
      });
  }

  async aggregate(
    metricName: string,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count',
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const metrics = await this.getMetrics(metricName, startDate, endDate);

    if (metrics.length === 0) return 0;

    switch (aggregation) {
      case 'sum':
        return metrics.reduce((sum, m) => sum + m.value, 0);
      case 'avg':
        return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
      case 'min':
        return Math.min(...metrics.map((m) => m.value));
      case 'max':
        return Math.max(...metrics.map((m) => m.value));
      case 'count':
        return metrics.length;
    }
  }

  private async updateMetrics(event: AnalyticsEvent): Promise<void> {
    const timestamp = event.timestamp.getTime();

    const metric: AnalyticsMetric = {
      name: `events.${event.type}`,
      value: 1,
      timestamp: event.timestamp,
      dimensions: {
        type: event.type,
        ...(event.userId ? { userId: event.userId } : {}),
      },
    };

    await this.redis.zadd(`metrics:${metric.name}`, timestamp, JSON.stringify(metric));
    await this.redis.expire(`metrics:${metric.name}`, 86400 * 90);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
