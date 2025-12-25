import Redis from 'ioredis';
import type { ContinuousAuthContext } from './types';

export class SessionMonitor {
  private readonly redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async recordActivity(context: ContinuousAuthContext): Promise<void> {
    const key = `session:${context.sessionId}:activities`;
    const activity = {
      timestamp: context.timestamp.toISOString(),
      action: context.action,
      ip: context.networkData?.ip,
      location: context.networkData?.location,
    };

    await this.redis.lpush(key, JSON.stringify(activity));
    await this.redis.ltrim(key, 0, 999);
    await this.redis.expire(key, 86400 * 7);
  }

  async getActivityHistory(sessionId: string, limit: number = 100): Promise<any[]> {
    const key = `session:${sessionId}:activities`;
    const activities = await this.redis.lrange(key, 0, limit - 1);
    return activities.map((a) => JSON.parse(a));
  }

  async getSessionStats(sessionId: string): Promise<{
    activityCount: number;
    uniqueIPs: number;
    firstActivity: Date | null;
    lastActivity: Date | null;
  }> {
    const activities = await this.getActivityHistory(sessionId, 1000);
    
    if (activities.length === 0) {
      return {
        activityCount: 0,
        uniqueIPs: 0,
        firstActivity: null,
        lastActivity: null,
      };
    }

    const ips = new Set(activities.map((a) => a.ip).filter(Boolean));
    const timestamps = activities.map((a) => new Date(a.timestamp)).sort((a, b) => a.getTime() - b.getTime());

    return {
      activityCount: activities.length,
      uniqueIPs: ips.size,
      firstActivity: timestamps[0],
      lastActivity: timestamps[timestamps.length - 1],
    };
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
