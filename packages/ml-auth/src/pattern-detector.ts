import Redis from 'ioredis';
import type { BehavioralPattern } from './types';

export class PatternDetector {
  private readonly redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async detectAnomaly(
    currentBehavior: Partial<BehavioralPattern>,
    userId: string
  ): Promise<{ isAnomaly: boolean; score: number; reasons: string[] }> {
    const baseline = await this.getBaseline(userId);
    if (!baseline) {
      await this.establishBaseline(userId, currentBehavior as BehavioralPattern);
      return { isAnomaly: false, score: 0, reasons: [] };
    }

    const scores: number[] = [];
    const reasons: string[] = [];

    if (currentBehavior.loginTimes && baseline.loginTimes.length > 0) {
      const timeScore = this.compareTimePatterns(currentBehavior.loginTimes, baseline.loginTimes);
      scores.push(timeScore);
      if (timeScore > 0.7) reasons.push('unusual_login_time');
    }

    if (currentBehavior.locations && baseline.locations.length > 0) {
      const locationScore = this.compareLocations(currentBehavior.locations, baseline.locations);
      scores.push(locationScore);
      if (locationScore > 0.7) reasons.push('unusual_location');
    }

    if (currentBehavior.devices && baseline.devices.length > 0) {
      const deviceScore = this.compareDevices(currentBehavior.devices, baseline.devices);
      scores.push(deviceScore);
      if (deviceScore > 0.7) reasons.push('unusual_device');
    }

    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    return {
      isAnomaly: avgScore > 0.6,
      score: avgScore,
      reasons,
    };
  }

  async establishBaseline(userId: string, behavior: BehavioralPattern): Promise<void> {
    await this.redis.setex(
      `pattern:baseline:${userId}`,
      86400 * 90,
      JSON.stringify(behavior)
    );
  }

  async updateBaseline(userId: string, newData: Partial<BehavioralPattern>): Promise<void> {
    const baseline = await this.getBaseline(userId);
    if (!baseline) {
      await this.establishBaseline(userId, newData as BehavioralPattern);
      return;
    }

    const updated: BehavioralPattern = {
      ...baseline,
      ...newData,
      loginTimes: [...(baseline.loginTimes || []), ...(newData.loginTimes || [])].slice(-100),
      locations: [...new Set([...(baseline.locations || []), ...(newData.locations || [])])],
      devices: [...new Set([...(baseline.devices || []), ...(newData.devices || [])])],
    };

    await this.redis.setex(
      `pattern:baseline:${userId}`,
      86400 * 90,
      JSON.stringify(updated)
    );
  }

  private async getBaseline(userId: string): Promise<BehavioralPattern | null> {
    const data = await this.redis.get(`pattern:baseline:${userId}`);
    if (!data) return null;
    return JSON.parse(data) as BehavioralPattern;
  }

  private compareTimePatterns(current: number[], baseline: number[]): number {
    if (baseline.length === 0) return 0;

    const baselineAvg = baseline.reduce((a, b) => a + b, 0) / baseline.length;
    const currentAvg = current.reduce((a, b) => a + b, 0) / current.length;

    const diff = Math.abs(currentAvg - baselineAvg);
    const maxDiff = 12 * 3600000;

    return Math.min(1, diff / maxDiff);
  }

  private compareLocations(current: string[], baseline: string[]): number {
    if (baseline.length === 0) return 0;

    const baselineSet = new Set(baseline);
    const newLocations = current.filter(loc => !baselineSet.has(loc));

    return Math.min(1, newLocations.length / baseline.length);
  }

  private compareDevices(current: string[], baseline: string[]): number {
    if (baseline.length === 0) return 0;

    const baselineSet = new Set(baseline);
    const newDevices = current.filter(dev => !baselineSet.has(dev));

    return Math.min(1, newDevices.length / baseline.length);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
