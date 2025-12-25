import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OutboxProcessorService } from './outbox-processor.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [ConfigModule],
  providers: [OutboxProcessorService, PrismaService],
})
export class OutboxModule {}
