import type { MLFeature, BehavioralPattern } from './types';
import { PatternDetector } from './pattern-detector';

export class BehavioralClassifier {
  constructor(private readonly patternDetector: PatternDetector) {}

  async extractFeatures(
    userId: string,
    context: {
      ip?: string;
      location?: string;
      deviceId?: string;
      loginTime?: number;
      sessionDuration?: number;
      actions?: string[];
    }
  ): Promise<MLFeature[]> {
    const features: MLFeature[] = [];

    const behavior: Partial<BehavioralPattern> = {
      loginTimes: context.loginTime ? [context.loginTime] : [],
      locations: context.location ? [context.location] : [],
      devices: context.deviceId ? [context.deviceId] : [],
      averageSessionDuration: context.sessionDuration || 0,
      typicalActions: context.actions || [],
    };

    const anomaly = await this.patternDetector.detectAnomaly(behavior, userId);

    features.push({
      name: 'behavior_anomaly',
      value: anomaly.score,
      weight: 0.20,
    });

    if (anomaly.reasons.includes('unusual_login_time')) {
      features.push({
        name: 'time_anomaly',
        value: 0.8,
        weight: 0.10,
      });
    }

    if (anomaly.reasons.includes('unusual_location')) {
      features.push({
        name: 'location_anomaly',
        value: 0.7,
        weight: 0.15,
      });
    }

    if (anomaly.reasons.includes('unusual_device')) {
      features.push({
        name: 'device_fingerprint',
        value: 0.6,
        weight: 0.20,
      });
    }

    return features;
  }
}
