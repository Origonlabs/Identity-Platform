import Redis from 'ioredis';
import type { KeystrokePattern } from './types';

export class KeystrokeDynamicsAnalyzer {
  private readonly redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async recordKeystroke(
    userId: string,
    key: string,
    pressDuration: number,
    interval: number
  ): Promise<void> {
    const key = `keystroke:${userId}`;
    const data = {
      key,
      pressDuration,
      interval,
      timestamp: Date.now(),
    };

    await this.redis.lpush(key, JSON.stringify(data));
    await this.redis.ltrim(key, 0, 999);
    await this.redis.expire(key, 86400 * 30);
  }

  async buildPattern(userId: string): Promise<KeystrokePattern> {
    const data = await this.redis.lrange(`keystroke:${userId}`, 0, -1);
    const keystrokes = data.map((d) => JSON.parse(d));

    const pressDurations: number[] = [];
    const intervals: number[] = [];
    const digraphLatency = new Map<string, number>();
    const flightTime: number[] = [];
    const holdTime: number[] = [];

    for (let i = 0; i < keystrokes.length; i++) {
      const current = keystrokes[i];
      pressDurations.push(current.pressDuration);
      holdTime.push(current.pressDuration);

      if (i > 0) {
        const prev = keystrokes[i - 1];
        const interval = current.timestamp - prev.timestamp;
        intervals.push(interval);
        flightTime.push(interval - prev.pressDuration);

        const digraph = `${prev.key}${current.key}`;
        if (!digraphLatency.has(digraph)) {
          digraphLatency.set(digraph, interval);
        } else {
          const avg = (digraphLatency.get(digraph)! + interval) / 2;
          digraphLatency.set(digraph, avg);
        }
      }
    }

    return {
      userId,
      keyPressDuration: pressDurations,
      keyInterval: intervals,
      digraphLatency,
      flightTime,
      holdTime,
    };
  }

  async verify(
    userId: string,
    currentPattern: Partial<KeystrokePattern>
  ): Promise<{ match: boolean; confidence: number }> {
    const baseline = await this.buildPattern(userId);
    if (!baseline || baseline.keyPressDuration.length < 10) {
      return { match: false, confidence: 0 };
    }

    let matches = 0;
    let total = 0;

    if (currentPattern.keyPressDuration) {
      for (const duration of currentPattern.keyPressDuration) {
        const baselineAvg =
          baseline.keyPressDuration.reduce((a, b) => a + b, 0) /
          baseline.keyPressDuration.length;
        const diff = Math.abs(duration - baselineAvg);
        const threshold = baselineAvg * 0.3;

        if (diff <= threshold) matches++;
        total++;
      }
    }

    const confidence = total > 0 ? matches / total : 0;

    return {
      match: confidence >= 0.7,
      confidence,
    };
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
