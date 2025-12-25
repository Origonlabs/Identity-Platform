export interface ZeroTrustContext {
  user: {
    id: string;
    role: string;
    permissions: string[];
    mfaVerified: boolean;
    riskScore: number;
  };
  device: {
    id: string;
    fingerprint: string;
    trusted: boolean;
    complianceStatus: 'compliant' | 'non-compliant' | 'unknown';
  };
  network: {
    ip: string;
    location: string;
    vpn: boolean;
    proxy: boolean;
    tor: boolean;
  };
  resource: {
    id: string;
    sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
    requiredPermissions: string[];
  };
  session: {
    id: string;
    age: number;
    lastActivity: Date;
  };
}

export interface ZeroTrustPolicy {
  id: string;
  name: string;
  rules: PolicyRule[];
  priority: number;
}

export interface PolicyRule {
  condition: (context: ZeroTrustContext) => boolean;
  action: 'allow' | 'deny' | 'require_mfa' | 'require_approval' | 'audit';
  reason: string;
}

export interface VerificationResult {
  allowed: boolean;
  requiredActions: string[];
  confidence: number;
  reason: string;
  expiresAt: Date;
}
