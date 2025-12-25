import type { AuthenticationContext, RiskScore } from './types';
import { RiskScoringEngine } from './risk-scoring';
import { FraudDetectionService } from './fraud-detection';

export type AuthenticationStep =
  | 'password'
  | 'mfa'
  | 'captcha'
  | 'biometric'
  | 'email_verification'
  | 'sms_verification'
  | 'block';

export interface AdaptiveAuthResult {
  allowed: boolean;
  requiredSteps: AuthenticationStep[];
  riskScore: RiskScore;
  message?: string;
  sessionRestrictions?: {
    maxDuration?: number;
    requireReauth?: boolean;
    ipWhitelist?: string[];
  };
}

export class AdaptiveAuthenticationService {
  constructor(
    private readonly riskEngine: RiskScoringEngine,
    private readonly fraudDetection: FraudDetectionService
  ) {}

  async evaluate(context: AuthenticationContext): Promise<AdaptiveAuthResult> {
    const riskScore = await this.riskEngine.calculateRisk(context);
    const shouldBlock = await this.fraudDetection.shouldBlock(context);

    if (shouldBlock) {
      return {
        allowed: false,
        requiredSteps: ['block'],
        riskScore,
        message: 'Access blocked due to security concerns',
      };
    }

    const requiredSteps = this.determineRequiredSteps(riskScore, context);
    const sessionRestrictions = this.determineSessionRestrictions(riskScore);

    return {
      allowed: true,
      requiredSteps,
      riskScore,
      sessionRestrictions,
    };
  }

  private determineRequiredSteps(
    riskScore: RiskScore,
    context: AuthenticationContext
  ): AuthenticationStep[] {
    const steps: AuthenticationStep[] = ['password'];

    if (riskScore.level === 'critical') {
      steps.push('mfa', 'captcha', 'email_verification');
      return steps;
    }

    if (riskScore.level === 'high') {
      steps.push('mfa', 'captcha');
      return steps;
    }

    if (riskScore.level === 'medium') {
      if (!context.mfaEnabled) {
        steps.push('mfa');
      }
      steps.push('captcha');
      return steps;
    }

    if (riskScore.level === 'low') {
      if (context.mfaEnabled) {
        steps.push('mfa');
      }
      return steps;
    }

    return steps;
  }

  private determineSessionRestrictions(riskScore: RiskScore): AdaptiveAuthResult['sessionRestrictions'] {
    if (riskScore.level === 'critical' || riskScore.level === 'high') {
      return {
        maxDuration: 3600000,
        requireReauth: true,
      };
    }

    if (riskScore.level === 'medium') {
      return {
        maxDuration: 7200000,
        requireReauth: false,
      };
    }

    return {
      maxDuration: 86400000,
      requireReauth: false,
    };
  }
}
