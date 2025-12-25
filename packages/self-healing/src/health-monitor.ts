import type { ServiceHealth, HealthIssue } from './types';

export class HealthMonitor {
  private readonly services = new Map<string, ServiceHealth>();

  updateHealth(serviceId: string, health: Partial<ServiceHealth>): void {
    const current = this.services.get(serviceId) || {
      serviceId,
      status: 'healthy',
      lastCheck: new Date(),
      metrics: {
        responseTime: 0,
        errorRate: 0,
        availability: 100,
      },
      issues: [],
    };

    const updated: ServiceHealth = {
      ...current,
      ...health,
      lastCheck: new Date(),
    };

    updated.status = this.determineStatus(updated);
    this.services.set(serviceId, updated);
  }

  getHealth(serviceId: string): ServiceHealth | undefined {
    return this.services.get(serviceId);
  }

  getAllHealth(): ServiceHealth[] {
    return Array.from(this.services.values());
  }

  detectIssues(serviceId: string): HealthIssue[] {
    const health = this.services.get(serviceId);
    if (!health) return [];

    const issues: HealthIssue[] = [];

    if (health.metrics.responseTime > 1000) {
      issues.push({
        type: 'latency',
        severity: health.metrics.responseTime > 5000 ? 'critical' : 'high',
        description: `High response time: ${health.metrics.responseTime}ms`,
        detectedAt: new Date(),
      });
    }

    if (health.metrics.errorRate > 0.05) {
      issues.push({
        type: 'errors',
        severity: health.metrics.errorRate > 0.2 ? 'critical' : 'high',
        description: `High error rate: ${(health.metrics.errorRate * 100).toFixed(2)}%`,
        detectedAt: new Date(),
      });
    }

    if (health.metrics.availability < 95) {
      issues.push({
        type: 'availability',
        severity: health.metrics.availability < 80 ? 'critical' : 'medium',
        description: `Low availability: ${health.metrics.availability.toFixed(2)}%`,
        detectedAt: new Date(),
      });
    }

    return issues;
  }

  private determineStatus(health: ServiceHealth): ServiceHealth['status'] {
    if (health.metrics.availability < 50) return 'down';
    if (health.metrics.errorRate > 0.2 || health.metrics.availability < 80) return 'unhealthy';
    if (health.metrics.responseTime > 2000 || health.metrics.errorRate > 0.05) return 'degraded';
    return 'healthy';
  }
}
