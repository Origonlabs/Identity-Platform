import type { EventBus } from './event-bus';
import type { OutboxRepository, OutboxEvent } from './types';
import type { EventEnvelope } from '@opendex/contracts';

export interface OutboxProcessorOptions {
  pollIntervalMs?: number;
  batchSize?: number;
  maxRetries?: number;
}

export class OutboxProcessor {
  private intervalId?: NodeJS.Timeout;
  private isProcessing = false;

  constructor(
    private readonly eventBus: EventBus,
    private readonly repository: OutboxRepository,
    private readonly options: OutboxProcessorOptions = {}
  ) {
    this.options = {
      pollIntervalMs: options.pollIntervalMs ?? 5000,
      batchSize: options.batchSize ?? 10,
      maxRetries: options.maxRetries ?? 3,
    };
  }

  start(): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.processOutbox().catch((error) => {
        console.error('Error processing outbox:', error);
      });
    }, this.options.pollIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private async processOutbox(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const events = await this.repository.findUnprocessed(this.options.batchSize!);

      for (const event of events) {
        try {
          const envelope = event.payload as EventEnvelope<any>;
          const topic = this.getTopicFromEventType(event.eventType);

          await this.eventBus.publish(topic, envelope);
          await this.repository.markAsProcessed(event.id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await this.repository.markAsFailed(event.id, errorMessage);
          console.error(`Failed to process outbox event ${event.id}:`, error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private getTopicFromEventType(eventType: string): string {
    const parts = eventType.split('.');
    if (parts.length >= 2) {
      return parts.slice(0, -1).join('.');
    }
    return eventType;
  }
}
