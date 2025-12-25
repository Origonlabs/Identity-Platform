import { initializeTracing, shutdownTracing } from './tracing';
import { initializeMetrics, shutdownMetrics } from './metrics';
import { initializeLogging } from './logging';
import type { TracingConfig } from './tracing';
import type { MetricsConfig } from './metrics';

export interface ObservabilityConfig {
  serviceName: string;
  serviceVersion?: string;
  tracing?: TracingConfig;
  metrics?: MetricsConfig;
  logging?: {
    enabled?: boolean;
  };
}

export function initializeObservability(config: ObservabilityConfig): void {
  if (config.tracing !== undefined) {
    initializeTracing({
      ...config.tracing,
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion,
    });
  }

  if (config.metrics !== undefined) {
    initializeMetrics({
      ...config.metrics,
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion,
    });
  }

  if (config.logging?.enabled !== false) {
    initializeLogging(config.serviceName, config.serviceVersion);
  }
}

export async function shutdownObservability(): Promise<void> {
  await Promise.all([shutdownTracing(), shutdownMetrics()]);
}
