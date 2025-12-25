import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './health-indicator.service';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator, PrismaService],
})
export class HealthModule {}
