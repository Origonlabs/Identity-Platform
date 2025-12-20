/**
 * Adaptive Policy Engine (APE) - Core
 *
 * This is the heart of Atlas Identity Platform Infinity's advanced security system.
 * It evaluates policies dynamically based on context, risk, and ML-powered insights.
 */

// Import Prisma enums once generated, or use local definitions
// import { PolicyAction, PolicyStatus, RiskLevel } from "@prisma/client";

// Local enum definitions (will be replaced by Prisma-generated types after migration)
export enum PolicyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TESTING = 'TESTING',
}

export enum PolicyAction {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
  REQUIRE_MFA = 'REQUIRE_MFA',
  REQUIRE_STEP_UP = 'REQUIRE_STEP_UP',
  CHALLENGE = 'CHALLENGE',
  NOTIFY_ADMIN = 'NOTIFY_ADMIN',
}

export enum RiskLevel {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export type PolicyContext = {
  userId: string,
  tenancyId: string,

  // Request context
  ipAddress?: string,
  userAgent?: string,
  deviceFingerprint?: string,

  // Geolocation
  geoLocation?: {
    country?: string,
    region?: string,
    city?: string,
    latitude?: number,
    longitude?: number,
  },

  // Time context
  timestamp: Date,
  dayOfWeek: number, // 0-6
  hourOfDay: number, // 0-23

  // Security context
  trustScore?: number,
  riskScore?: number,
  deviceTrustLevel?: number,

  // Session context
  sessionAge?: number, // minutes
  lastAuthTime?: Date,

  // Behavioral context
  typingPattern?: Record<string, unknown>,
  mousePattern?: Record<string, unknown>,

  // Additional metadata
  metadata?: Record<string, unknown>,
}

export type PolicyEvaluationResult = {
  decision: PolicyAction,
  riskScore: number,
  triggeredPolicies: string[],
  reasons: string[],
  requiresStepUp: boolean,
  recommendedActions: string[],
  executionTimeMs: number,
}

export type AdaptivePolicyDefinition = {
  id: string,
  name: string,
  status: PolicyStatus,
  policyCode: string,
  policyType: string,

  // ML settings
  mlModelId?: string,
  aiAnomalyDetectionEnabled: boolean,
  aiRiskScoringEnabled: boolean,

  // Thresholds
  riskThreshold: number,
  trustScoreMinimum: number,

  // Rules
  geofenceRules?: GeofenceRule[],
  timebasedRules?: TimebasedRule[],
  deviceTrustRules?: DeviceTrustRule[],
  networkTrustRules?: NetworkTrustRule[],

  // Actions
  actions: PolicyAction[],
  customActions?: Record<string, unknown>,
}

export type GeofenceRule = {
  type: 'allow' | 'deny',
  countries?: string[],
  regions?: string[],
  radius?: {
    latitude: number,
    longitude: number,
    radiusKm: number,
  },
}

export type TimebasedRule = {
  allowedHours?: { start: number, end: number },
  allowedDays?: number[], // 0-6
  timezone?: string,
}

export type DeviceTrustRule = {
  minimumTrustLevel: number,
  allowNewDevices: boolean,
  requireDeviceVerification: boolean,
}

export type NetworkTrustRule = {
  allowedNetworks?: string[], // CIDR notation
  blockedNetworks?: string[],
  allowVPN: boolean,
  allowTor: boolean,
  allowProxy: boolean,
}

/**
 * Adaptive Policy Engine
 *
 * Evaluates policies with context-aware, ML-powered decision making
 */
export class AdaptivePolicyEngine {
  private policies: Map<string, AdaptivePolicyDefinition> = new Map();

  constructor() {
    // Initialize with default policies
    this.initializeDefaultPolicies();
  }

  /**
   * Register a policy
   */
  registerPolicy(policy: AdaptivePolicyDefinition): void {
    this.policies.set(policy.id, policy);
  }

  /**
   * Unregister a policy
   */
  unregisterPolicy(policyId: string): void {
    this.policies.delete(policyId);
  }

  /**
   * Evaluate all active policies for a given context
   */
  async evaluate(context: PolicyContext): Promise<PolicyEvaluationResult> {
    const startTime = Date.now();

    const triggeredPolicies: string[] = [];
    const reasons: string[] = [];
    const recommendedActions: string[] = [];
    let maxRiskScore = 0;
    let finalDecision: PolicyAction = PolicyAction.ALLOW;
    let requiresStepUp = false;

    // Calculate initial risk score
    const contextRiskScore = await this.calculateContextRiskScore(context);
    maxRiskScore = Math.max(maxRiskScore, contextRiskScore);

    // Evaluate each active policy
    for (const [policyId, policy] of this.policies) {
      if (policy.status !== PolicyStatus.ACTIVE) {
        continue;
      }

      const policyResult = await this.evaluatePolicy(policy, context, contextRiskScore);

      if (policyResult.triggered) {
        triggeredPolicies.push(policyId);
        reasons.push(...policyResult.reasons);

        maxRiskScore = Math.max(maxRiskScore, policyResult.riskScore);

        // Determine most restrictive action
        finalDecision = this.getMostRestrictiveAction(finalDecision, policyResult.action);

        if (policyResult.action === PolicyAction.REQUIRE_STEP_UP ||
            policyResult.action === PolicyAction.REQUIRE_MFA) {
          requiresStepUp = true;
        }

        if (policyResult.action === PolicyAction.DENY) {
          // If any policy denies, we deny immediately
          finalDecision = PolicyAction.DENY;
          break;
        }
      }
    }

    // ML-powered risk assessment (if enabled)
    if (maxRiskScore > 0.7) {
      requiresStepUp = true;
      reasons.push('High risk score detected');
    }

    // Generate recommended actions
    if (requiresStepUp) {
      recommendedActions.push('require_additional_verification');
    }

    if (maxRiskScore > 0.5) {
      recommendedActions.push('monitor_session_closely');
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      decision: finalDecision,
      riskScore: maxRiskScore,
      triggeredPolicies,
      reasons,
      requiresStepUp,
      recommendedActions,
      executionTimeMs,
    };
  }

  /**
   * Evaluate a single policy
   */
  private async evaluatePolicy(
    policy: AdaptivePolicyDefinition,
    context: PolicyContext,
    contextRiskScore: number
  ): Promise<{
    triggered: boolean,
    action: PolicyAction,
    riskScore: number,
    reasons: string[],
  }> {
    const reasons: string[] = [];
    let triggered = false;
    let action = PolicyAction.ALLOW;
    let riskScore = contextRiskScore;

    // Evaluate geofence rules
    if (policy.geofenceRules && policy.geofenceRules.length > 0) {
      const geoResult = this.evaluateGeofenceRules(policy.geofenceRules, context);
      if (geoResult.violated) {
        triggered = true;
        reasons.push(geoResult.reason);
        riskScore += 0.2;
      }
    }

    // Evaluate time-based rules
    if (policy.timebasedRules && policy.timebasedRules.length > 0) {
      const timeResult = this.evaluateTimebasedRules(policy.timebasedRules, context);
      if (timeResult.violated) {
        triggered = true;
        reasons.push(timeResult.reason);
        riskScore += 0.1;
      }
    }

    // Evaluate device trust rules
    if (policy.deviceTrustRules && policy.deviceTrustRules.length > 0) {
      const deviceResult = this.evaluateDeviceTrustRules(policy.deviceTrustRules, context);
      if (deviceResult.violated) {
        triggered = true;
        reasons.push(deviceResult.reason);
        riskScore += 0.3;
      }
    }

    // Evaluate trust score
    if (context.trustScore !== undefined && context.trustScore < policy.trustScoreMinimum) {
      triggered = true;
      reasons.push(`Trust score ${context.trustScore} below minimum ${policy.trustScoreMinimum}`);
      riskScore += 0.2;
    }

    // Evaluate risk threshold
    if (riskScore >= policy.riskThreshold) {
      triggered = true;
      reasons.push(`Risk score ${riskScore.toFixed(2)} exceeds threshold ${policy.riskThreshold}`);

      // Determine action based on risk level
      if (riskScore >= 0.8) {
        action = PolicyAction.DENY;
      } else if (riskScore >= 0.6) {
        action = PolicyAction.REQUIRE_STEP_UP;
      } else if (riskScore >= 0.4) {
        action = PolicyAction.REQUIRE_MFA;
      } else {
        action = PolicyAction.CHALLENGE;
      }
    }

    // Use policy-defined actions if available
    if (triggered && policy.actions.length > 0) {
      action = policy.actions[0]; // Use first action (can be extended for multiple)
    }

    return {
      triggered,
      action,
      riskScore: Math.min(riskScore, 1.0),
      reasons,
    };
  }

  /**
   * Calculate context-based risk score
   */
  private async calculateContextRiskScore(context: PolicyContext): Promise<number> {
    let riskScore = 0;

    // Base risk from context risk score
    if (context.riskScore !== undefined) {
      riskScore += context.riskScore * 0.4;
    }

    // Device trust contribution
    if (context.deviceTrustLevel !== undefined) {
      const deviceRisk = (1 - context.deviceTrustLevel) * 0.3;
      riskScore += deviceRisk;
    }

    // New device penalty
    if (!context.deviceFingerprint) {
      riskScore += 0.1;
    }

    // Session age factor
    if (context.sessionAge && context.sessionAge > 480) { // > 8 hours
      riskScore += 0.1;
    }

    // Time-based risk (late night activity)
    if (context.hourOfDay < 6 || context.hourOfDay > 23) {
      riskScore += 0.05;
    }

    // Trust score inverse contribution
    if (context.trustScore !== undefined) {
      const trustRisk = (1 - context.trustScore) * 0.2;
      riskScore += trustRisk;
    }

    return Math.min(riskScore, 1.0);
  }

  /**
   * Evaluate geofence rules
   */
  private evaluateGeofenceRules(
    rules: GeofenceRule[],
    context: PolicyContext
  ): { violated: boolean, reason: string } {
    for (const rule of rules) {
      if (rule.countries && context.geoLocation?.country) {
        const allowed = rule.type === 'allow'
          ? rule.countries.includes(context.geoLocation.country)
          : !rule.countries.includes(context.geoLocation.country);

        if (!allowed) {
          return {
            violated: true,
            reason: `Location ${context.geoLocation.country} violates geofence policy`,
          };
        }
      }

      // Radius-based geofence
      if (rule.radius && context.geoLocation?.latitude && context.geoLocation.longitude) {
        const distance = this.calculateDistance(
          context.geoLocation.latitude,
          context.geoLocation.longitude,
          rule.radius.latitude,
          rule.radius.longitude
        );

        if (distance > rule.radius.radiusKm) {
          return {
            violated: true,
            reason: `Location is ${distance.toFixed(2)}km from allowed area`,
          };
        }
      }
    }

    return { violated: false, reason: '' };
  }

  /**
   * Evaluate time-based rules
   */
  private evaluateTimebasedRules(
    rules: TimebasedRule[],
    context: PolicyContext
  ): { violated: boolean, reason: string } {
    for (const rule of rules) {
      if (rule.allowedHours) {
        const { start, end } = rule.allowedHours;
        const hour = context.hourOfDay;

        const allowed = (start <= end)
          ? (hour >= start && hour <= end)
          : (hour >= start || hour <= end); // Wraps around midnight

        if (!allowed) {
          return {
            violated: true,
            reason: `Access outside allowed hours (${start}-${end})`,
          };
        }
      }

      if (rule.allowedDays && !rule.allowedDays.includes(context.dayOfWeek)) {
        return {
          violated: true,
          reason: `Access not allowed on this day of week`,
        };
      }
    }

    return { violated: false, reason: '' };
  }

  /**
   * Evaluate device trust rules
   */
  private evaluateDeviceTrustRules(
    rules: DeviceTrustRule[],
    context: PolicyContext
  ): { violated: boolean, reason: string } {
    for (const rule of rules) {
      if (context.deviceTrustLevel !== undefined) {
        if (context.deviceTrustLevel < rule.minimumTrustLevel) {
          return {
            violated: true,
            reason: `Device trust level ${context.deviceTrustLevel} below minimum ${rule.minimumTrustLevel}`,
          };
        }
      }

      if (!rule.allowNewDevices && !context.deviceFingerprint) {
        return {
          violated: true,
          reason: 'New devices not allowed',
        };
      }
    }

    return { violated: false, reason: '' };
  }

  /**
   * Get the most restrictive action
   */
  private getMostRestrictiveAction(
    action1: PolicyAction,
    action2: PolicyAction
  ): PolicyAction {
    const hierarchy = [
      PolicyAction.ALLOW,
      PolicyAction.CHALLENGE,
      PolicyAction.REQUIRE_MFA,
      PolicyAction.REQUIRE_STEP_UP,
      PolicyAction.NOTIFY_ADMIN,
      PolicyAction.DENY,
    ];

    const index1 = hierarchy.indexOf(action1);
    const index2 = hierarchy.indexOf(action2);

    return index1 > index2 ? action1 : action2;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Initialize default policies
   */
  private initializeDefaultPolicies(): void {
    // Default high-risk login policy
    this.registerPolicy({
      id: 'default-high-risk-login',
      name: 'High Risk Login Protection',
      status: PolicyStatus.ACTIVE,
      policyCode: 'if (riskScore > 0.7) { requireMFA(); }',
      policyType: 'authentication',
      aiAnomalyDetectionEnabled: true,
      aiRiskScoringEnabled: true,
      riskThreshold: 0.7,
      trustScoreMinimum: 0.3,
      actions: [PolicyAction.REQUIRE_MFA],
    });

    // Default impossible travel policy
    this.registerPolicy({
      id: 'default-impossible-travel',
      name: 'Impossible Travel Detection',
      status: PolicyStatus.ACTIVE,
      policyCode: 'if (impossibleTravel) { deny(); }',
      policyType: 'continuous_auth',
      aiAnomalyDetectionEnabled: true,
      aiRiskScoringEnabled: true,
      riskThreshold: 0.9,
      trustScoreMinimum: 0.0,
      actions: [PolicyAction.DENY],
    });
  }
}

// Singleton instance
let policyEngineInstance: AdaptivePolicyEngine | null = null;

export function getAdaptivePolicyEngine(): AdaptivePolicyEngine {
  if (!policyEngineInstance) {
    policyEngineInstance = new AdaptivePolicyEngine();
  }
  return policyEngineInstance;
}
