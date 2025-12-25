import type { DDoSDetection, ProtectionRule } from './types';
import { AdvancedRateLimiter } from './rate-limiter-advanced';
import { IPFilteringService } from './ip-filtering';

export class DDoSProtector {
  private readonly rateLimiter: AdvancedRateLimiter;
  private readonly ipFilter: IPFilteringService;
  private readonly rules: Map<string, ProtectionRule> = new Map();

  constructor(redisUrl?: string) {
    this.rateLimiter = new AdvancedRateLimiter(redisUrl);
    this.ipFilter = new IPFilteringService(redisUrl);
    this.setupDefaultRules();
  }

  addRule(rule: ProtectionRule): void {
    this.rules.set(rule.id, rule);
  }

  async checkRequest(ip: string, path: string): Promise<{
    allowed: boolean;
    reason?: string;
    action?: ProtectionRule['action'];
  }> {
    if (await this.ipFilter.isBlocked(ip)) {
      return {
        allowed: false,
        reason: 'IP is blocklisted',
        action: 'block',
      };
    }

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const requestCount = await this.rateLimiter.getRequestCount(
        `${ip}:${path}`,
        rule.windowMs
      );

      if (requestCount >= rule.threshold) {
        const detection: DDoSDetection = {
          ip,
          requestCount,
          windowStart: new Date(Date.now() - rule.windowMs),
          windowEnd: new Date(),
          attackType: this.detectAttackType(requestCount, rule.windowMs),
          severity: this.calculateSeverity(requestCount, rule.threshold),
        };

        if (rule.action === 'block') {
          await this.ipFilter.blockIP(ip, `DDoS attack detected: ${detection.attackType}`, undefined, 'automatic');
        }

        return {
          allowed: rule.action !== 'block',
          reason: `Rate limit exceeded: ${requestCount} requests in ${rule.windowMs}ms`,
          action: rule.action,
        };
      }
    }

    return { allowed: true };
  }

  async detectAttack(ip: string, path: string): Promise<DDoSDetection | null> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const requestCount = await this.rateLimiter.getRequestCount(
        `${ip}:${path}`,
        rule.windowMs
      );

      if (requestCount >= rule.threshold) {
        return {
          ip,
          requestCount,
          windowStart: new Date(Date.now() - rule.windowMs),
          windowEnd: new Date(),
          attackType: this.detectAttackType(requestCount, rule.windowMs),
          severity: this.calculateSeverity(requestCount, rule.threshold),
        };
      }
    }

    return null;
  }

  private detectAttackType(requestCount: number, windowMs: number): DDoSDetection['attackType'] {
    const rps = requestCount / (windowMs / 1000);
    
    if (rps > 1000) return 'volumetric';
    if (rps > 100) return 'protocol';
    return 'application';
  }

  private calculateSeverity(requestCount: number, threshold: number): DDoSDetection['severity'] {
    const ratio = requestCount / threshold;
    
    if (ratio >= 10) return 'critical';
    if (ratio >= 5) return 'high';
    if (ratio >= 2) return 'medium';
    return 'low';
  }

  private setupDefaultRules(): void {
    this.addRule({
      id: 'default-api',
      name: 'Default API Rate Limit',
      threshold: 100,
      windowMs: 60000,
      action: 'rate_limit',
      enabled: true,
    });

    this.addRule({
      id: 'strict-api',
      name: 'Strict API Rate Limit',
      threshold: 1000,
      windowMs: 60000,
      action: 'block',
      enabled: true,
    });
  }

  async close(): Promise<void> {
    await this.rateLimiter.close();
    await this.ipFilter.close();
  }
}
