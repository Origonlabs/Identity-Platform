export interface DDoSDetection {
  ip: string;
  requestCount: number;
  windowStart: Date;
  windowEnd: Date;
  attackType: 'volumetric' | 'protocol' | 'application';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProtectionRule {
  id: string;
  name: string;
  threshold: number;
  windowMs: number;
  action: 'block' | 'rate_limit' | 'challenge' | 'log';
  enabled: boolean;
}

export interface IPBlocklist {
  ip: string;
  reason: string;
  blockedAt: Date;
  expiresAt?: Date;
  source: 'manual' | 'automatic' | 'threat_intelligence';
}
