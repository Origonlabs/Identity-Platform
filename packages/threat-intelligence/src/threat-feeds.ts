import type { ThreatFeed, ThreatIndicator } from './types';

export class ThreatFeedManager {
  private readonly feeds: Map<string, ThreatFeed> = new Map();
  private readonly indicators: Map<string, ThreatIndicator> = new Map();

  registerFeed(feed: ThreatFeed): void {
    this.feeds.set(feed.name, feed);
  }

  async updateFeed(feedName: string): Promise<void> {
    const feed = this.feeds.get(feedName);
    if (!feed || !feed.enabled) return;

    try {
      const indicators = await this.fetchIndicators(feed);
      for (const indicator of indicators) {
        this.indicators.set(`${indicator.type}:${indicator.value}`, indicator);
      }
    } catch (error) {
      console.error(`Failed to update feed ${feedName}:`, error);
    }
  }

  async checkIndicator(type: string, value: string): Promise<ThreatIndicator | null> {
    const key = `${type}:${value}`;
    return this.indicators.get(key) || null;
  }

  private async fetchIndicators(feed: ThreatFeed): Promise<ThreatIndicator[]> {
    const response = await fetch(feed.url);
    
    if (feed.format === 'json') {
      const data = await response.json();
      return this.parseJSONFeed(data);
    }

    if (feed.format === 'csv') {
      const text = await response.text();
      return this.parseCSVFeed(text);
    }

    return [];
  }

  private parseJSONFeed(data: unknown): ThreatIndicator[] {
    return [];
  }

  private parseCSVFeed(text: string): ThreatIndicator[] {
    return [];
  }
}
