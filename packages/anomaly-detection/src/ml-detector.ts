import type { AnomalyEvent, DetectionResult } from './types';

export class MLAnomalyDetector {
  private readonly featureWeights = {
    timeOfDay: 0.15,
    frequency: 0.25,
    location: 0.20,
    device: 0.15,
    behavior: 0.25,
  };

  async detectAnomaly(
    event: AnomalyEvent,
    historicalData: AnomalyEvent[]
  ): Promise<DetectionResult> {
    const features = this.extractFeatures(event, historicalData);
    const score = this.calculateAnomalyScore(features);
    const reasons = this.generateReasons(features, score);

    const isAnomaly = score >= 0.6;
    const confidence = Math.min(score, 1.0);
    const recommendedAction = this.getRecommendedAction(score);

    return {
      isAnomaly,
      confidence,
      score,
      reasons,
      recommendedAction,
    };
  }

  private extractFeatures(event: AnomalyEvent, historical: AnomalyEvent[]) {
    const hour = event.timestamp.getHours();
    const normalizedHour = (hour - 12) / 12;

    const recentEvents = historical.filter(
      (e) => event.timestamp.getTime() - e.timestamp.getTime() < 3600000
    );
    const frequency = Math.min(recentEvents.length / 20, 1.0);

    const locationScore = this.calculateLocationScore(event, historical);
    const deviceScore = this.calculateDeviceScore(event, historical);
    const behaviorScore = this.calculateBehaviorScore(event, historical);

    return {
      timeOfDay: Math.abs(normalizedHour),
      frequency,
      location: locationScore,
      device: deviceScore,
      behavior: behaviorScore,
    };
  }

  private calculateAnomalyScore(features: ReturnType<typeof this.extractFeatures>): number {
    return (
      features.timeOfDay * this.featureWeights.timeOfDay +
      features.frequency * this.featureWeights.frequency +
      features.location * this.featureWeights.location +
      features.device * this.featureWeights.device +
      features.behavior * this.featureWeights.behavior
    );
  }

  private calculateLocationScore(event: AnomalyEvent, historical: AnomalyEvent[]): number {
    if (!event.userId || historical.length === 0) return 0.5;

    const userEvents = historical.filter((e) => e.userId === event.userId);
    if (userEvents.length === 0) return 0.5;

    const uniqueIPs = new Set(userEvents.map((e) => e.ip));
    return uniqueIPs.has(event.ip) ? 0.1 : 0.8;
  }

  private calculateDeviceScore(event: AnomalyEvent, historical: AnomalyEvent[]): number {
    if (!event.userId || historical.length === 0) return 0.5;

    const userEvents = historical.filter((e) => e.userId === event.userId);
    if (userEvents.length === 0) return 0.5;

    const deviceTypes = new Set(
      userEvents.map((e) => e.metadata.deviceType as string).filter(Boolean)
    );
    const currentDevice = event.metadata.deviceType as string;

    return deviceTypes.has(currentDevice) ? 0.1 : 0.7;
  }

  private calculateBehaviorScore(event: AnomalyEvent, historical: AnomalyEvent[]): number {
    if (!event.userId || historical.length === 0) return 0.5;

    const userEvents = historical.filter((e) => e.userId === event.userId);
    if (userEvents.length < 5) return 0.3;

    const avgTimeBetweenEvents =
      userEvents.reduce((sum, e, i) => {
        if (i === 0) return sum;
        return sum + (e.timestamp.getTime() - userEvents[i - 1].timestamp.getTime());
      }, 0) / (userEvents.length - 1);

    const timeSinceLastEvent =
      event.timestamp.getTime() - userEvents[userEvents.length - 1].timestamp.getTime();

    if (timeSinceLastEvent < avgTimeBetweenEvents * 0.1) {
      return 0.8;
    }

    return 0.2;
  }

  private generateReasons(
    features: ReturnType<typeof this.extractFeatures>,
    score: number
  ): string[] {
    const reasons: string[] = [];

    if (features.frequency > 0.7) {
      reasons.push('Unusually high frequency');
    }

    if (features.location > 0.6) {
      reasons.push('Unusual location pattern');
    }

    if (features.device > 0.6) {
      reasons.push('Unusual device pattern');
    }

    if (features.behavior > 0.6) {
      reasons.push('Unusual behavioral pattern');
    }

    if (reasons.length === 0 && score > 0.6) {
      reasons.push('Multiple minor anomalies detected');
    }

    return reasons;
  }

  private getRecommendedAction(score: number): DetectionResult['recommendedAction'] {
    if (score >= 0.8) return 'block';
    if (score >= 0.6) return 'alert';
    if (score >= 0.4) return 'investigate';
    return 'monitor';
  }
}
