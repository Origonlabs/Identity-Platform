import type { Region } from './types';

export class RegionManager {
  private readonly regions: Map<string, Region> = new Map();
  private currentRegion: string | null = null;

  registerRegion(region: Region): void {
    this.regions.set(region.id, region);
  }

  getRegion(regionId: string): Region | undefined {
    return this.regions.get(regionId);
  }

  getAllRegions(): Region[] {
    return Array.from(this.regions.values());
  }

  getHealthyRegions(): Region[] {
    return Array.from(this.regions.values()).filter((r) => r.healthy);
  }

  selectBestRegion(userLocation?: { latitude: number; longitude: number }): Region | null {
    const healthyRegions = this.getHealthyRegions();
    if (healthyRegions.length === 0) return null;

    if (userLocation) {
      return this.selectByLatency(healthyRegions, userLocation);
    }

    return healthyRegions.sort((a, b) => a.priority - b.priority)[0];
  }

  setCurrentRegion(regionId: string): void {
    if (this.regions.has(regionId)) {
      this.currentRegion = regionId;
    }
  }

  getCurrentRegion(): Region | null {
    if (this.currentRegion) {
      return this.regions.get(this.currentRegion) || null;
    }
    return this.selectBestRegion();
  }

  async measureLatency(region: Region): Promise<number> {
    const start = Date.now();
    try {
      const response = await fetch(`${region.endpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const latency = Date.now() - start;
        region.latency = latency;
        return latency;
      }
    } catch {
      region.healthy = false;
    }
    return Infinity;
  }

  async updateRegionHealth(): Promise<void> {
    for (const region of this.regions.values()) {
      const latency = await this.measureLatency(region);
      region.healthy = latency < 1000;
    }
  }

  private selectByLatency(
    regions: Region[],
    userLocation: { latitude: number; longitude: number }
  ): Region {
    return regions.sort((a, b) => {
      if (a.latency && b.latency) {
        return a.latency - b.latency;
      }
      return a.priority - b.priority;
    })[0];
  }
}
