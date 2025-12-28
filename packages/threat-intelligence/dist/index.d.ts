export interface ThreatData {
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface Threat {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  metadata: any;
}

export interface ThreatIntelligenceConfig {
  enableIpChecking?: boolean;
  apiKey?: string;
}

export class ThreatDetector {
  constructor(config?: ThreatIntelligenceConfig);
  checkIp(ip: string): Promise<{ isThreat: boolean; reason?: string }>;
  reportThreat(data: any): Promise<void>;
}

export class ThreatIntelligenceEngine extends ThreatDetector {
  constructor(redisUrl?: string);
  analyzeThreat(data: ThreatData): Promise<Threat[]>;
}

export function createThreatDetector(config?: ThreatIntelligenceConfig): ThreatDetector;
