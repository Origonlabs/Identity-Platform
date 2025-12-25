export interface TrafficPattern {
  identifier: string;
  requestCount: number;
  timeWindow: number;
  averageResponseTime: number;
  errorRate: number;
  uniqueEndpoints: number;
}

export interface AdaptiveLimit {
  identifier: string;
  baseLimit: number;
  currentLimit: number;
  adjustmentFactor: number;
  reason: string;
  lastUpdated: Date;
}
