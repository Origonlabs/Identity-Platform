/**
 * Continuous Authentication System
 *
 * Monitors user sessions in real-time and continuously validates identity
 * Automatically challenges users when anomalies are detected
 */

// Import Prisma enums once generated, or use local definitions
// import { AuthSessionStatus, RiskLevel } from "@prisma/client";
import { getRiskScoringEngine } from "./risk-scoring-engine";
import { getBehavioralBiometricsAnalyzer, BehavioralProfile } from "./behavioral-biometrics";
import { RiskLevel } from "./adaptive-policy-engine";

// Local enum definition (will be replaced by Prisma-generated type after migration)
export enum AuthSessionStatus {
  ACTIVE = 'ACTIVE',
  CHALLENGED = 'CHALLENGED',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export type ContinuousAuthSession = {
  id: string,
  userId: string,
  tenancyId: string,
  sessionToken: string,
  status: AuthSessionStatus,

  // Device & Location
  deviceFingerprintId?: string,
  ipAddress?: string,
  geoLocation?: {
    country?: string,
    region?: string,
    city?: string,
    latitude?: number,
    longitude?: number,
  },

  // Risk & Trust
  initialRiskScore: number,
  currentRiskScore: number,
  riskScoreHistory: Array<{ timestamp: Date, score: number }>,

  // Re-authentication
  lastReauthAt: Date,
  reauthRequired: boolean,
  reauthReason?: string,

  // Monitoring
  monitoringEnabled: boolean,
  lastMonitoredAt: Date,

  // Lifecycle
  createdAt: Date,
  expiresAt?: Date,
  terminatedAt?: Date,
  terminationReason?: string,
}

export type MonitoringEvent = {
  sessionId: string,
  timestamp: Date,
  eventType: string,
  eventData: Record<string, unknown>,
  riskScore: number,
  behavioralAnomaly: boolean,
}

export type ReauthChallenge = {
  type: 'mfa' | 'biometric' | 'password' | 'security_question',
  reason: string,
  riskLevel: RiskLevel,
  expiresAt: Date,
}

export class ContinuousAuthenticationSystem {
  private readonly riskEngine = getRiskScoringEngine();
  private readonly biometricsAnalyzer = getBehavioralBiometricsAnalyzer();

  // Thresholds
  private readonly RISK_THRESHOLD_CHALLENGE = 0.5;
  private readonly RISK_THRESHOLD_SUSPEND = 0.7;
  private readonly RISK_THRESHOLD_TERMINATE = 0.9;
  private readonly REAUTH_INTERVAL_HOURS = 8;
  private readonly MONITORING_INTERVAL_MS = 30000; // 30 seconds

  /**
   * Initialize continuous authentication for a session
   */
  async initializeSession(
    userId: string,
    tenancyId: string,
    sessionToken: string,
    context: {
      deviceFingerprintId?: string,
      ipAddress?: string,
      geoLocation?: Record<string, unknown>,
      initialRiskScore?: number,
    }
  ): Promise<ContinuousAuthSession> {
    const now = new Date();

    const session: ContinuousAuthSession = {
      id: this.generateSessionId(),
      userId,
      tenancyId,
      sessionToken,
      status: AuthSessionStatus.ACTIVE,
      deviceFingerprintId: context.deviceFingerprintId,
      ipAddress: context.ipAddress,
      geoLocation: context.geoLocation as ContinuousAuthSession['geoLocation'],
      initialRiskScore: context.initialRiskScore ?? 0.5,
      currentRiskScore: context.initialRiskScore ?? 0.5,
      riskScoreHistory: [
        { timestamp: now, score: context.initialRiskScore ?? 0.5 },
      ],
      lastReauthAt: now,
      reauthRequired: false,
      monitoringEnabled: true,
      lastMonitoredAt: now,
      createdAt: now,
    };

    return session;
  }

  /**
   * Monitor a session continuously
   */
  async monitorSession(
    session: ContinuousAuthSession,
    recentEvents: MonitoringEvent[],
    behavioralProfile?: BehavioralProfile
  ): Promise<{
    session: ContinuousAuthSession,
    action: 'continue' | 'challenge' | 'suspend' | 'terminate',
    reason?: string,
    challenge?: ReauthChallenge,
  }> {
    const now = new Date();

    // Check if monitoring is enabled
    if (!session.monitoringEnabled) {
      return { session, action: 'continue' };
    }

    // Calculate current risk score from recent events
    const currentRiskScore = await this.calculateSessionRiskScore(
      session,
      recentEvents,
      behavioralProfile
    );

    // Update session with new risk score
    session.currentRiskScore = currentRiskScore;
    session.riskScoreHistory.push({
      timestamp: now,
      score: currentRiskScore,
    });
    session.lastMonitoredAt = now;

    // Keep only last 100 risk scores
    if (session.riskScoreHistory.length > 100) {
      session.riskScoreHistory = session.riskScoreHistory.slice(-100);
    }

    // Check for re-authentication requirement
    const hoursSinceLastReauth = (now.getTime() - session.lastReauthAt.getTime()) / (1000 * 60 * 60);
    const needsPeriodicReauth = hoursSinceLastReauth >= this.REAUTH_INTERVAL_HOURS;

    // Determine action based on risk score
    if (currentRiskScore >= this.RISK_THRESHOLD_TERMINATE) {
      session.status = AuthSessionStatus.TERMINATED;
      session.terminatedAt = now;
      session.terminationReason = 'Critical risk level detected';
      return {
        session,
        action: 'terminate',
        reason: 'Critical risk level - session terminated for security',
      };
    }

    if (currentRiskScore >= this.RISK_THRESHOLD_SUSPEND) {
      session.status = AuthSessionStatus.SUSPENDED;
      session.reauthRequired = true;
      session.reauthReason = 'High risk activity detected';
      return {
        session,
        action: 'suspend',
        reason: 'High risk detected - session suspended pending verification',
        challenge: this.createReauthChallenge('mfa', session.reauthReason!, RiskLevel.HIGH),
      };
    }

    if (currentRiskScore >= this.RISK_THRESHOLD_CHALLENGE || needsPeriodicReauth) {
      session.status = AuthSessionStatus.CHALLENGED;
      session.reauthRequired = true;
      session.reauthReason = needsPeriodicReauth
        ? 'Periodic re-authentication required'
        : 'Elevated risk detected';
      return {
        session,
        action: 'challenge',
        reason: session.reauthReason,
        challenge: this.createReauthChallenge(
          'mfa',
          session.reauthReason,
          currentRiskScore >= 0.6 ? RiskLevel.MEDIUM : RiskLevel.LOW
        ),
      };
    }

    // Session is healthy
    session.status = AuthSessionStatus.ACTIVE;
    session.reauthRequired = false;
    return { session, action: 'continue' };
  }

  /**
   * Handle successful re-authentication
   */
  handleSuccessfulReauth(session: ContinuousAuthSession): ContinuousAuthSession {
    const now = new Date();

    session.status = AuthSessionStatus.ACTIVE;
    session.reauthRequired = false;
    session.reauthReason = undefined;
    session.lastReauthAt = now;

    // Reduce risk score on successful reauth
    session.currentRiskScore = Math.max(0, session.currentRiskScore - 0.3);
    session.riskScoreHistory.push({
      timestamp: now,
      score: session.currentRiskScore,
    });

    return session;
  }

  /**
   * Handle failed re-authentication
   */
  handleFailedReauth(
    session: ContinuousAuthSession,
    attemptCount: number
  ): ContinuousAuthSession {
    const now = new Date();

    // Increase risk score on failed reauth
    session.currentRiskScore = Math.min(1.0, session.currentRiskScore + 0.2);
    session.riskScoreHistory.push({
      timestamp: now,
      score: session.currentRiskScore,
    });

    // Terminate after 3 failed attempts
    if (attemptCount >= 3) {
      session.status = AuthSessionStatus.TERMINATED;
      session.terminatedAt = now;
      session.terminationReason = 'Multiple failed re-authentication attempts';
    }

    return session;
  }

  /**
   * Calculate session risk score from recent events
   */
  private async calculateSessionRiskScore(
    session: ContinuousAuthSession,
    recentEvents: MonitoringEvent[],
    behavioralProfile?: BehavioralProfile
  ): Promise<number> {
    let riskScore = 0;

    // Base risk from current risk score (weighted towards recent)
    riskScore += session.currentRiskScore * 0.3;

    // Check for behavioral anomalies in recent events
    const behavioralAnomalyCount = recentEvents.filter(e => e.behavioralAnomaly).length;
    const behavioralAnomalyRate = recentEvents.length > 0
      ? behavioralAnomalyCount / recentEvents.length
      : 0;

    riskScore += behavioralAnomalyRate * 0.25;

    // Check for rapid risk score increase
    if (session.riskScoreHistory.length >= 2) {
      const recentHistory = session.riskScoreHistory.slice(-5);
      const riskTrend = this.calculateRiskTrend(recentHistory);

      if (riskTrend > 0.1) {
        // Risk is increasing rapidly
        riskScore += 0.2;
      }
    }

    // Check for location changes
    const locationChanges = this.detectLocationChanges(recentEvents);
    if (locationChanges.suspiciousChange) {
      riskScore += 0.3;
    }

    // Check for device changes
    const deviceChanges = this.detectDeviceChanges(recentEvents, session.deviceFingerprintId);
    if (deviceChanges.suspiciousChange) {
      riskScore += 0.4;
    }

    // Session age factor (older sessions are riskier)
    const sessionAgeHours = (Date.now() - session.createdAt.getTime()) / (1000 * 60 * 60);
    if (sessionAgeHours > 24) {
      riskScore += Math.min((sessionAgeHours - 24) / 100, 0.2);
    }

    // Check time since last reauth
    const hoursSinceReauth = (Date.now() - session.lastReauthAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceReauth > this.REAUTH_INTERVAL_HOURS) {
      riskScore += 0.15;
    }

    return Math.min(riskScore, 1.0);
  }

  /**
   * Calculate risk trend from history
   */
  private calculateRiskTrend(
    history: Array<{ timestamp: Date, score: number }>
  ): number {
    if (history.length < 2) return 0;

    const first = history[0].score;
    const last = history[history.length - 1].score;

    return last - first;
  }

  /**
   * Detect suspicious location changes
   */
  private detectLocationChanges(
    events: MonitoringEvent[]
  ): { suspiciousChange: boolean, reason?: string } {
    const isLocationPoint = (value: unknown): value is { latitude: number, longitude: number, timestamp: Date | string | number } => {
      if (!value || typeof value !== 'object') return false;
      const record = value as Record<string, unknown>;
      return (
        typeof record.latitude === 'number' &&
        typeof record.longitude === 'number' &&
        (record.timestamp instanceof Date || typeof record.timestamp === 'string' || typeof record.timestamp === 'number')
      );
    };

    const locationEvents = events.filter(e =>
      e.eventType === 'location_change' && e.eventData.newLocation
    );

    if (locationEvents.length === 0) {
      return { suspiciousChange: false };
    }

    // Check for impossible travel
    for (let i = 1; i < locationEvents.length; i++) {
      const prev = locationEvents[i - 1];
      const curr = locationEvents[i];

      const prevLoc = prev.eventData.oldLocation;
      const currLoc = curr.eventData.newLocation;

      if (isLocationPoint(prevLoc) && isLocationPoint(currLoc)) {
        const isImpossible = this.riskEngine.detectImpossibleTravel(
          { latitude: prevLoc.latitude, longitude: prevLoc.longitude, timestamp: new Date(prevLoc.timestamp) },
          { latitude: currLoc.latitude, longitude: currLoc.longitude, timestamp: new Date(currLoc.timestamp) }
        );

        if (isImpossible) {
          return {
            suspiciousChange: true,
            reason: 'Impossible travel detected',
          };
        }
      }
    }

    return { suspiciousChange: false };
  }

  /**
   * Detect suspicious device changes
   */
  private detectDeviceChanges(
    events: MonitoringEvent[],
    expectedDeviceId?: string
  ): { suspiciousChange: boolean, reason?: string } {
    const deviceEvents = events.filter(e =>
      e.eventType === 'device_change' && e.eventData.newDeviceId
    );

    if (deviceEvents.length === 0) {
      return { suspiciousChange: false };
    }

    // Check if device changed to unknown device
    for (const event of deviceEvents) {
      const newDeviceId = event.eventData.newDeviceId as string;
      if (newDeviceId !== expectedDeviceId) {
        return {
          suspiciousChange: true,
          reason: 'Session switched to unknown device',
        };
      }
    }

    return { suspiciousChange: false };
  }

  /**
   * Create re-authentication challenge
   */
  private createReauthChallenge(
    type: ReauthChallenge['type'],
    reason: string,
    riskLevel: RiskLevel
  ): ReauthChallenge {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minute expiry

    return {
      type,
      reason,
      riskLevel,
      expiresAt,
    };
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `cas_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Calculate session health score (0-100)
   */
  getSessionHealthScore(session: ContinuousAuthSession): number {
    // Inverse of risk score, scaled to 0-100
    return Math.round((1 - session.currentRiskScore) * 100);
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics(session: ContinuousAuthSession): {
    sessionDuration: number,
    riskTrend: 'increasing' | 'decreasing' | 'stable',
    averageRiskScore: number,
    reauthCount: number,
    healthScore: number,
  } {
    const sessionDuration = Date.now() - session.createdAt.getTime();

    const riskTrend = this.getRiskTrend(session.riskScoreHistory);

    const averageRiskScore = session.riskScoreHistory.length > 0
      ? session.riskScoreHistory.reduce((sum, h) => sum + h.score, 0) / session.riskScoreHistory.length
      : 0;

    // Count how many times risk score was reset (indicating reauth)
    const reauthCount = session.riskScoreHistory.filter((h, i) =>
      i > 0 && h.score < session.riskScoreHistory[i - 1].score - 0.2
    ).length;

    const healthScore = this.getSessionHealthScore(session);

    return {
      sessionDuration,
      riskTrend,
      averageRiskScore,
      reauthCount,
      healthScore,
    };
  }

  /**
   * Get risk trend from history
   */
  private getRiskTrend(
    history: Array<{ timestamp: Date, score: number }>
  ): 'increasing' | 'decreasing' | 'stable' {
    if (history.length < 3) return 'stable';

    const recentHistory = history.slice(-5);
    const trend = this.calculateRiskTrend(recentHistory);

    if (trend > 0.1) return 'increasing';
    if (trend < -0.1) return 'decreasing';
    return 'stable';
  }
}

// Singleton instance
let continuousAuthInstance: ContinuousAuthenticationSystem | null = null;

export function getContinuousAuthenticationSystem(): ContinuousAuthenticationSystem {
  if (!continuousAuthInstance) {
    continuousAuthInstance = new ContinuousAuthenticationSystem();
  }
  return continuousAuthInstance;
}
