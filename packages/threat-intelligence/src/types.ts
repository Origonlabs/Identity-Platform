export interface ThreatIndicator {
  type: 'ip' | 'domain' | 'email' | 'hash' | 'url';
  value: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface IPReputation {
  ip: string;
  reputation: 'trusted' | 'neutral' | 'suspicious' | 'malicious';
  score: number;
  categories: string[];
  country: string;
  isp: string;
  asn: number;
  threats: ThreatIndicator[];
  lastUpdated: Date;
}

export interface ThreatFeed {
  name: string;
  url: string;
  format: 'json' | 'csv' | 'stix';
  updateInterval: number;
  enabled: boolean;
}
