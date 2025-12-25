import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as crypto from 'crypto';
import express, { Request, Response } from 'express';
import { Consumer, Kafka, Producer } from 'kafkajs';
import pino from 'pino';
import { createClient } from 'redis';

// Types
interface WebhookSubscription {
  id: string;
  tenantId: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  retryPolicy: RetryPolicy;
  rateLimit: RateLimit;
  headers: Record<string, string>;
  createdAt: Date;
}

interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface RateLimit {
  requestsPerSecond: number;
  requestsPerHour: number;
}

interface WebhookEvent {
  id: string;
  subscriptionId: string;
  eventType: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  status: 'PENDING' | 'DELIVERED' | 'FAILED' | 'DEAD_LETTER';
  attempts: number;
  lastError: string | null;
  nextRetryAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
}

interface DeliveryAttempt {
  id: string;
  webhookEventId: string;
  attemptNumber: number;
  status: 'SUCCESS' | 'FAILURE';
  statusCode: number | null;
  responseBody: string | null;
  error: string | null;
  duration: number;
  attemptedAt: Date;
}

// Logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

// Initialize Express
const app = express();
app.use(express.json());

// Initialize services
const prisma = new PrismaClient();
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

const kafka = new Kafka({
  clientId: 'webhook-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

let kafkaProducer: Producer;
let kafkaConsumer: Consumer;

// Default retry policy
const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 86400000, // 24 hours
  backoffMultiplier: 2,
};

// Default rate limit
const DEFAULT_RATE_LIMIT: RateLimit = {
  requestsPerSecond: 100,
  requestsPerHour: 10000,
};

// Helper: Generate signature
function generateSignature(
  payload: string,
  secret: string,
  timestamp: string
): string {
  const message = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

// Helper: Verify signature
function verifySignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: string
): boolean {
  const expectedSignature = generateSignature(payload, secret, timestamp);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Helper: Calculate next retry delay
function calculateNextRetryDelay(
  attempt: number,
  policy: RetryPolicy
): number {
  const delay = Math.min(
    policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1),
    policy.maxDelayMs
  );
  // Add jitter (±10%)
  const jitter = delay * 0.1;
  return delay + (Math.random() - 0.5) * 2 * jitter;
}

// Initialize Kafka consumer
async function initializeKafkaConsumer() {
  kafkaProducer = kafka.producer();
  kafkaConsumer = kafka.consumer({ groupId: 'webhook-service-group' });

  await kafkaProducer.connect();
  await kafkaConsumer.connect();

  // Subscribe to all event topics
  await kafkaConsumer.subscribe({
    topics: [
      'user.events',
      'auth.events',
      'authorization.events',
      'token.events',
      'audit.events',
      'security.alerts',
    ],
    fromBeginning: false,
  });

  // Start consuming
  await kafkaConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value!.toString());

        // Find subscriptions for this event type
        const subscriptions = await prisma.webhookSubscription.findMany({
          where: {
            active: true,
            events: { hasSome: [event.type || topic] },
          },
        });

        for (const subscription of subscriptions) {
          await enqueueWebhookEvent(subscription.id, event);
        }
      } catch (error) {
        logger.error(
          { error, topic, partition },
          'Failed to process Kafka message'
        );
      }
    },
  });

  logger.info('Kafka consumer initialized');
}

// Enqueue webhook event
async function enqueueWebhookEvent(
  subscriptionId: string,
  payload: Record<string, unknown>
) {
  try {
    const idempotencyKey = `${subscriptionId}:${payload.id || crypto.randomUUID()}`;

    // Check if already processed (idempotency)
    const existing = await prisma.webhookEvent.findFirst({
      where: {
        subscriptionId,
        idempotencyKey,
      },
    });

    if (existing) {
      logger.info(
        { idempotencyKey },
        'Event already processed, skipping'
      );
      return;
    }

    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        id: crypto.randomUUID(),
        subscriptionId,
        eventType: (payload.type as string) || 'unknown',
        payload,
        idempotencyKey,
        status: 'PENDING',
        attempts: 0,
        lastError: null,
        nextRetryAt: new Date(),
      },
    });

    // Publish to delivery queue
    await kafkaProducer.send({
      topic: 'webhook.delivery.queue',
      messages: [
        {
          key: subscriptionId,
          value: JSON.stringify({
            webhookEventId: webhookEvent.id,
            subscriptionId,
            timestamp: Date.now(),
          }),
        },
      ],
    });

    logger.info({ webhookEventId: webhookEvent.id }, 'Webhook event enqueued');
  } catch (error) {
    logger.error({ error, subscriptionId }, 'Failed to enqueue webhook event');
  }
}

// Process webhook delivery
async function processWebhookDelivery(webhookEventId: string) {
  try {
    const webhookEvent = await prisma.webhookEvent.findUnique({
      where: { id: webhookEventId },
      include: { subscription: true },
    });

    if (!webhookEvent || !webhookEvent.subscription) {
      logger.error({ webhookEventId }, 'Webhook event or subscription not found');
      return;
    }

    const subscription = webhookEvent.subscription;

    // Check rate limit
    const rateLimitKey = `rate-limit:${subscription.id}`;
    const requestCount = await redis.incr(rateLimitKey);
    if (requestCount === 1) {
      await redis.expire(rateLimitKey, 1); // 1 second window
    }

    if (
      requestCount > subscription.rateLimit.requestsPerSecond
    ) {
      logger.warn(
        { subscriptionId: subscription.id },
        'Rate limit exceeded, deferring delivery'
      );
      // Reschedule
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: {
          nextRetryAt: new Date(Date.now() + 1000),
        },
      });
      return;
    }

    // Prepare payload
    const payload = JSON.stringify(webhookEvent.payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(
      payload,
      subscription.secret,
      timestamp
    );

    const startTime = Date.now();

    try {
      // Send webhook
      const response = await axios.post(subscription.url, webhookEvent.payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp,
          'X-Webhook-Id': webhookEvent.id,
          'X-Idempotency-Key': webhookEvent.idempotencyKey,
          ...subscription.headers,
        },
        timeout: 30000, // 30 seconds
      });

      const duration = Date.now() - startTime;

      // Record successful delivery
      await prisma.deliveryAttempt.create({
        data: {
          id: crypto.randomUUID(),
          webhookEventId,
          attemptNumber: webhookEvent.attempts + 1,
          status: 'SUCCESS',
          statusCode: response.status,
          responseBody: JSON.stringify(response.data).slice(0, 1000),
          error: null,
          duration,
          attemptedAt: new Date(),
        },
      });

      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: {
          status: 'DELIVERED',
          attempts: webhookEvent.attempts + 1,
          deliveredAt: new Date(),
          nextRetryAt: null,
        },
      });

      logger.info(
        {
          webhookEventId,
          subscriptionId: subscription.id,
          statusCode: response.status,
          duration,
        },
        'Webhook delivered successfully'
      );

      // Publish success event
      await kafkaProducer.send({
        topic: 'webhook.events',
        messages: [
          {
            value: JSON.stringify({
              type: 'webhook.delivered',
              webhookEventId,
              subscriptionId: subscription.id,
              timestamp: new Date(),
            }),
          },
        ],
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = axios.isAxiosError(error)
        ? `${error.code}: ${error.message}`
        : String(error);

      // Record failed attempt
      await prisma.deliveryAttempt.create({
        data: {
          id: crypto.randomUUID(),
          webhookEventId,
          attemptNumber: webhookEvent.attempts + 1,
          status: 'FAILURE',
          statusCode: axios.isAxiosError(error) ? error.response?.status || null : null,
          responseBody: axios.isAxiosError(error)
            ? JSON.stringify(error.response?.data).slice(0, 1000)
            : null,
          error: errorMessage,
          duration,
          attemptedAt: new Date(),
        },
      });

      const nextAttempt = webhookEvent.attempts + 1;

      if (nextAttempt < subscription.retryPolicy.maxRetries) {
        // Schedule retry
        const nextRetryDelay = calculateNextRetryDelay(
          nextAttempt,
          subscription.retryPolicy
        );

        await prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: {
            attempts: nextAttempt,
            lastError: errorMessage,
            nextRetryAt: new Date(Date.now() + nextRetryDelay),
            status: 'PENDING',
          },
        });

        logger.warn(
          {
            webhookEventId,
            subscriptionId: subscription.id,
            attempt: nextAttempt,
            error: errorMessage,
            nextRetryIn: Math.round(nextRetryDelay / 1000),
          },
          'Webhook delivery failed, scheduled retry'
        );

        // Reschedule in queue
        await kafkaProducer.send({
          topic: 'webhook.delivery.queue',
          messages: [
            {
              key: subscription.id,
              value: JSON.stringify({
                webhookEventId,
                subscriptionId: subscription.id,
                timestamp: Date.now() + nextRetryDelay,
              }),
            },
          ],
        });
      } else {
        // Move to dead letter queue
        await prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: {
            status: 'DEAD_LETTER',
            attempts: nextAttempt,
            lastError: errorMessage,
          },
        });

        logger.error(
          {
            webhookEventId,
            subscriptionId: subscription.id,
            attempts: nextAttempt,
            error: errorMessage,
          },
          'Webhook delivery failed after max retries, moved to DLQ'
        );

        // Publish to DLQ topic
        await kafkaProducer.send({
          topic: 'webhook.dead-letter-queue',
          messages: [
            {
              value: JSON.stringify({
                webhookEventId,
                subscriptionId: subscription.id,
                error: errorMessage,
                attempts: nextAttempt,
                timestamp: new Date(),
              }),
            },
          ],
        });
      }
    }
  } catch (error) {
    logger.error(
      { error, webhookEventId },
      'Failed to process webhook delivery'
    );
  }
}

// Retry scheduler (runs periodically)
async function scheduleRetries() {
  try {
    const pendingEvents = await prisma.webhookEvent.findMany({
      where: {
        status: 'PENDING',
        nextRetryAt: { lte: new Date() },
      },
      take: 100,
    });

    for (const event of pendingEvents) {
      await processWebhookDelivery(event.id);
    }
  } catch (error) {
    logger.error({ error }, 'Failed to schedule retries');
  }
}

// API Endpoints

// Create webhook subscription
app.post('/webhooks', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      url,
      events,
      retryPolicy = DEFAULT_RETRY_POLICY,
      rateLimit = DEFAULT_RATE_LIMIT,
      headers = {},
    } = req.body;

    if (!tenantId || !url || !events || events.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: tenantId, url, events',
      });
    }

    const secret = crypto.randomBytes(32).toString('hex');

    const subscription = await prisma.webhookSubscription.create({
      data: {
        id: crypto.randomUUID(),
        tenantId,
        url,
        events,
        secret,
        active: true,
        retryPolicy,
        rateLimit,
        headers,
      },
    });

    res.status(201).json({
      id: subscription.id,
      secret: subscription.secret,
      url: subscription.url,
      events: subscription.events,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create webhook subscription');
    res
      .status(500)
      .json({ error: { code: 'SUBSCRIPTION_ERROR', message: String(error) } });
  }
});

// List webhooks
app.get('/webhooks', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;

    const subscriptions = await prisma.webhookSubscription.findMany({
      where: { tenantId: tenantId as string },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
      },
    });

    res.json({ webhooks: subscriptions });
  } catch (error) {
    logger.error({ error }, 'Failed to list webhooks');
    res
      .status(500)
      .json({ error: { code: 'LIST_ERROR', message: String(error) } });
  }
});

// Update webhook
app.patch('/webhooks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { url, events, active, retryPolicy, rateLimit } = req.body;

    const subscription = await prisma.webhookSubscription.update({
      where: { id },
      data: {
        ...(url && { url }),
        ...(events && { events }),
        ...(active !== undefined && { active }),
        ...(retryPolicy && { retryPolicy }),
        ...(rateLimit && { rateLimit }),
      },
    });

    res.json(subscription);
  } catch (error) {
    logger.error({ error }, 'Failed to update webhook');
    res
      .status(500)
      .json({ error: { code: 'UPDATE_ERROR', message: String(error) } });
  }
});

// Delete webhook
app.delete('/webhooks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.webhookSubscription.update({
      where: { id },
      data: { active: false },
    });

    res.json({ message: 'Webhook deleted' });
  } catch (error) {
    logger.error({ error }, 'Failed to delete webhook');
    res
      .status(500)
      .json({ error: { code: 'DELETE_ERROR', message: String(error) } });
  }
});

// Get webhook delivery history
app.get('/webhooks/:id/deliveries', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, limit = 100 } = req.query;

    const events = await prisma.webhookEvent.findMany({
      where: {
        subscriptionId: id,
        ...(status && { status: status as string }),
      },
      include: {
        deliveryAttempts: {
          orderBy: { attemptedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({ events });
  } catch (error) {
    logger.error({ error }, 'Failed to get delivery history');
    res.status(500).json({
      error: { code: 'DELIVERY_HISTORY_ERROR', message: String(error) },
    });
  }
});

// Retry failed delivery
app.post('/webhooks/:subscriptionId/events/:eventId/retry', async (
  req: Request,
  res: Response
) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Reset for retry
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: 'PENDING',
        nextRetryAt: new Date(),
        attempts: 0,
        lastError: null,
      },
    });

    // Process immediately
    await processWebhookDelivery(eventId);

    res.json({ message: 'Retry scheduled' });
  } catch (error) {
    logger.error({ error }, 'Failed to retry delivery');
    res.status(500).json({
      error: { code: 'RETRY_ERROR', message: String(error) },
    });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'webhook-service' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await kafkaConsumer.disconnect();
  await kafkaProducer.disconnect();
  await prisma.$disconnect();
  await redis.disconnect();
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3005;

async function start() {
  try {
    await initializeKafkaConsumer();

    // Start retry scheduler (every 10 seconds)
    setInterval(scheduleRetries, 10000);

    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Webhook service started');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start webhook service');
    process.exit(1);
  }
}

start();
