export interface ZKProof {
  proof: string;
  publicSignals: string[];
  circuit: string;
}

export interface ZKVerificationResult {
  valid: boolean;
  verifiedAttributes: string[];
  timestamp: Date;
}

export interface PrivacyPreservingClaim {
  attribute: string;
  value: string;
  proof: ZKProof;
  schema: string;
}

export interface ZKAuthRequest {
  userId: string;
  requiredAttributes: string[];
  optionalAttributes?: string[];
  context?: Record<string, unknown>;
}
