export interface Session {
  id: string;
  userId: string;
  deviceId?: string;
  ip: string;
  userAgent: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  metadata: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high';
  mfaVerified: boolean;
  location?: {
    country: string;
    region: string;
    city: string;
  };
}

export interface SessionPolicy {
  maxDuration: number;
  idleTimeout: number;
  requireReauth: boolean;
  maxConcurrentSessions: number;
  allowedIPs?: string[];
  blockedIPs?: string[];
  requireMFA: boolean;
  riskBasedTimeout: boolean;
}

export interface SessionActivity {
  sessionId: string;
  action: string;
  timestamp: Date;
  ip: string;
  metadata: Record<string, unknown>;
}
