import type { EventEnvelope } from '@opendex/contracts';

export interface EventBus {
  publish<T>(topic: string, event: EventEnvelope<T>): Promise<void>;
  subscribe<T>(
    topic: string,
    handler: (event: EventEnvelope<T>) => Promise<void>,
    options?: SubscribeOptions
  ): Promise<Subscription>;
  close(): Promise<void>;
}

export interface SubscribeOptions {
  queue?: string;
  maxDeliveries?: number;
  ackWait?: number;
}

export interface Subscription {
  unsubscribe(): Promise<void>;
}

export interface OutboxEvent {
  id: string;
  eventType: string;
  payload: unknown;
  occurredAt: Date;
  processedAt?: Date;
}

export interface OutboxRepository {
  findUnprocessed(limit: number): Promise<OutboxEvent[]>;
  markAsProcessed(id: string): Promise<void>;
  markAsFailed(id: string, error: string): Promise<void>;
}
