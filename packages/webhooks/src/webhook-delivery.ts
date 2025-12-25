import Redis from 'ioredis';
import { ServiceClient } from '@opendex/service-client';
import type { Webhook, WebhookDelivery, RetryPolicy } from './types';
import { WebhookSigningService } from './webhook-signing';

export class WebhookDeliveryService {
  private readonly redis: Redis;
  private readonly signing: WebhookSigningService;
  private readonly httpClient: ServiceClient;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.signing = new WebhookSigningService();
    this.httpClient = new ServiceClient({
      circuitBreaker: { failureThreshold: 3, resetTimeout: 60000 },
      retry: { maxAttempts: 0 },
    });
  }

  async deliver(
    webhook: Webhook,
    eventType: string,
    payload: unknown
  ): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      id: `delivery_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      webhookId: webhook.id,
      eventId: `evt_${Date.now()}`,
      eventType,
      payload,
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
    };

    await this.redis.lpush(`webhook:deliveries:${webhook.id}`, JSON.stringify(delivery));
    await this.redis.expire(`webhook:deliveries:${webhook.id}`, 86400 * 7);

    await this.attemptDelivery(webhook, delivery);

    return delivery;
  }

  private async attemptDelivery(
    webhook: Webhook,
    delivery: WebhookDelivery
  ): Promise<void> {
    delivery.attempts += 1;
    delivery.lastAttemptAt = new Date();
    delivery.status = 'retrying';

    try {
      const payloadStr = JSON.stringify(delivery.payload);
      const headers = this.signing.generateHeaders(payloadStr, webhook.secret);

      const response = await this.httpClient.call(webhook.url, {
        method: 'POST',
        body: delivery.payload,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      delivery.status = 'delivered';
      delivery.responseCode = 200;
      delivery.responseBody = JSON.stringify(response);

      await this.updateDelivery(webhook.id, delivery);
    } catch (error: any) {
      delivery.responseCode = error.status || 500;
      delivery.responseBody = error.message;

      if (this.shouldRetry(delivery, webhook.retryPolicy)) {
        delivery.nextRetryAt = this.calculateNextRetry(
          delivery,
          webhook.retryPolicy
        );
        await this.scheduleRetry(webhook, delivery);
      } else {
        delivery.status = 'failed';
      }

      await this.updateDelivery(webhook.id, delivery);
    }
  }

  private shouldRetry(delivery: WebhookDelivery, policy: RetryPolicy): boolean {
    if (delivery.attempts >= policy.maxAttempts) {
      return false;
    }

    if (delivery.responseCode && delivery.responseCode >= 400 && delivery.responseCode < 500) {
      return false;
    }

    return true;
  }

  private calculateNextRetry(
    delivery: WebhookDelivery,
    policy: RetryPolicy
  ): Date {
    let delay = policy.initialDelay;

    switch (policy.backoffStrategy) {
      case 'exponential':
        delay = policy.initialDelay * Math.pow(2, delivery.attempts - 1);
        break;
      case 'linear':
        delay = policy.initialDelay * delivery.attempts;
        break;
      case 'fixed':
        delay = policy.initialDelay;
        break;
    }

    delay = Math.min(delay, policy.maxDelay);

    return new Date(Date.now() + delay);
  }

  private async scheduleRetry(
    webhook: Webhook,
    delivery: WebhookDelivery
  ): Promise<void> {
    if (!delivery.nextRetryAt) return;

    const delay = delivery.nextRetryAt.getTime() - Date.now();
    if (delay <= 0) {
      await this.attemptDelivery(webhook, delivery);
      return;
    }

    setTimeout(async () => {
      await this.attemptDelivery(webhook, delivery);
    }, delay);
  }

  private async updateDelivery(
    webhookId: string,
    delivery: WebhookDelivery
  ): Promise<void> {
    const deliveries = await this.redis.lrange(
      `webhook:deliveries:${webhookId}`,
      0,
      -1
    );

    const updated = deliveries.map((d) => {
      const parsed = JSON.parse(d) as WebhookDelivery;
      if (parsed.id === delivery.id) {
        return JSON.stringify(delivery);
      }
      return d;
    });

    await this.redis.del(`webhook:deliveries:${webhookId}`);
    if (updated.length > 0) {
      await this.redis.rpush(`webhook:deliveries:${webhookId}`, ...updated);
      await this.redis.expire(`webhook:deliveries:${webhookId}`, 86400 * 7);
    }
  }

  async getDeliveries(webhookId: string): Promise<WebhookDelivery[]> {
    const deliveries = await this.redis.lrange(
      `webhook:deliveries:${webhookId}`,
      0,
      99
    );

    return deliveries.map((d) => JSON.parse(d) as WebhookDelivery);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
