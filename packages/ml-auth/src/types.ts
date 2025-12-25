export interface MLFeature {
  name: string;
  value: number;
  weight: number;
}

export interface MLRiskPrediction {
  riskScore: number;
  confidence: number;
  factors: string[];
  recommendedAction: 'allow' | 'require_mfa' | 'require_verification' | 'block';
}

export interface BehavioralPattern {
  userId: string;
  loginTimes: number[];
  locations: string[];
  devices: string[];
  ipRanges: string[];
  averageSessionDuration: number;
  typicalActions: string[];
}
