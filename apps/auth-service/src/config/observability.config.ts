import { registerAs } from '@nestjs/config';

export const observabilityConfig = registerAs('observability', () => ({
  // Sentry
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '1.0'),
  },

  // OpenTelemetry
  opentelemetry: {
    enabled: process.env.OTEL_ENABLED === 'true',
    serviceName: process.env.OTEL_SERVICE_NAME || 'auth-service',
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',

    // Tracing
    tracing: {
      sampleRate: parseFloat(process.env.OTEL_TRACES_SAMPLE_RATE || '1.0'),
    },

    // Metrics
    metrics: {
      enabled: process.env.OTEL_METRICS_ENABLED === 'true',
      interval: parseInt(process.env.OTEL_METRICS_INTERVAL || '60000', 10), // 1 minute
    },
  },

  // Prometheus
  prometheus: {
    enabled: process.env.PROMETHEUS_ENABLED === 'true',
    port: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
    path: process.env.PROMETHEUS_PATH || '/metrics',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json', // 'json' or 'pretty'
  },
}));
