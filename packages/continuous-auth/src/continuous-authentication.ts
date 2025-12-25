import Redis from 'ioredis';
import { BehavioralBiometricEngine } from '@opendex/behavioral-biometrics';
import { RiskScoringEngine } from '@opendex/security';
import type { ContinuousAuthContext, ContinuousAuthResult, SessionRiskProfile } from './types';
import { SessionMonitor } from './session-monitor';
import { RiskAccumulator } from './risk-accumulator';

export class ContinuousAuthentication {
  private readonly redis: Redis;
  private readonly biometricEngine: BehavioralBiometricEngine;
  private readonly riskEngine: RiskScoringEngine;
  private readonly sessionMonitor: SessionMonitor;
  private readonly riskAccumulator: RiskAccumulator;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.biometricEngine = new BehavioralBiometricEngine(redisUrl);
    this.riskEngine = new RiskScoringEngine();
    this.sessionMonitor = new SessionMonitor(redisUrl);
    this.riskAccumulator = new RiskAccumulator(redisUrl);
  }

  async verify(context: ContinuousAuthContext): Promise<ContinuousAuthResult> {
    const sessionRisk = await this.riskAccumulator.getSessionRisk(context.sessionId);
    
    let biometricConfidence = 1.0;
    if (context.behavioralData) {
      const biometricResult = await this.biometricEngine.verify(
        context.userId,
        context.behavioralData as any
      );
      biometricConfidence = biometricResult.confidence;
    }

    const riskScore = await this.calculateRisk(context, sessionRisk, biometricConfidence);
    await this.riskAccumulator.updateSessionRisk(context.sessionId, riskScore);

    const authenticated = riskScore < 0.7 && biometricConfidence >= 0.6;
    const requiredAction = this.determineAction(riskScore, biometricConfidence);

    await this.sessionMonitor.recordActivity(context);

    return {
      authenticated,
      confidence: biometricConfidence,
      riskScore,
      requiredAction,
      reason: requiredAction ? this.getReason(riskScore, biometricConfidence) : undefined,
    };
  }

  private async calculateRisk(
    context: ContinuousAuthContext,
    sessionRisk: number,
    biometricConfidence: number
  ): Promise<number> {
    let risk = sessionRisk;

    if (biometricConfidence < 0.5) {
      risk += 0.3;
    } else if (biometricConfidence < 0.7) {
      risk += 0.15;
    }

    if (context.networkData?.ip) {
      const networkRisk = await this.riskEngine.calculateRisk({
        ip: context.networkData.ip,
        userAgent: 'unknown',
        timestamp: context.timestamp,
      });
      risk = (risk + networkRisk.score) / 2;
    }

    if (!context.deviceData?.trusted) {
      risk += 0.2;
    }

    return Math.min(1.0, risk);
  }

  private determineAction(
    riskScore: number,
    biometricConfidence: number
  ): ContinuousAuthResult['requiredAction'] {
    if (riskScore >= 0.9 || biometricConfidence < 0.3) {
      return 'block';
    }

    if (riskScore >= 0.7 || biometricConfidence < 0.5) {
      return 'reauthenticate';
    }

    if (riskScore >= 0.5 || biometricConfidence < 0.7) {
      return 'step_up';
    }

    return undefined;
  }

  private getReason(riskScore: number, biometricConfidence: number): string {
    if (riskScore >= 0.9) return 'High risk score detected';
    if (biometricConfidence < 0.3) return 'Biometric verification failed';
    if (riskScore >= 0.7) return 'Elevated risk requires reauthentication';
    if (biometricConfidence < 0.5) return 'Low biometric confidence';
    return 'Step-up authentication required';
  }

  async close(): Promise<void> {
    await this.redis.quit();
    await this.biometricEngine.close();
  }
}
