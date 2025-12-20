/**
 * Risk Scoring Engine
 *
 * Advanced ML-powered risk assessment for authentication events
 * Detects anomalies, impossible travel, credential stuffing, and more
 */

// Import Prisma enum once generated, or use local definition
// import { RiskLevel } from "@prisma/client";
import { RiskLevel } from "./adaptive-policy-engine";

export type RiskSignals = {
  // Location signals
  newLocation: boolean,
  impossibleTravel: boolean,
  highRiskCountry: boolean,
  vpnDetected: boolean,
  torDetected: boolean,

  // Device signals
  newDevice: boolean,
  deviceFingerprintMismatch: boolean,
  suspiciousUserAgent: boolean,

  // Behavioral signals
  typingPatternAnomaly: boolean,
  mousePatternAnomaly: boolean,
  navigationAnomaly: boolean,

  // Temporal signals
  unusualTime: boolean,
  rapidSuccessiveAttempts: boolean,
  velocityAnomaly: boolean,

  // Credential signals
  passwordSpray: boolean,
  credentialStuffing: boolean,
  bruteForceAttempt: boolean,

  // Account signals
  accountAge: number, // days
  accountCompromised: boolean,
  suspiciousActivity: boolean,
}

export type RiskFactors = {
  factor: string,
  weight: number,
  contribution: number,
  description: string,
}

export type RiskAssessmentResult = {
  riskScore: number, // 0.0 - 1.0
  riskLevel: RiskLevel,
  confidence: number, // 0.0 - 1.0
  signals: RiskSignals,
  riskFactors: RiskFactors[],
  recommendations: string[],
  modelVersion: string,
}

export class RiskScoringEngine {
  private readonly modelVersion = "1.0.0";

  // Risk weights for different signals
  private readonly weights = {
    impossibleTravel: 0.9,
    accountCompromised: 0.95,
    credentialStuffing: 0.85,
    bruteForceAttempt: 0.8,
    newDevice: 0.3,
    newLocation: 0.25,
    vpnDetected: 0.15,
    torDetected: 0.4,
    highRiskCountry: 0.35,
    deviceFingerprintMismatch: 0.5,
    suspiciousUserAgent: 0.2,
    typingPatternAnomaly: 0.4,
    mousePatternAnomaly: 0.35,
    navigationAnomaly: 0.3,
    unusualTime: 0.1,
    rapidSuccessiveAttempts: 0.45,
    velocityAnomaly: 0.6,
    passwordSpray: 0.75,
    suspiciousActivity: 0.5,
  };

  /**
   * Assess risk for an authentication event
   */
  async assessRisk(signals: Partial<RiskSignals>): Promise<RiskAssessmentResult> {
    const completeSignals = this.fillDefaultSignals(signals);
    const riskFactors: RiskFactors[] = [];
    let totalRiskScore = 0;

    // Calculate risk score from each signal
    for (const [signal, value] of Object.entries(completeSignals)) {
      if (typeof value === 'boolean' && value === true) {
        const weight = (this.weights as Record<string, number | undefined>)[signal];
        if (weight === undefined) continue;
        const contribution = weight;
        totalRiskScore += contribution;

        riskFactors.push({
          factor: signal,
          weight,
          contribution,
          description: this.getSignalDescription(signal),
        });
      }
    }

    // Account age factor (newer accounts are riskier)
    if (completeSignals.accountAge < 7) {
      const ageFactor = Math.max(0, (7 - completeSignals.accountAge) / 7) * 0.3;
      totalRiskScore += ageFactor;
      riskFactors.push({
        factor: 'accountAge',
        weight: 0.3,
        contribution: ageFactor,
        description: `Account is ${completeSignals.accountAge} days old`,
      });
    }

    // Normalize score to 0-1 range
    const normalizedScore = Math.min(totalRiskScore, 1.0);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(normalizedScore);

    // Calculate confidence based on number of signals
    const confidence = this.calculateConfidence(riskFactors.length);

    // Generate recommendations
    const recommendations = this.generateRecommendations(normalizedScore, completeSignals);

    return {
      riskScore: normalizedScore,
      riskLevel,
      confidence,
      signals: completeSignals,
      riskFactors,
      recommendations,
      modelVersion: this.modelVersion,
    };
  }

  /**
   * Detect impossible travel
   */
  detectImpossibleTravel(
    previousLocation: { latitude: number, longitude: number, timestamp: Date },
    currentLocation: { latitude: number, longitude: number, timestamp: Date }
  ): boolean {
    const distance = this.calculateDistance(
      previousLocation.latitude,
      previousLocation.longitude,
      currentLocation.latitude,
      currentLocation.longitude
    );

    const timeDiffHours = (currentLocation.timestamp.getTime() - previousLocation.timestamp.getTime()) / (1000 * 60 * 60);

    // Maximum possible speed (considering fastest commercial flights + some buffer)
    const maxSpeedKmh = 1000; // ~900 km/h for commercial flight + buffer

    const requiredSpeed = distance / timeDiffHours;

    return requiredSpeed > maxSpeedKmh;
  }

  /**
   * Detect credential stuffing patterns
   */
  detectCredentialStuffing(
    failedAttempts: number,
    timeWindowMinutes: number,
    uniqueUsernames: number
  ): boolean {
    // Multiple usernames tried in short time = credential stuffing
    if (uniqueUsernames > 5 && timeWindowMinutes < 10) {
      return true;
    }

    // High volume of failures in short time
    if (failedAttempts > 20 && timeWindowMinutes < 5) {
      return true;
    }

    return false;
  }

  /**
   * Detect brute force attempts
   */
  detectBruteForce(
    failedAttempts: number,
    timeWindowMinutes: number,
    sameUsername: boolean
  ): boolean {
    // Same username, many attempts = brute force
    if (sameUsername && failedAttempts > 10 && timeWindowMinutes < 15) {
      return true;
    }

    // Very rapid attempts
    if (failedAttempts > 5 && timeWindowMinutes < 2) {
      return true;
    }

    return false;
  }

  /**
   * Detect password spray attacks
   */
  detectPasswordSpray(
    attempts: Array<{ username: string, timestamp: Date }>,
    timeWindowMinutes: number
  ): boolean {
    const uniqueUsernames = new Set(attempts.map(a => a.username)).size;

    // Many different usernames with single/few attempts each = password spray
    if (uniqueUsernames > 10 && timeWindowMinutes < 30) {
      const attemptsPerUser = attempts.length / uniqueUsernames;
      if (attemptsPerUser <= 2) {
        return true;
      }
    }

    return false;
  }

  /**
   * Analyze behavioral biometrics
   */
  analyzeBehavioralBiometrics(
    baselinePattern: Record<string, unknown>,
    currentPattern: Record<string, unknown>,
    threshold: number = 0.7
  ): { isAnomaly: boolean, anomalyScore: number } {
    // Simple similarity calculation (can be replaced with ML model)
    const similarity = this.calculatePatternSimilarity(baselinePattern, currentPattern);
    const anomalyScore = 1 - similarity;

    return {
      isAnomaly: anomalyScore > threshold,
      anomalyScore,
    };
  }

  /**
   * Fill default values for signals
   */
  private fillDefaultSignals(signals: Partial<RiskSignals>): RiskSignals {
    return {
      newLocation: signals.newLocation ?? false,
      impossibleTravel: signals.impossibleTravel ?? false,
      highRiskCountry: signals.highRiskCountry ?? false,
      vpnDetected: signals.vpnDetected ?? false,
      torDetected: signals.torDetected ?? false,
      newDevice: signals.newDevice ?? false,
      deviceFingerprintMismatch: signals.deviceFingerprintMismatch ?? false,
      suspiciousUserAgent: signals.suspiciousUserAgent ?? false,
      typingPatternAnomaly: signals.typingPatternAnomaly ?? false,
      mousePatternAnomaly: signals.mousePatternAnomaly ?? false,
      navigationAnomaly: signals.navigationAnomaly ?? false,
      unusualTime: signals.unusualTime ?? false,
      rapidSuccessiveAttempts: signals.rapidSuccessiveAttempts ?? false,
      velocityAnomaly: signals.velocityAnomaly ?? false,
      passwordSpray: signals.passwordSpray ?? false,
      credentialStuffing: signals.credentialStuffing ?? false,
      bruteForceAttempt: signals.bruteForceAttempt ?? false,
      accountAge: signals.accountAge ?? 0,
      accountCompromised: signals.accountCompromised ?? false,
      suspiciousActivity: signals.suspiciousActivity ?? false,
    };
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 0.8) return RiskLevel.CRITICAL;
    if (score >= 0.6) return RiskLevel.HIGH;
    if (score >= 0.4) return RiskLevel.MEDIUM;
    if (score >= 0.2) return RiskLevel.LOW;
    return RiskLevel.VERY_LOW;
  }

  /**
   * Calculate confidence based on number of signals
   */
  private calculateConfidence(signalCount: number): number {
    // More signals = higher confidence
    // Cap at 0.95 (never 100% certain)
    return Math.min(0.5 + (signalCount * 0.1), 0.95);
  }

  /**
   * Generate recommendations based on risk assessment
   */
  private generateRecommendations(score: number, signals: RiskSignals): string[] {
    const recommendations: string[] = [];

    if (score >= 0.8) {
      recommendations.push('Deny access and alert security team');
      recommendations.push('Require account verification');
    } else if (score >= 0.6) {
      recommendations.push('Require step-up authentication');
      recommendations.push('Send security alert to user');
    } else if (score >= 0.4) {
      recommendations.push('Require MFA');
      recommendations.push('Monitor session closely');
    } else if (score >= 0.2) {
      recommendations.push('Enable continuous authentication');
    }

    if (signals.impossibleTravel) {
      recommendations.push('Verify recent location change with user');
    }

    if (signals.newDevice) {
      recommendations.push('Send device verification email');
    }

    if (signals.credentialStuffing || signals.bruteForceAttempt) {
      recommendations.push('Implement rate limiting');
      recommendations.push('Consider CAPTCHA challenge');
    }

    return recommendations;
  }

  /**
   * Get human-readable description for a signal
   */
  private getSignalDescription(signal: string): string {
    const descriptions: Record<string, string> = {
      impossibleTravel: 'User appeared to travel impossibly fast between locations',
      accountCompromised: 'Account has been flagged as compromised',
      credentialStuffing: 'Detected credential stuffing attack pattern',
      bruteForceAttempt: 'Detected brute force login attempts',
      newDevice: 'Login from new device',
      newLocation: 'Login from new location',
      vpnDetected: 'VPN or proxy detected',
      torDetected: 'Tor network detected',
      highRiskCountry: 'Login from high-risk country',
      deviceFingerprintMismatch: 'Device fingerprint does not match known devices',
      suspiciousUserAgent: 'Suspicious user agent detected',
      typingPatternAnomaly: 'Typing pattern differs from baseline',
      mousePatternAnomaly: 'Mouse movement pattern differs from baseline',
      navigationAnomaly: 'Navigation pattern differs from baseline',
      unusualTime: 'Login at unusual time',
      rapidSuccessiveAttempts: 'Multiple rapid login attempts detected',
      velocityAnomaly: 'Abnormal login velocity detected',
      passwordSpray: 'Password spray attack detected',
      suspiciousActivity: 'Suspicious account activity detected',
    };

    return descriptions[signal] || signal;
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
   * Calculate similarity between two patterns
   * Returns value between 0 (completely different) and 1 (identical)
   */
  private calculatePatternSimilarity(
    pattern1: Record<string, unknown>,
    pattern2: Record<string, unknown>
  ): number {
    // Simple implementation - can be replaced with more sophisticated ML-based similarity
    const keys1 = Object.keys(pattern1);
    const keys2 = Object.keys(pattern2);

    if (keys1.length === 0 || keys2.length === 0) {
      return 0.5; // Neutral similarity if no data
    }

    const commonKeys = keys1.filter(key => keys2.includes(key));
    let matchingValues = 0;

    for (const key of commonKeys) {
      if (pattern1[key] === pattern2[key]) {
        matchingValues++;
      }
    }

    return matchingValues / Math.max(keys1.length, keys2.length);
  }
}

// Singleton instance
let riskEngineInstance: RiskScoringEngine | null = null;

export function getRiskScoringEngine(): RiskScoringEngine {
  if (!riskEngineInstance) {
    riskEngineInstance = new RiskScoringEngine();
  }
  return riskEngineInstance;
}
