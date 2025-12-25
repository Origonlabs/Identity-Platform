import Redis from 'ioredis';
import type { ReplicationConfig, RegionalData } from './types';
import { RegionManager } from './region-manager';

export class ReplicationManager {
  private readonly redis: Redis;

  constructor(
    private readonly regionManager: RegionManager,
    redisUrl?: string
  ) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async replicate(
    key: string,
    data: unknown,
    config: ReplicationConfig
  ): Promise<void> {
    const currentRegion = this.regionManager.getCurrentRegion();
    if (!currentRegion) {
      throw new Error('No active region available');
    }

    const regionalData: RegionalData = {
      region: currentRegion.id,
      data,
      timestamp: new Date(),
      version: await this.getNextVersion(key),
    };

    if (config.strategy === 'sync') {
      await this.syncReplicate(key, regionalData, config);
    } else {
      await this.asyncReplicate(key, regionalData, config);
    }
  }

  async get(key: string, preferredRegion?: string): Promise<RegionalData | null> {
    if (preferredRegion) {
      const data = await this.redis.get(`region:${preferredRegion}:${key}`);
      if (data) {
        return JSON.parse(data) as RegionalData;
      }
    }

    const currentRegion = this.regionManager.getCurrentRegion();
    if (currentRegion) {
      const data = await this.redis.get(`region:${currentRegion.id}:${key}`);
      if (data) {
        return JSON.parse(data) as RegionalData;
      }
    }

    for (const region of this.regionManager.getHealthyRegions()) {
      const data = await this.redis.get(`region:${region.id}:${key}`);
      if (data) {
        return JSON.parse(data) as RegionalData;
      }
    }

    return null;
  }

  private async syncReplicate(
    key: string,
    data: RegionalData,
    config: ReplicationConfig
  ): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const regionId of config.regions) {
      pipeline.set(`region:${regionId}:${key}`, JSON.stringify(data));
    }

    await pipeline.exec();
  }

  private async asyncReplicate(
    key: string,
    data: RegionalData,
    config: ReplicationConfig
  ): Promise<void> {
    await this.redis.set(`region:${data.region}:${key}`, JSON.stringify(data));

    setImmediate(async () => {
      for (const regionId of config.regions) {
        if (regionId !== data.region) {
          try {
            await this.redis.set(`region:${regionId}:${key}`, JSON.stringify(data));
          } catch (error) {
            console.error(`Failed to replicate to region ${regionId}:`, error);
          }
        }
      }
    });
  }

  private async getNextVersion(key: string): Promise<number> {
    const versionKey = `version:${key}`;
    return await this.redis.incr(versionKey);
  }

  async resolveConflict(
    key: string,
    versions: RegionalData[],
    strategy: ReplicationConfig['conflictResolution']
  ): Promise<RegionalData> {
    switch (strategy) {
      case 'last_write_wins':
        return versions.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        )[0];

      case 'merge':
        return this.mergeData(versions);

      default:
        return versions[0];
    }
  }

  private mergeData(versions: RegionalData[]): RegionalData {
    const merged = versions.reduce((acc, version) => {
      return {
        ...acc,
        ...(version.data as Record<string, unknown>),
      };
    }, {});

    return {
      region: versions[0].region,
      data: merged,
      timestamp: new Date(),
      version: Math.max(...versions.map((v) => v.version)),
    };
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
