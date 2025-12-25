import Redis from 'ioredis';
import type { TypingPattern } from './types';

export class TypingPatternAnalyzer {
  private readonly redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async recordTyping(
    userId: string,
    text: string,
    timestamps: number[],
    errors: string[]
  ): Promise<void> {
    const key = `typing:${userId}`;
    const data = {
      text,
      timestamps,
      errors,
      timestamp: Date.now(),
    };

    await this.redis.lpush(key, JSON.stringify(data));
    await this.redis.ltrim(key, 0, 99);
    await this.redis.expire(key, 86400 * 30);
  }

  async buildPattern(userId: string): Promise<TypingPattern> {
    const data = await this.redis.lrange(`typing:${userId}`, 0, -1);
    const sessions = data.map((d) => JSON.parse(d));

    const wordsPerMinute: number[] = [];
    const averageWordLength: number[] = [];
    const commonErrors: string[] = [];
    const correctionPattern: number[] = [];
    const rhythm: number[] = [];

    for (const session of sessions) {
      if (session.timestamps.length < 2) continue;

      const duration = (session.timestamps[session.timestamps.length - 1] - session.timestamps[0]) / 1000 / 60;
      const wordCount = session.text.split(/\s+/).length;
      const wpm = duration > 0 ? wordCount / duration : 0;
      wordsPerMinute.push(wpm);

      const words = session.text.split(/\s+/);
      const avgLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
      averageWordLength.push(avgLength);

      commonErrors.push(...session.errors);

      for (let i = 1; i < session.timestamps.length; i++) {
        const interval = session.timestamps[i] - session.timestamps[i - 1];
        rhythm.push(interval);
      }
    }

    return {
      userId,
      wordsPerMinute: wordsPerMinute.length > 0
        ? wordsPerMinute.reduce((a, b) => a + b, 0) / wordsPerMinute.length
        : 0,
      averageWordLength: averageWordLength.length > 0
        ? averageWordLength.reduce((a, b) => a + b, 0) / averageWordLength.length
        : 0,
      commonErrors: [...new Set(commonErrors)],
      correctionPattern: correctionPattern,
      rhythm: rhythm,
    };
  }

  async verify(
    userId: string,
    currentPattern: Partial<TypingPattern>
  ): Promise<{ match: boolean; confidence: number }> {
    const baseline = await this.buildPattern(userId);
    if (!baseline || baseline.wordsPerMinute === 0) {
      return { match: false, confidence: 0 };
    }

    let matches = 0;
    let total = 0;

    if (currentPattern.wordsPerMinute !== undefined) {
      const diff = Math.abs(currentPattern.wordsPerMinute - baseline.wordsPerMinute);
      const threshold = baseline.wordsPerMinute * 0.3;
      if (diff <= threshold) matches++;
      total++;
    }

    if (currentPattern.rhythm && baseline.rhythm.length > 0) {
      const baselineAvg = baseline.rhythm.reduce((a, b) => a + b, 0) / baseline.rhythm.length;
      const currentAvg = currentPattern.rhythm.reduce((a, b) => a + b, 0) / currentPattern.rhythm.length;
      const diff = Math.abs(currentAvg - baselineAvg);
      const threshold = baselineAvg * 0.4;
      if (diff <= threshold) matches++;
      total++;
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
