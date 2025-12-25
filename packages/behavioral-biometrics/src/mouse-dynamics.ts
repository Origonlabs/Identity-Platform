import Redis from 'ioredis';
import type { MousePattern } from './types';

export class MouseDynamicsAnalyzer {
  private readonly redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async recordMouseEvent(
    userId: string,
    type: 'move' | 'click' | 'scroll',
    data: {
      speed?: number;
      duration?: number;
      acceleration?: number;
      distance?: number;
    }
  ): Promise<void> {
    const key = `mouse:${userId}`;
    const event = {
      type,
      ...data,
      timestamp: Date.now(),
    };

    await this.redis.lpush(key, JSON.stringify(event));
    await this.redis.ltrim(key, 0, 999);
    await this.redis.expire(key, 86400 * 30);
  }

  async buildPattern(userId: string): Promise<MousePattern> {
    const data = await this.redis.lrange(`mouse:${userId}`, 0, -1);
    const events = data.map((d) => JSON.parse(d));

    const movementSpeed: number[] = [];
    const clickDuration: number[] = [];
    const movementAcceleration: number[] = [];
    const scrollPattern: number[] = [];
    const clickPattern: number[] = [];

    for (const event of events) {
      switch (event.type) {
        case 'move':
          if (event.speed !== undefined) movementSpeed.push(event.speed);
          if (event.acceleration !== undefined) movementAcceleration.push(event.acceleration);
          break;
        case 'click':
          if (event.duration !== undefined) {
            clickDuration.push(event.duration);
            clickPattern.push(event.duration);
          }
          break;
        case 'scroll':
          if (event.distance !== undefined) scrollPattern.push(event.distance);
          break;
      }
    }

    return {
      userId,
      movementSpeed,
      clickDuration,
      movementAcceleration,
      scrollPattern,
      clickPattern,
    };
  }

  async verify(
    userId: string,
    currentPattern: Partial<MousePattern>
  ): Promise<{ match: boolean; confidence: number }> {
    const baseline = await this.buildPattern(userId);
    if (!baseline || baseline.movementSpeed.length < 5) {
      return { match: false, confidence: 0 };
    }

    let matches = 0;
    let total = 0;

    if (currentPattern.movementSpeed) {
      const baselineAvg =
        baseline.movementSpeed.reduce((a, b) => a + b, 0) / baseline.movementSpeed.length;
      for (const speed of currentPattern.movementSpeed) {
        const diff = Math.abs(speed - baselineAvg);
        const threshold = baselineAvg * 0.4;
        if (diff <= threshold) matches++;
        total++;
      }
    }

    const confidence = total > 0 ? matches / total : 0;

    return {
      match: confidence >= 0.65,
      confidence,
    };
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
