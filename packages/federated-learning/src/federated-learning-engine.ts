import Redis from 'ioredis';
import type { ModelUpdate, AggregatedModel, FederatedLearningConfig } from './types';
import { ModelAggregator } from './model-aggregator';

export class FederatedLearningEngine {
  private readonly redis: Redis;
  private readonly aggregator: ModelAggregator;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.aggregator = new ModelAggregator();
  }

  async submitUpdate(update: ModelUpdate): Promise<void> {
    const round = await this.getCurrentRound();
    const key = `fl:round:${round}:updates`;
    
    await this.redis.lpush(key, JSON.stringify(update));
    await this.redis.expire(key, 86400);
  }

  async aggregateRound(
    round: number,
    config: FederatedLearningConfig
  ): Promise<AggregatedModel | null> {
    const key = `fl:round:${round}:updates`;
    const updates = await this.redis.lrange(key, 0, -1);

    if (updates.length < config.minParticipants) {
      return null;
    }

    const modelUpdates = updates.map((u) => JSON.parse(u) as ModelUpdate);
    const aggregated = await this.aggregator.aggregate(modelUpdates, config.aggregationMethod);

    const model: AggregatedModel = {
      weights: aggregated.weights,
      version: round,
      participantCount: modelUpdates.length,
      aggregatedAt: new Date(),
    };

    await this.saveModel(model);
    await this.setCurrentRound(round + 1);

    return model;
  }

  async getLatestModel(): Promise<AggregatedModel | null> {
    const version = await this.getLatestModelVersion();
    if (!version) return null;

    const data = await this.redis.get(`fl:model:${version}`);
    if (!data) return null;

    return JSON.parse(data) as AggregatedModel;
  }

  private async getCurrentRound(): Promise<number> {
    const round = await this.redis.get('fl:current_round');
    return round ? parseInt(round, 10) : 1;
  }

  private async setCurrentRound(round: number): Promise<void> {
    await this.redis.set('fl:current_round', round.toString());
  }

  private async getLatestModelVersion(): Promise<number | null> {
    const version = await this.redis.get('fl:latest_version');
    return version ? parseInt(version, 10) : null;
  }

  private async saveModel(model: AggregatedModel): Promise<void> {
    await this.redis.setex(
      `fl:model:${model.version}`,
      86400 * 365,
      JSON.stringify(model)
    );
    await this.redis.set('fl:latest_version', model.version.toString());
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
