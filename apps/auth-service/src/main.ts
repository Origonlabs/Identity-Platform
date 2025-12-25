import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet({
    contentSecurityPolicy: false, // OAuth needs flexibility
    crossOriginEmbedderPolicy: false,
  }));

  // Compression
  app.use(compression());

  // CORS - configurar según tus necesidades
  app.enableCors({
    origin: configService.get('CORS_ORIGINS')?.split(',') || '*',
    credentials: true,
  });

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Sentry Integration
  const sentryDsn = configService.get('SENTRY_DSN');
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: configService.get('NODE_ENV') || 'development',
      integrations: [
        nodeProfilingIntegration(),
      ],
      tracesSampleRate: configService.get('NODE_ENV') === 'production' ? 0.1 : 1.0,
      profilesSampleRate: 1.0,
    });
  }

  // Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('OpenDex Auth Service')
    .setDescription('Enterprise-grade OAuth2/OIDC Authentication Microservice')
    .setVersion('1.0')
    .addTag('oauth', 'OAuth2 endpoints')
    .addTag('oidc', 'OpenID Connect endpoints')
    .addTag('auth', 'Authentication endpoints')
    .addTag('health', 'Health check endpoints')
    .addBearerAuth()
    .addOAuth2({
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: '/oauth/authorize',
          tokenUrl: '/oauth/token',
          scopes: {
            openid: 'OpenID Connect',
            profile: 'User profile',
            email: 'User email',
          },
        },
      },
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get('PORT') || 3000;
  await app.listen(port);

  console.log(`
    🚀 Auth Service is running on: http://localhost:${port}
    📚 API Documentation: http://localhost:${port}/api/docs
    🏥 Health Check: http://localhost:${port}/api/health
  `);
}

bootstrap();
