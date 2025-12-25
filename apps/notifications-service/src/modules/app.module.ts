import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import * as Joi from 'joi';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';
import { OutboxModule } from './outbox/outbox.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().uri().required(),
        PORT: Joi.number().default(8201),
        INTERNAL_SERVICE_TOKEN: Joi.string().min(16),
        INTERNAL_SERVICE_JWT_SECRET: Joi.string().min(16),
        NATS_URL: Joi.string().optional(),
      }).or('INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_JWT_SECRET'),
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    NotificationsModule,
    HealthModule,
    MetricsModule,
    OutboxModule,
  ],
})
export class AppModule {}
