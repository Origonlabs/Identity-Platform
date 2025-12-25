export interface RiskScore {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  recommendations: string[];
}

export interface RiskFactor {
  type: string;
  weight: number;
  value: number;
  description: string;
}

export interface DeviceFingerprint {
  id: string;
  browser: string;
  os: string;
  device: string;
  screen: string;
  timezone: string;
  language: string;
  plugins: string[];
  canvas: string;
  webgl: string;
  audio: string;
  fonts: string[];
  ip: string;
  userAgent: string;
  createdAt: Date;
}

export interface BehavioralPattern {
  userId: string;
  loginFrequency: number;
  averageSessionDuration: number;
  typicalLoginHours: number[];
  typicalLocations: string[];
  deviceTypes: string[];
  browserTypes: string[];
  lastLogin: Date;
  lastLocation: string;
  anomalyScore: number;
}

export interface FraudIndicator {
  type: 'velocity' | 'geolocation' | 'device' | 'behavior' | 'pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface AuthenticationContext {
  userId?: string;
  email?: string;
  ip: string;
  userAgent: string;
  deviceFingerprint?: DeviceFingerprint;
  location?: {
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
  sessionId?: string;
  previousAttempts?: number;
  mfaEnabled?: boolean;
}
