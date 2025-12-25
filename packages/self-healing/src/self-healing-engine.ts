import { HealthMonitor } from './health-monitor';
import { AutoRecoveryService } from './auto-recovery';
import type { ServiceHealth, HealthIssue, RecoveryAction } from './types';

export class SelfHealingEngine {
  private readonly healthMonitor: HealthMonitor;
  private readonly recoveryService: AutoRecoveryService;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.healthMonitor = new HealthMonitor();
    this.recoveryService = new AutoRecoveryService(this.healthMonitor);
  }

  start(intervalMs: number = 30000): void {
    this.monitoringInterval = setInterval(() => {
      this.checkAndRecover().catch((error) => {
        console.error('Self-healing check failed:', error);
      });
    }, intervalMs);
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  async updateServiceHealth(serviceId: string, health: Partial<ServiceHealth>): Promise<void> {
    this.healthMonitor.updateHealth(serviceId, health);
  }

  async checkAndRecover(): Promise<void> {
    const allHealth = this.healthMonitor.getAllHealth();

    for (const health of allHealth) {
      if (health.status === 'healthy') continue;

      const issues = this.healthMonitor.detectIssues(health.serviceId);
      
      for (const issue of issues) {
        if (issue.severity === 'critical' || issue.severity === 'high') {
          await this.recoveryService.attemptRecovery(health.serviceId, issue);
        }
      }
    }
  }

  getHealth(serviceId: string): ServiceHealth | undefined {
    return this.healthMonitor.getHealth(serviceId);
  }

  getRecoveryHistory(serviceId?: string): RecoveryAction[] {
    return this.recoveryService.getRecoveryHistory(serviceId);
  }
}
