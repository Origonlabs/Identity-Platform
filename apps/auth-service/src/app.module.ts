import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { CqrsModule } from '@nestjs/cqrs';
import { RedisModule } from '@liaoliaots/nestjs-redis';

// Configuration
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { observabilityConfig } from './config/observability.config';

// Modules
import { OAuthModule } from './modules/oauth/oauth.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';

// Infrastructure
import { PrismaModule } from './core/infrastructure/persistence/prisma/prisma.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, observabilityConfig],
      envFilePath: ['.env.local', '.env.development', '.env'],
    }),

    // Throttling (Rate limiting)
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),

    // Redis
    RedisModule.forRootAsync({
      useFactory: () => ({
        config: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0'),
        },
      }),
    }),

    // Event Emitter for domain events
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 10,
    }),

    // CQRS
    CqrsModule.forRoot(),

    // Health checks
    TerminusModule,

    // Core modules
    PrismaModule,

    // Feature modules
    OAuthModule,
    ProvidersModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
