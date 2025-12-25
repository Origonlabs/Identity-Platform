import type { ThreatIndicator } from './types';
import { IPReputationService } from './ip-reputation';
import { ThreatFeedManager } from './threat-feeds';

export class ThreatIntelligenceEngine {
  private readonly ipReputation: IPReputationService;
  private readonly threatFeeds: ThreatFeedManager;

  constructor(redisUrl?: string) {
    this.ipReputation = new IPReputationService(redisUrl);
    this.threatFeeds = new ThreatFeedManager();
  }

  async analyzeThreat(context: {
    ip?: string;
    domain?: string;
    email?: string;
    url?: string;
  }): Promise<ThreatIndicator[]> {
    const threats: ThreatIndicator[] = [];

    if (context.ip) {
      const ipThreats = await this.ipReputation.getThreats(context.ip);
      threats.push(...ipThreats);

      const isThreat = await this.ipReputation.checkThreat(context.ip);
      if (isThreat) {
        threats.push({
          type: 'ip',
          value: context.ip,
          severity: 'high',
          source: 'reputation',
          firstSeen: new Date(),
          lastSeen: new Date(),
          confidence: 0.8,
          metadata: {},
        });
      }
    }

    if (context.domain) {
      const domainThreat = await this.threatFeeds.checkIndicator('domain', context.domain);
      if (domainThreat) threats.push(domainThreat);
    }

    if (context.email) {
      const emailThreat = await this.threatFeeds.checkIndicator('email', context.email);
      if (emailThreat) threats.push(emailThreat);
    }

    if (context.url) {
      const urlThreat = await this.threatFeeds.checkIndicator('url', context.url);
      if (urlThreat) threats.push(urlThreat);
    }

    return threats;
  }

  async getIPReputation(ip: string) {
    return this.ipReputation.getReputation(ip);
  }

  async close(): Promise<void> {
    await this.ipReputation.close();
  }
}
