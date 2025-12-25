import { Controller, Get } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { Registry, collectDefaultMetrics, register } from 'prom-client';

@Controller('metrics')
export class MetricsController {
  private readonly registry: Registry;

  constructor(private readonly metricsService: MetricsService) {
    this.registry = register;
    collectDefaultMetrics({ register: this.registry });
  }

  @Get()
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
