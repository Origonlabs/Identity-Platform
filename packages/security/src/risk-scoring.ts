import type { RiskScore, RiskFactor, AuthenticationContext } from './types';

export class RiskScoringEngine {
  private readonly weights = {
    ipReputation: 0.15,
    deviceFingerprint: 0.20,
    geolocation: 0.15,
    behavioralPattern: 0.25,
    velocity: 0.15,
    timeBased: 0.10,
  };

  async calculateRisk(context: AuthenticationContext): Promise<RiskScore> {
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    const ipScore = await this.evaluateIPReputation(context.ip);
    factors.push({
      type: 'ip_reputation',
      weight: this.weights.ipReputation,
      value: ipScore,
      description: `IP reputation score: ${ipScore}`,
    });
    totalScore += ipScore * this.weights.ipReputation;

    const deviceScore = this.evaluateDevice(context.deviceFingerprint, context.userAgent);
    factors.push({
      type: 'device_fingerprint',
      weight: this.weights.deviceFingerprint,
      value: deviceScore,
      description: `Device trust score: ${deviceScore}`,
    });
    totalScore += deviceScore * this.weights.deviceFingerprint;

    const geoScore = this.evaluateGeolocation(context);
    factors.push({
      type: 'geolocation',
      weight: this.weights.geolocation,
      value: geoScore,
      description: `Geolocation risk score: ${geoScore}`,
    });
    totalScore += geoScore * this.weights.geolocation;

    const behaviorScore = await this.evaluateBehavioralPattern(context);
    factors.push({
      type: 'behavioral_pattern',
      weight: this.weights.behavioralPattern,
      value: behaviorScore,
      description: `Behavioral pattern score: ${behaviorScore}`,
    });
    totalScore += behaviorScore * this.weights.behavioralPattern;

    const velocityScore = await this.evaluateVelocity(context);
    factors.push({
      type: 'velocity',
      weight: this.weights.velocity,
      value: velocityScore,
      description: `Velocity risk score: ${velocityScore}`,
    });
    totalScore += velocityScore * this.weights.velocity;

    const timeScore = this.evaluateTimeBased(context);
    factors.push({
      type: 'time_based',
      weight: this.weights.timeBased,
      value: timeScore,
      description: `Time-based risk score: ${timeScore}`,
    });
    totalScore += timeScore * this.weights.timeBased;

    const level = this.getRiskLevel(totalScore);
    const recommendations = this.generateRecommendations(totalScore, factors);

    return {
      score: Math.round(totalScore * 100) / 100,
      level,
      factors,
      recommendations,
    };
  }

  private async evaluateIPReputation(ip: string): Promise<number> {
    const isPrivate = this.isPrivateIP(ip);
    if (isPrivate) return 0.1;

    const isVPN = await this.checkVPN(ip);
    if (isVPN) return 0.7;

    const isProxy = await this.checkProxy(ip);
    if (isProxy) return 0.8;

    const isTor = await this.checkTor(ip);
    if (isTor) return 0.9;

    return 0.2;
  }

  private evaluateDevice(
    fingerprint: AuthenticationContext['deviceFingerprint'],
    userAgent: string
  ): number {
    if (!fingerprint) return 0.8;

    const hasConsistentFingerprint = fingerprint.id && fingerprint.id.length > 20;
    if (!hasConsistentFingerprint) return 0.7;

    const hasSuspiciousFeatures =
      fingerprint.plugins.length === 0 ||
      !fingerprint.canvas ||
      !fingerprint.webgl;

    if (hasSuspiciousFeatures) return 0.6;

    return 0.1;
  }

  private evaluateGeolocation(context: AuthenticationContext): number {
    if (!context.location) return 0.5;

    const suspiciousCountries = ['KP', 'IR', 'SY', 'CU'];
    if (suspiciousCountries.includes(context.location.country)) {
      return 0.9;
    }

    return 0.2;
  }

  private async evaluateBehavioralPattern(context: AuthenticationContext): Promise<number> {
    if (!context.userId) return 0.5;

    const hour = context.timestamp.getHours();
    const isUnusualHour = hour < 6 || hour > 23;

    if (isUnusualHour) return 0.6;

    return 0.2;
  }

  private async evaluateVelocity(context: AuthenticationContext): Promise<number> {
    if (!context.previousAttempts) return 0.2;

    if (context.previousAttempts > 10) return 0.9;
    if (context.previousAttempts > 5) return 0.7;
    if (context.previousAttempts > 3) return 0.5;

    return 0.2;
  }

  private evaluateTimeBased(context: AuthenticationContext): number {
    const hour = context.timestamp.getHours();
    const day = context.timestamp.getDay();

    if (day === 0 || day === 6) {
      return 0.4;
    }

    if (hour >= 9 && hour <= 17) {
      return 0.1;
    }

    return 0.3;
  }

  private getRiskLevel(score: number): RiskScore['level'] {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  private generateRecommendations(score: number, factors: RiskFactor[]): string[] {
    const recommendations: string[] = [];

    if (score >= 0.8) {
      recommendations.push('Require MFA');
      recommendations.push('Block access temporarily');
      recommendations.push('Notify security team');
    } else if (score >= 0.6) {
      recommendations.push('Require MFA');
      recommendations.push('Challenge with CAPTCHA');
    } else if (score >= 0.4) {
      recommendations.push('Consider MFA');
      recommendations.push('Monitor session closely');
    }

    const highRiskFactors = factors.filter((f) => f.value >= 0.7);
    if (highRiskFactors.length > 0) {
      recommendations.push(`Review: ${highRiskFactors.map((f) => f.type).join(', ')}`);
    }

    return recommendations;
  }

  private isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    return (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 127
    );
  }

  private async checkVPN(ip: string): Promise<boolean> {
    return false;
  }

  private async checkProxy(ip: string): Promise<boolean> {
    return false;
  }

  private async checkTor(ip: string): Promise<boolean> {
    return false;
  }
}
