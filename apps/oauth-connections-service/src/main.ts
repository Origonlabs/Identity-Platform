import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './modules/app.module';
import { initializeObservability, shutdownObservability } from '@opendex/observability';

async function bootstrap() {
  initializeObservability({
    serviceName: 'oauth-connections-service',
    serviceVersion: process.env.SERVICE_VERSION || '0.1.0',
    tracing: {
      enabled: process.env.ENABLE_TRACING !== 'false',
      endpoint: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    },
    metrics: {
      enabled: process.env.ENABLE_METRICS !== 'false',
      endpoint: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
    },
    logging: {
      enabled: true,
    },
  });

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );

  app.use(helmet());
  app.use(compression());

  const port = process.env.PORT || 8202;
  await app.listen(port);
  
  console.log(`OAuth Connections service listening on http://localhost:${port}/v1/health`);

  process.on('SIGTERM', async () => {
    await shutdownObservability();
    await app.close();
  });

  process.on('SIGINT', async () => {
    await shutdownObservability();
    await app.close();
  });
}

bootstrap().catch(async (err) => {
  console.error('Failed to bootstrap oauth-connections service', err);
  await shutdownObservability();
  process.exit(1);
});
