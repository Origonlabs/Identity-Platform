import { connect, NatsConnection, Subscription as NatsSubscription, JSONCodec } from 'nats';
import type { EventEnvelope } from '@opendex/contracts';
import { BaseEventBus } from './event-bus';
import type { EventBus, SubscribeOptions, Subscription } from './types';

class NatsSubscriptionWrapper implements Subscription {
  constructor(private natsSub: NatsSubscription) {}

  async unsubscribe(): Promise<void> {
    this.natsSub.unsubscribe();
  }
}

export class NatsEventBus extends BaseEventBus implements EventBus {
  private connection: NatsConnection | null = null;
  private readonly codec = JSONCodec<EventEnvelope<any>>();
  private readonly subscriptions = new Map<string, NatsSubscription>();

  constructor(
    private readonly servers: string | string[],
    private readonly options?: {
      maxReconnectAttempts?: number;
      reconnectTimeWait?: number;
      name?: string;
    }
  ) {
    super();
  }

  async connect(): Promise<void> {
    if (this.connection) {
      return;
    }

    this.connection = await connect({
      servers: Array.isArray(this.servers) ? this.servers : [this.servers],
      maxReconnectAttempts: this.options?.maxReconnectAttempts ?? 10,
      reconnectTimeWait: this.options?.reconnectTimeWait ?? 2000,
      name: this.options?.name ?? 'opendex-event-bus',
    });
  }

  async publish<T>(topic: string, event: EventEnvelope<T>): Promise<void> {
    if (!this.connection) {
      await this.connect();
    }

    if (!this.connection) {
      throw new Error('Failed to connect to NATS');
    }

    this.validateEvent(event);

    const subject = this.getSubject(topic);
    const encoded = this.codec.encode(event);

    await this.connection.publish(subject, encoded);
  }

  async subscribe<T>(
    topic: string,
    handler: (event: EventEnvelope<T>) => Promise<void>,
    options?: SubscribeOptions
  ): Promise<Subscription> {
    if (!this.connection) {
      await this.connect();
    }

    if (!this.connection) {
      throw new Error('Failed to connect to NATS');
    }

    const subject = this.getSubject(topic);
    const subscriptionOptions: any = {};

    if (options?.queue) {
      subscriptionOptions.queue = options.queue;
    }

    const sub = this.connection.subscribe(subject, subscriptionOptions);

    const subscriptionKey = `${topic}-${options?.queue ?? 'default'}`;
    this.subscriptions.set(subscriptionKey, sub);

    (async () => {
      for await (const msg of sub) {
        try {
          const event = this.codec.decode(msg.data);
          await handler(event);
          msg.ack();
        } catch (error) {
          console.error(`Error processing event from ${topic}:`, error);
          if (options?.maxDeliveries && msg.info.redeliveryCount >= options.maxDeliveries) {
            console.error(`Max deliveries reached for event, moving to DLQ`);
            await this.publish(`${topic}.dlq`, event as EventEnvelope<T>);
            msg.ack();
          } else {
            msg.nak();
          }
        }
      }
    })().catch((error) => {
      console.error(`Subscription error for ${topic}:`, error);
    });

    return new NatsSubscriptionWrapper(sub);
  }

  async close(): Promise<void> {
    for (const sub of this.subscriptions.values()) {
      sub.unsubscribe();
    }
    this.subscriptions.clear();

    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  private getSubject(topic: string): string {
    return `events.${topic}`;
  }
}
