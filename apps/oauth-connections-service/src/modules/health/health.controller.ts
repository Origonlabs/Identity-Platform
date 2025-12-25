import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './health-indicator.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async getHealth() {
    return this.health.check([
      () => this.db.isHealthy('database'),
    ]);
  }

  @Get('liveness')
  async liveness() {
    return { status: 'ok' };
  }

  @Get('readiness')
  @HealthCheck()
  async readiness() {
    return this.health.check([
      () => this.db.isHealthy('database'),
    ]);
  }
}
