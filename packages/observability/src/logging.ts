import winston from 'winston';
import type { SpanContext } from '@opentelemetry/api';

export interface LogContext {
  traceId?: string;
  spanId?: string;
  [key: string]: unknown;
}

let logger: winston.Logger | null = null;

export function initializeLogging(serviceName: string, serviceVersion?: string): winston.Logger {
  if (logger) {
    return logger;
  }

  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: {
      service: serviceName,
      version: serviceVersion || '0.1.0',
    },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
          })
        ),
      }),
    ],
  });

  return logger;
}

export function getLogger(): winston.Logger {
  if (!logger) {
    return initializeLogging(process.env.SERVICE_NAME || 'unknown');
  }
  return logger;
}

export function logWithContext(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  context?: LogContext | SpanContext
): void {
  const log = getLogger();
  const meta: Record<string, unknown> = {};

  if (context) {
    if ('traceId' in context) {
      meta.traceId = context.traceId;
    }
    if ('spanId' in context) {
      meta.spanId = context.spanId;
    }
    Object.assign(meta, context);
  }

  log[level](message, meta);
}
