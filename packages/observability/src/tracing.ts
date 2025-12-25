import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import * as api from '@opentelemetry/api';

export interface TracingConfig {
  serviceName: string;
  serviceVersion?: string;
  endpoint?: string;
  enabled?: boolean;
}

let sdk: NodeSDK | null = null;

export function initializeTracing(config: TracingConfig): void {
  if (config.enabled === false) {
    return;
  }

  if (sdk) {
    console.warn('Tracing already initialized');
    return;
  }

  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: config.serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: config.serviceVersion || '0.1.0',
  });

  sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({
      url: config.endpoint || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  console.log(`Tracing initialized for service: ${config.serviceName}`);
}

export function shutdownTracing(): Promise<void> {
  if (sdk) {
    return sdk.shutdown().then(() => {
      sdk = null;
    });
  }
  return Promise.resolve();
}

export function getTracer(name: string): api.Tracer {
  return api.trace.getTracer(name);
}

export function startSpan<T>(
  name: string,
  fn: (span: api.Span) => Promise<T>,
  options?: api.SpanOptions
): Promise<T> {
  const tracer = getTracer('default');
  return tracer.startActiveSpan(name, options || {}, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: api.SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: api.SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  });
}
