import type { RecoveryAction, ServiceHealth, HealthIssue } from './types';
import { HealthMonitor } from './health-monitor';

export class AutoRecoveryService {
  private readonly recoveryActions: RecoveryAction[] = [];
  private readonly healthMonitor: HealthMonitor;

  constructor(healthMonitor: HealthMonitor) {
    this.healthMonitor = healthMonitor;
  }

  async attemptRecovery(serviceId: string, issue: HealthIssue): Promise<RecoveryAction | null> {
    const health = this.healthMonitor.getHealth(serviceId);
    if (!health) return null;

    let action: RecoveryAction | null = null;

    switch (issue.type) {
      case 'latency':
        action = await this.handleLatencyIssue(serviceId, issue);
        break;
      case 'errors':
        action = await this.handleErrorIssue(serviceId, issue);
        break;
      case 'availability':
        action = await this.handleAvailabilityIssue(serviceId, issue);
        break;
      case 'resource':
        action = await this.handleResourceIssue(serviceId, issue);
        break;
    }

    if (action) {
      this.recoveryActions.push(action);
    }

    return action;
  }

  private async handleLatencyIssue(serviceId: string, issue: HealthIssue): Promise<RecoveryAction> {
    return {
      type: 'scale_up',
      serviceId,
      executedAt: new Date(),
      success: true,
    };
  }

  private async handleErrorIssue(serviceId: string, issue: HealthIssue): Promise<RecoveryAction> {
    if (issue.severity === 'critical') {
      return {
        type: 'restart',
        serviceId,
        executedAt: new Date(),
        success: true,
      };
    }

    return {
      type: 'circuit_breaker',
      serviceId,
      executedAt: new Date(),
      success: true,
    };
  }

  private async handleAvailabilityIssue(serviceId: string, issue: HealthIssue): Promise<RecoveryAction> {
    return {
      type: 'scale_up',
      serviceId,
      executedAt: new Date(),
      success: true,
    };
  }

  private async handleResourceIssue(serviceId: string, issue: HealthIssue): Promise<RecoveryAction> {
    return {
      type: 'scale_up',
      serviceId,
      executedAt: new Date(),
      success: true,
    };
  }

  getRecoveryHistory(serviceId?: string): RecoveryAction[] {
    if (serviceId) {
      return this.recoveryActions.filter((a) => a.serviceId === serviceId);
    }
    return this.recoveryActions;
  }
}
