import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { ConnectionsInterceptor } from './connections.interceptor';
import { TokenRefreshWorker } from './token-refresh.worker';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsModule } from '../metrics/metrics.module';
import { InternalServiceGuard } from '../auth/internal-service.guard';

@Module({
  imports: [CqrsModule, MetricsModule],
  controllers: [ConnectionsController],
  providers: [
    ConnectionsService,
    TokenRefreshWorker,
    PrismaService,
    InternalServiceGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: ConnectionsInterceptor,
    },
  ],
  exports: [ConnectionsService, TokenRefreshWorker],
})
export class ConnectionsModule {}
