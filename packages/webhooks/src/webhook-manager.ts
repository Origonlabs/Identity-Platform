import Redis from 'ioredis';
import { randomBytes } from 'crypto';
import type { Webhook, RetryPolicy } from './types';
import { WebhookDeliveryService } from './webhook-delivery';

export class WebhookManager {
  private readonly redis: Redis;
  private readonly deliveryService: WebhookDeliveryService;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.deliveryService = new WebhookDeliveryService(redisUrl);
  }

  async createWebhook(
    url: string,
    events: string[],
    retryPolicy?: Partial<RetryPolicy>
  ): Promise<Webhook> {
    const webhook: Webhook = {
      id: `wh_${Date.now()}_${randomBytes(8).toString('hex')}`,
      url,
      events,
      secret: this.generateSecret(),
      enabled: true,
      retryPolicy: {
        maxAttempts: retryPolicy?.maxAttempts || 3,
        backoffStrategy: retryPolicy?.backoffStrategy || 'exponential',
        initialDelay: retryPolicy?.initialDelay || 1000,
        maxDelay: retryPolicy?.maxDelay || 60000,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    await this.redis.set(`webhook:${webhook.id}`, JSON.stringify(webhook));
    await this.redis.sadd('webhooks:all', webhook.id);

    for (const event of events) {
      await this.redis.sadd(`webhooks:event:${event}`, webhook.id);
    }

    return webhook;
  }

  async getWebhook(id: string): Promise<Webhook | null> {
    const data = await this.redis.get(`webhook:${id}`);
    if (!data) return null;
    return JSON.parse(data) as Webhook;
  }

  async listWebhooks(eventType?: string): Promise<Webhook[]> {
    const webhookIds = eventType
      ? await this.redis.smembers(`webhooks:event:${eventType}`)
      : await this.redis.smembers('webhooks:all');

    const webhooks: Webhook[] = [];
    for (const id of webhookIds) {
      const webhook = await this.getWebhook(id);
      if (webhook) webhooks.push(webhook);
    }

    return webhooks;
  }

  async updateWebhook(
    id: string,
    updates: Partial<Omit<Webhook, 'id' | 'createdAt'>>
  ): Promise<Webhook | null> {
    const webhook = await this.getWebhook(id);
    if (!webhook) return null;

    const updated: Webhook = {
      ...webhook,
      ...updates,
      updatedAt: new Date(),
    };

    await this.redis.set(`webhook:${id}`, JSON.stringify(updated));

    if (updates.events) {
      const oldEvents = new Set(webhook.events);
      const newEvents = new Set(updates.events);

      for (const event of oldEvents) {
        if (!newEvents.has(event)) {
          await this.redis.srem(`webhooks:event:${event}`, id);
        }
      }

      for (const event of newEvents) {
        if (!oldEvents.has(event)) {
          await this.redis.sadd(`webhooks:event:${event}`, id);
        }
      }
    }

    return updated;
  }

  async deleteWebhook(id: string): Promise<void> {
    const webhook = await this.getWebhook(id);
    if (!webhook) return;

    await this.redis.del(`webhook:${id}`);
    await this.redis.srem('webhooks:all', id);

    for (const event of webhook.events) {
      await this.redis.srem(`webhooks:event:${event}`, id);
    }
  }

  async triggerEvent(eventType: string, payload: unknown): Promise<void> {
    const webhooks = await this.listWebhooks(eventType);

    for (const webhook of webhooks) {
      if (!webhook.enabled) continue;

      await this.deliveryService.deliver(webhook, eventType, payload);
    }
  }

  async getDeliveries(webhookId: string) {
    return this.deliveryService.getDeliveries(webhookId);
  }

  private generateSecret(): string {
    return randomBytes(32).toString('hex');
  }

  async close(): Promise<void> {
    await this.redis.quit();
    await this.deliveryService.close();
  }
}
