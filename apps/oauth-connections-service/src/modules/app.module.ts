import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { ConnectionsModule } from './connections/connections.module';
import { OutboxModule } from './outbox/outbox.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    TerminusModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),
    HealthModule,
    MetricsModule,
    ConnectionsModule,
    OutboxModule,
  ],
})
export class AppModule {}
