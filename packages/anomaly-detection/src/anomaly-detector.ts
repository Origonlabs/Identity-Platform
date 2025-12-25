import Redis from 'ioredis';
import type { AnomalyEvent, DetectionResult, AnomalyPattern } from './types';
import { StatisticalAnomalyDetector } from './statistical-detector';
import { MLAnomalyDetector } from './ml-detector';

export class AnomalyDetector {
  private readonly redis: Redis;
  private readonly statisticalDetector: StatisticalAnomalyDetector;
  private readonly mlDetector: MLAnomalyDetector;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.statisticalDetector = new StatisticalAnomalyDetector();
    this.mlDetector = new MLAnomalyDetector();
  }

  async detect(event: AnomalyEvent): Promise<DetectionResult> {
    const historicalData = await this.getHistoricalData(event);
    
    const [statisticalResult, mlResult] = await Promise.all([
      this.statisticalDetector.detectAnomaly(event, historicalData),
      this.mlDetector.detectAnomaly(event, historicalData),
    ]);

    const combinedScore = (statisticalResult.score * 0.4 + mlResult.score * 0.6);
    const isAnomaly = combinedScore >= 0.5;
    const confidence = Math.max(statisticalResult.confidence, mlResult.confidence);
    const reasons = [...statisticalResult.reasons, ...mlResult.reasons];
    
    const recommendedAction = this.getRecommendedAction(combinedScore);

    await this.storeEvent(event, combinedScore);

    return {
      isAnomaly,
      confidence,
      score: combinedScore,
      reasons: [...new Set(reasons)],
      recommendedAction,
    };
  }

  async getAnomalyHistory(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AnomalyEvent[]> {
    const key = userId ? `anomalies:user:${userId}` : 'anomalies:all';
    const events = await this.redis.zrange(key, 0, -1);
    
    return events
      .map((e) => JSON.parse(e) as AnomalyEvent)
      .filter((e) => {
        if (startDate && e.timestamp < startDate) return false;
        if (endDate && e.timestamp > endDate) return false;
        return true;
      });
  }

  async getAnomalyStats(): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const allEvents = await this.redis.zrange('anomalies:all', 0, -1);
    const events = allEvents.map((e) => JSON.parse(e) as AnomalyEvent);

    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const event of events) {
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
      byType[event.type] = (byType[event.type] || 0) + 1;
    }

    return {
      total: events.length,
      bySeverity,
      byType,
    };
  }

  private async getHistoricalData(event: AnomalyEvent): Promise<AnomalyEvent[]> {
    const key = event.userId
      ? `events:user:${event.userId}`
      : `events:ip:${event.ip}`;
    
    const events = await this.redis.zrange(key, -100, -1);
    return events.map((e) => JSON.parse(e) as AnomalyEvent);
  }

  private async storeEvent(event: AnomalyEvent, score: number): Promise<void> {
    const timestamp = event.timestamp.getTime();
    const eventData = JSON.stringify({ ...event, score });

    const pipeline = this.redis.pipeline();
    
    pipeline.zadd('anomalies:all', timestamp, eventData);
    if (event.userId) {
      pipeline.zadd(`anomalies:user:${event.userId}`, timestamp, eventData);
    }
    pipeline.zadd(`events:ip:${event.ip}`, timestamp, JSON.stringify(event));
    if (event.userId) {
      pipeline.zadd(`events:user:${event.userId}`, timestamp, JSON.stringify(event));
    }

    pipeline.zremrangebyrank('anomalies:all', 0, -10001);
    if (event.userId) {
      pipeline.zremrangebyrank(`anomalies:user:${event.userId}`, 0, -1000);
    }

    await pipeline.exec();
  }

  private getRecommendedAction(score: number): DetectionResult['recommendedAction'] {
    if (score >= 0.8) return 'block';
    if (score >= 0.6) return 'alert';
    if (score >= 0.4) return 'investigate';
    return 'monitor';
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
