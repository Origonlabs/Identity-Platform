import {
    Counter,
    Histogram,
    Meter,
    UpDownCounter,
    metrics,
} from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

export interface MetricsConfig {
  serviceName: string;
  serviceVersion?: string;
  endpoint?: string;
  exportIntervalMillis?: number;
  enabled?: boolean;
}

let meterProvider: MeterProvider | null = null;

export function initializeMetrics(config: MetricsConfig): void {
  if (config.enabled === false) {
    return;
  }

  if (meterProvider) {
    console.warn('Metrics already initialized');
    return;
  }

  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: config.serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: config.serviceVersion || '0.1.0',
  });

  meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: config.endpoint || process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
        }),
        exportIntervalMillis: config.exportIntervalMillis || 10000,
      }),
    ],
  });

  metrics.setGlobalMeterProvider(meterProvider);
  console.log(`Metrics initialized for service: ${config.serviceName}`);
}

export function shutdownMetrics(): Promise<void> {
  if (meterProvider) {
    return meterProvider.shutdown().then(() => {
      meterProvider = null;
    });
  }
  return Promise.resolve();
}

export function getMeter(name: string): Meter {
  return metrics.getMeter(name);
}

export function createCounter(name: string, description?: string): Counter {
  const meter = getMeter('default');
  return meter.createCounter(name, {
    description: description || name,
  });
}

export function createHistogram(name: string, description?: string): Histogram {
  const meter = getMeter('default');
  return meter.createHistogram(name, {
    description: description || name,
  });
}

export function createGauge(name: string, description?: string): UpDownCounter {
  const meter = getMeter('default');
  return meter.createUpDownCounter(name, {
    description: description || name,
  });
}
