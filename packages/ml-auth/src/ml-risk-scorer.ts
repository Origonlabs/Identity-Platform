import Redis from 'ioredis';
import type { MLFeature, MLRiskPrediction } from './types';

export class MLRiskScorer {
  private readonly redis: Redis;
  private readonly featureWeights: Map<string, number> = new Map([
    ['ip_reputation', 0.15],
    ['device_fingerprint', 0.20],
    ['location_anomaly', 0.15],
    ['time_anomaly', 0.10],
    ['behavior_anomaly', 0.20],
    ['velocity_anomaly', 0.10],
    ['session_pattern', 0.10],
  ]);

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async calculateRisk(features: MLFeature[]): Promise<MLRiskPrediction> {
    let weightedScore = 0;
    let totalWeight = 0;
    const factors: string[] = [];

    for (const feature of features) {
      const weight = this.featureWeights.get(feature.name) || feature.weight || 0.1;
      const contribution = feature.value * weight;
      weightedScore += contribution;
      totalWeight += weight;

      if (feature.value > 0.7) {
        factors.push(`${feature.name}:high_risk`);
      } else if (feature.value > 0.4) {
        factors.push(`${feature.name}:medium_risk`);
      }
    }

    const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const confidence = this.calculateConfidence(features);
    const recommendedAction = this.recommendAction(normalizedScore);

    await this.storePrediction(normalizedScore, features);

    return {
      riskScore: normalizedScore,
      confidence,
      factors,
      recommendedAction,
    };
  }

  async learnFromOutcome(
    prediction: MLRiskPrediction,
    actualOutcome: 'legitimate' | 'fraudulent',
    features: MLFeature[]
  ): Promise<void> {
    const error = actualOutcome === 'fraudulent' ? 1 - prediction.riskScore : prediction.riskScore;
    
    if (error > 0.2) {
      await this.adjustWeights(features, error, actualOutcome);
    }
  }

  private calculateConfidence(features: MLFeature[]): number {
    if (features.length === 0) return 0.5;

    const featureCount = features.length;
    const highConfidenceFeatures = features.filter(f => f.value > 0.8 || f.value < 0.2).length;
    
    return Math.min(1.0, 0.5 + (highConfidenceFeatures / featureCount) * 0.5);
  }

  private recommendAction(riskScore: number): MLRiskPrediction['recommendedAction'] {
    if (riskScore >= 0.8) return 'block';
    if (riskScore >= 0.6) return 'require_verification';
    if (riskScore >= 0.4) return 'require_mfa';
    return 'allow';
  }

  private async storePrediction(score: number, features: MLFeature[]): Promise<void> {
    const key = `ml:prediction:${Date.now()}`;
    await this.redis.setex(
      key,
      86400 * 7,
      JSON.stringify({ score, features, timestamp: new Date() })
    );
  }

  private async adjustWeights(
    features: MLFeature[],
    error: number,
    outcome: 'legitimate' | 'fraudulent'
  ): Promise<void> {
    const learningRate = 0.01;
    const adjustment = error * learningRate * (outcome === 'fraudulent' ? 1 : -1);

    for (const feature of features) {
      const currentWeight = this.featureWeights.get(feature.name) || 0.1;
      const newWeight = Math.max(0.01, Math.min(0.5, currentWeight + adjustment));
      this.featureWeights.set(feature.name, newWeight);
    }

    await this.saveWeights();
  }

  private async saveWeights(): Promise<void> {
    const weights = Object.fromEntries(this.featureWeights);
    await this.redis.setex('ml:weights', 86400 * 365, JSON.stringify(weights));
  }

  async loadWeights(): Promise<void> {
    const weights = await this.redis.get('ml:weights');
    if (weights) {
      const parsed = JSON.parse(weights) as Record<string, number>;
      for (const [name, weight] of Object.entries(parsed)) {
        this.featureWeights.set(name, weight);
      }
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
