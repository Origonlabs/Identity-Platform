import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './modules/app.module';

async function bootstrap() {
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
  // eslint-disable-next-line no-console
  console.log(`OAuth Connections service listening on http://localhost:${port}/v1/health`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap oauth-connections service', err);
  process.exit(1);
});
