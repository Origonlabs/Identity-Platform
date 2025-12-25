import type { FraudIndicator, AuthenticationContext } from './types';
import { RiskScoringEngine } from './risk-scoring';
import { BehavioralAnalyticsService } from './behavioral-analytics';
import { DeviceFingerprintingService } from './device-fingerprinting';

export class FraudDetectionService {
  constructor(
    private readonly riskEngine: RiskScoringEngine,
    private readonly behavioralAnalytics: BehavioralAnalyticsService,
    private readonly deviceFingerprinting: DeviceFingerprintingService
  ) {}

  async detectFraud(context: AuthenticationContext): Promise<FraudIndicator[]> {
    const indicators: FraudIndicator[] = [];

    const velocityIndicator = await this.checkVelocity(context);
    if (velocityIndicator) indicators.push(velocityIndicator);

    const geolocationIndicator = await this.checkGeolocation(context);
    if (geolocationIndicator) indicators.push(geolocationIndicator);

    const deviceIndicator = await this.checkDevice(context);
    if (deviceIndicator) indicators.push(deviceIndicator);

    const behaviorIndicator = await this.checkBehavior(context);
    if (behaviorIndicator) indicators.push(behaviorIndicator);

    const patternIndicator = await this.checkPattern(context);
    if (patternIndicator) indicators.push(patternIndicator);

    return indicators;
  }

  async shouldBlock(context: AuthenticationContext): Promise<boolean> {
    const indicators = await this.detectFraud(context);
    const criticalIndicators = indicators.filter((i) => i.severity === 'critical');
    const highIndicators = indicators.filter((i) => i.severity === 'high');

    if (criticalIndicators.length > 0) return true;
    if (highIndicators.length >= 2) return true;

    const riskScore = await this.riskEngine.calculateRisk(context);
    return riskScore.level === 'critical' || riskScore.score >= 0.85;
  }

  private async checkVelocity(context: AuthenticationContext): Promise<FraudIndicator | null> {
    if (!context.previousAttempts) return null;

    if (context.previousAttempts > 10) {
      return {
        type: 'velocity',
        severity: 'critical',
        description: `Excessive login attempts: ${context.previousAttempts}`,
        confidence: 0.95,
        metadata: { attempts: context.previousAttempts },
      };
    }

    if (context.previousAttempts > 5) {
      return {
        type: 'velocity',
        severity: 'high',
        description: `High number of login attempts: ${context.previousAttempts}`,
        confidence: 0.80,
        metadata: { attempts: context.previousAttempts },
      };
    }

    return null;
  }

  private async checkGeolocation(context: AuthenticationContext): Promise<FraudIndicator | null> {
    if (!context.location) return null;

    const suspiciousCountries = ['KP', 'IR', 'SY', 'CU'];
    if (suspiciousCountries.includes(context.location.country)) {
      return {
        type: 'geolocation',
        severity: 'high',
        description: `Login from restricted country: ${context.location.country}`,
        confidence: 0.85,
        metadata: { country: context.location.country },
      };
    }

    return null;
  }

  private async checkDevice(context: AuthenticationContext): Promise<FraudIndicator | null> {
    if (!context.deviceFingerprint) {
      return {
        type: 'device',
        severity: 'medium',
        description: 'No device fingerprint available',
        confidence: 0.60,
        metadata: {},
      };
    }

    return null;
  }

  private async checkBehavior(context: AuthenticationContext): Promise<FraudIndicator | null> {
    const pattern = await this.behavioralAnalytics.analyzePattern(context);
    const hasAnomalies = await this.behavioralAnalytics.detectAnomalies(pattern, context);

    if (hasAnomalies && pattern.anomalyScore > 0.7) {
      return {
        type: 'behavior',
        severity: pattern.anomalyScore > 0.8 ? 'high' : 'medium',
        description: `Behavioral anomaly detected: score ${pattern.anomalyScore.toFixed(2)}`,
        confidence: pattern.anomalyScore,
        metadata: { anomalyScore: pattern.anomalyScore },
      };
    }

    return null;
  }

  private async checkPattern(context: AuthenticationContext): Promise<FraudIndicator | null> {
    const riskScore = await this.riskEngine.calculateRisk(context);

    if (riskScore.level === 'critical') {
      return {
        type: 'pattern',
        severity: 'critical',
        description: `Critical risk pattern detected: ${riskScore.score.toFixed(2)}`,
        confidence: riskScore.score,
        metadata: { riskScore: riskScore.score, factors: riskScore.factors },
      };
    }

    return null;
  }
}
