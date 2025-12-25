import Redis from 'ioredis';
import type { IPBlocklist } from './types';

export class IPFilteringService {
  private readonly redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async blockIP(ip: string, reason: string, expiresAt?: Date, source: IPBlocklist['source'] = 'manual'): Promise<void> {
    const blocklist: IPBlocklist = {
      ip,
      reason,
      blockedAt: new Date(),
      expiresAt,
      source,
    };

    await this.redis.setex(
      `blocklist:${ip}`,
      expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 1000) : 86400 * 365,
      JSON.stringify(blocklist)
    );
  }

  async unblockIP(ip: string): Promise<void> {
    await this.redis.del(`blocklist:${ip}`);
  }

  async isBlocked(ip: string): Promise<boolean> {
    const exists = await this.redis.exists(`blocklist:${ip}`);
    return exists === 1;
  }

  async getBlocklistInfo(ip: string): Promise<IPBlocklist | null> {
    const data = await this.redis.get(`blocklist:${ip}`);
    if (!data) return null;

    const blocklist = JSON.parse(data) as IPBlocklist;
    
    if (blocklist.expiresAt && new Date() > blocklist.expiresAt) {
      await this.unblockIP(ip);
      return null;
    }

    return blocklist;
  }

  async cleanupExpired(): Promise<void> {
    const keys = await this.redis.keys('blocklist:*');
    
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const blocklist = JSON.parse(data) as IPBlocklist;
        if (blocklist.expiresAt && new Date() > blocklist.expiresAt) {
          await this.redis.del(key);
        }
      }
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
