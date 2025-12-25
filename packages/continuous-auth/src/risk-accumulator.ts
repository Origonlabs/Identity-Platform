import Redis from 'ioredis';

export class RiskAccumulator {
  private readonly redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async getSessionRisk(sessionId: string): Promise<number> {
    const data = await this.redis.get(`session:${sessionId}:risk`);
    return data ? parseFloat(data) : 0.0;
  }

  async updateSessionRisk(sessionId: string, riskScore: number): Promise<void> {
    const current = await this.getSessionRisk(sessionId);
    const accumulated = this.accumulateRisk(current, riskScore);

    await this.redis.setex(
      `session:${sessionId}:risk`,
      86400,
      accumulated.toString()
    );
  }

  async incrementRisk(sessionId: string, increment: number): Promise<void> {
    const current = await this.getSessionRisk(sessionId);
    await this.updateSessionRisk(sessionId, current + increment);
  }

  async resetSessionRisk(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}:risk`);
  }

  private accumulateRisk(current: number, newRisk: number): number {
    const decayFactor = 0.9;
    const weightedCurrent = current * decayFactor;
    const weightedNew = newRisk * (1 - decayFactor);
    return Math.min(1.0, weightedCurrent + weightedNew);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
