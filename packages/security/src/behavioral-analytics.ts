import type { BehavioralPattern, AuthenticationContext } from './types';

export class BehavioralAnalyticsService {
  async analyzePattern(context: AuthenticationContext): Promise<BehavioralPattern> {
    const hour = context.timestamp.getHours();
    const day = context.timestamp.getDay();

    return {
      userId: context.userId || 'anonymous',
      loginFrequency: await this.getLoginFrequency(context.userId),
      averageSessionDuration: await this.getAverageSessionDuration(context.userId),
      typicalLoginHours: await this.getTypicalLoginHours(context.userId),
      typicalLocations: await this.getTypicalLocations(context.userId),
      deviceTypes: await this.getDeviceTypes(context.userId),
      browserTypes: await this.getBrowserTypes(context.userId),
      lastLogin: await this.getLastLogin(context.userId),
      lastLocation: context.location?.city || 'unknown',
      anomalyScore: await this.calculateAnomalyScore(context),
    };
  }

  async detectAnomalies(
    pattern: BehavioralPattern,
    context: AuthenticationContext
  ): Promise<boolean> {
    const hour = context.timestamp.getHours();
    const isUnusualHour = !pattern.typicalLoginHours.includes(hour);

    const isUnusualLocation =
      context.location &&
      !pattern.typicalLocations.includes(context.location.city);

    const isUnusualDevice = context.deviceFingerprint
      ? !pattern.deviceTypes.includes(context.deviceFingerprint.device)
      : false;

    const timeSinceLastLogin = context.userId
      ? Date.now() - pattern.lastLogin.getTime()
      : Infinity;
    const isRapidLogin = timeSinceLastLogin < 60000;

    return isUnusualHour || isUnusualLocation || isUnusualDevice || isRapidLogin;
  }

  private async getLoginFrequency(userId?: string): Promise<number> {
    return 1;
  }

  private async getAverageSessionDuration(userId?: string): Promise<number> {
    return 3600000;
  }

  private async getTypicalLoginHours(userId?: string): Promise<number[]> {
    return [9, 10, 11, 12, 13, 14, 15, 16, 17];
  }

  private async getTypicalLocations(userId?: string): Promise<string[]> {
    return [];
  }

  private async getDeviceTypes(userId?: string): Promise<string[]> {
    return [];
  }

  private async getBrowserTypes(userId?: string): Promise<string[]> {
    return [];
  }

  private async getLastLogin(userId?: string): Promise<Date> {
    return new Date(Date.now() - 86400000);
  }

  private async calculateAnomalyScore(context: AuthenticationContext): Promise<number> {
    let score = 0;

    const hour = context.timestamp.getHours();
    if (hour < 6 || hour > 23) score += 0.3;

    if (context.previousAttempts && context.previousAttempts > 3) {
      score += 0.4;
    }

    if (!context.deviceFingerprint) {
      score += 0.3;
    }

    return Math.min(score, 1.0);
  }
}
