import Redis from 'ioredis';
import type { IPReputation, ThreatIndicator } from './types';

export class IPReputationService {
  private readonly redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async getReputation(ip: string): Promise<IPReputation | null> {
    const cached = await this.redis.get(`ip:reputation:${ip}`);
    if (cached) {
      return JSON.parse(cached) as IPReputation;
    }

    const reputation = await this.fetchReputation(ip);
    if (reputation) {
      await this.redis.setex(
        `ip:reputation:${ip}`,
        3600,
        JSON.stringify(reputation)
      );
    }

    return reputation;
  }

  async checkThreat(ip: string): Promise<boolean> {
    const reputation = await this.getReputation(ip);
    if (!reputation) return false;

    return (
      reputation.reputation === 'malicious' ||
      reputation.reputation === 'suspicious' ||
      reputation.score < 30
    );
  }

  async getThreats(ip: string): Promise<ThreatIndicator[]> {
    const reputation = await this.getReputation(ip);
    return reputation?.threats || [];
  }

  private async fetchReputation(ip: string): Promise<IPReputation | null> {
    const isPrivate = this.isPrivateIP(ip);
    if (isPrivate) {
      return {
        ip,
        reputation: 'trusted',
        score: 100,
        categories: [],
        country: 'local',
        isp: 'internal',
        asn: 0,
        threats: [],
        lastUpdated: new Date(),
      };
    }

    const threats = await this.checkThreatFeeds(ip);
    const score = this.calculateReputationScore(threats);
    const reputation = this.getReputationLevel(score);

    return {
      ip,
      reputation,
      score,
      categories: this.extractCategories(threats),
      country: await this.getCountry(ip),
      isp: await this.getISP(ip),
      asn: await this.getASN(ip),
      threats,
      lastUpdated: new Date(),
    };
  }

  private async checkThreatFeeds(ip: string): Promise<ThreatIndicator[]> {
    const threats: ThreatIndicator[] = [];

    const isVPN = await this.checkVPN(ip);
    if (isVPN) {
      threats.push({
        type: 'ip',
        value: ip,
        severity: 'medium',
        source: 'internal',
        firstSeen: new Date(),
        lastSeen: new Date(),
        confidence: 0.7,
        metadata: { type: 'vpn' },
      });
    }

    const isProxy = await this.checkProxy(ip);
    if (isProxy) {
      threats.push({
        type: 'ip',
        value: ip,
        severity: 'medium',
        source: 'internal',
        firstSeen: new Date(),
        lastSeen: new Date(),
        confidence: 0.7,
        metadata: { type: 'proxy' },
      });
    }

    const isTor = await this.checkTor(ip);
    if (isTor) {
      threats.push({
        type: 'ip',
        value: ip,
        severity: 'high',
        source: 'internal',
        firstSeen: new Date(),
        lastSeen: new Date(),
        confidence: 0.9,
        metadata: { type: 'tor' },
      });
    }

    return threats;
  }

  private calculateReputationScore(threats: ThreatIndicator[]): number {
    if (threats.length === 0) return 100;

    let score = 100;
    for (const threat of threats) {
      switch (threat.severity) {
        case 'critical':
          score -= 50;
          break;
        case 'high':
          score -= 30;
          break;
        case 'medium':
          score -= 15;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    return Math.max(0, score);
  }

  private getReputationLevel(score: number): IPReputation['reputation'] {
    if (score >= 80) return 'trusted';
    if (score >= 50) return 'neutral';
    if (score >= 30) return 'suspicious';
    return 'malicious';
  }

  private extractCategories(threats: ThreatIndicator[]): string[] {
    const categories = new Set<string>();
    for (const threat of threats) {
      if (threat.metadata.type) {
        categories.add(threat.metadata.type as string);
      }
    }
    return Array.from(categories);
  }

  private isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    return (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 127
    );
  }

  private async checkVPN(ip: string): Promise<boolean> {
    return false;
  }

  private async checkProxy(ip: string): Promise<boolean> {
    return false;
  }

  private async checkTor(ip: string): Promise<boolean> {
    return false;
  }

  private async getCountry(ip: string): Promise<string> {
    return 'unknown';
  }

  private async getISP(ip: string): Promise<string> {
    return 'unknown';
  }

  private async getASN(ip: string): Promise<number> {
    return 0;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
