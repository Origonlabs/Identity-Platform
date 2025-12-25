export interface ContinuousAuthContext {
  userId: string;
  sessionId: string;
  timestamp: Date;
  action: string;
  behavioralData?: {
    keystroke?: unknown;
    mouse?: unknown;
    typing?: unknown;
  };
  networkData?: {
    ip: string;
    location?: string;
  };
  deviceData?: {
    fingerprint: string;
    trusted: boolean;
  };
}

export interface ContinuousAuthResult {
  authenticated: boolean;
  confidence: number;
  riskScore: number;
  requiredAction?: 'reauthenticate' | 'step_up' | 'block';
  reason?: string;
}

export interface SessionRiskProfile {
  sessionId: string;
  userId: string;
  riskScore: number;
  riskFactors: string[];
  lastVerified: Date;
  verificationCount: number;
}
