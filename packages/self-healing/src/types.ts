export interface ServiceHealth {
  serviceId: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'down';
  lastCheck: Date;
  metrics: {
    responseTime: number;
    errorRate: number;
    availability: number;
  };
  issues: HealthIssue[];
}

export interface HealthIssue {
  type: 'latency' | 'errors' | 'availability' | 'resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
}

export interface RecoveryAction {
  type: 'restart' | 'scale_up' | 'scale_down' | 'rollback' | 'circuit_breaker' | 'cache_clear';
  serviceId: string;
  executedAt: Date;
  success: boolean;
  error?: string;
}
