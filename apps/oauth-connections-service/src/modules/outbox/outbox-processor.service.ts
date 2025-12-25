import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NatsEventBus, OutboxProcessor, PrismaOutboxRepository } from '@opendex/event-bus';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OutboxProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private eventBus: NatsEventBus | null = null;
  private processor: OutboxProcessor | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  async onModuleInit() {
    const natsUrl = this.config.get<string>('NATS_URL', 'nats://localhost:4222');
    
    this.eventBus = new NatsEventBus(natsUrl, {
      name: 'oauth-connections-service',
      maxReconnectAttempts: 10,
      reconnectTimeWait: 2000,
    });

    await this.eventBus.connect();
    this.logger.log('Connected to NATS event bus');

    const repository = new PrismaOutboxRepository(this.prisma);
    this.processor = new OutboxProcessor(this.eventBus, repository, {
      pollIntervalMs: this.config.get<number>('OUTBOX_POLL_INTERVAL_MS', 5000),
      batchSize: this.config.get<number>('OUTBOX_BATCH_SIZE', 10),
      maxRetries: this.config.get<number>('OUTBOX_MAX_RETRIES', 3),
    });

    this.processor.start();
    this.logger.log('Outbox processor started');
  }

  async onModuleDestroy() {
    if (this.processor) {
      this.processor.stop();
      this.logger.log('Outbox processor stopped');
    }

    if (this.eventBus) {
      await this.eventBus.close();
      this.logger.log('Disconnected from NATS event bus');
    }
  }
}
