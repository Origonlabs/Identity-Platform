export interface RiskScore {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
}

export class RiskScoringEngine {
  constructor();
  calculateRisk(data: any): Promise<RiskScore>;
}

export class BehavioralAnalyticsService {
  constructor();
  analyzePattern(data: any): Promise<any>;
}

export class DeviceFingerprintingService {
  constructor();
  generateFingerprint(data: any): Promise<string>;
}

export class FraudDetectionService {
  constructor(riskEngine: RiskScoringEngine, behavioral: BehavioralAnalyticsService, deviceFP: DeviceFingerprintingService);
  detectFraud(data: any): Promise<boolean>;
}

export class AdaptiveAuthenticationService {
  constructor(riskEngine: RiskScoringEngine, fraudDetection: FraudDetectionService);
  authenticate(data: any): Promise<boolean>;
}

export class SecurityMiddleware {
  constructor(config?: any);
  validateRequest(req: any): Promise<boolean>;
}

export function createSecurityMiddleware(config?: any): SecurityMiddleware;
export function sanitizeInput(input: string): string;
export function validateCSRFToken(token: string, secret: string): boolean;
