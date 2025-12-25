export interface AnomalyEvent {
  id: string;
  type: 'login' | 'api_call' | 'resource_access' | 'data_access' | 'configuration_change';
  userId?: string;
  ip: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  indicators: string[];
}

export interface AnomalyPattern {
  type: string;
  description: string;
  threshold: number;
  window: number;
  detectionMethod: 'statistical' | 'ml' | 'rule_based';
}

export interface DetectionResult {
  isAnomaly: boolean;
  confidence: number;
  score: number;
  reasons: string[];
  recommendedAction: 'monitor' | 'alert' | 'block' | 'investigate';
}
