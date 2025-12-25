export interface ModelUpdate {
  clientId: string;
  weights: number[];
  sampleCount: number;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface AggregatedModel {
  weights: number[];
  version: number;
  participantCount: number;
  aggregatedAt: Date;
}

export interface FederatedLearningConfig {
  minParticipants: number;
  maxRounds: number;
  aggregationMethod: 'fedavg' | 'fedprox' | 'scaffold';
  privacyBudget?: number;
  differentialPrivacy?: boolean;
}

export interface PrivacyMetrics {
  epsilon: number;
  delta: number;
  noiseScale: number;
}
