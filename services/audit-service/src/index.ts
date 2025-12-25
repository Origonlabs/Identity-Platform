import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import express, { Request, Response } from 'express';
import { Consumer, Kafka, Producer } from 'kafkajs';
import pino from 'pino';
import { createClient } from 'redis';

// Types
interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  action: string;
  status: 'SUCCESS' | 'FAILURE';
  ipAddress: string;
  userAgent: string;
  details: Record<string, unknown>;
  complianceFrameworks: string[];
  dataClassification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  retentionDays: number;
  immutable: boolean;
  hash: string;
  previousHash: string | null;
}

interface ComplianceReport {
  id: string;
  framework: string;
  period: string;
  totalEvents: number;
  criticalActions: number;
  failedActions: number;
  complianceScore: number;
  recommendations: string[];
  generatedAt: Date;
}

interface EventFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  eventType?: string;
  status?: 'SUCCESS' | 'FAILURE';
  resourceType?: string;
  framework?: string;
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
  clientId: 'audit-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

let kafkaProducer: Producer;
let kafkaConsumer: Consumer;

// Compliance configurations
const COMPLIANCE_CONFIGS = {
  GDPR: {
    name: 'General Data Protection Regulation',
    criticalEvents: [
      'data_export',
      'account_delete',
      'consent_update',
      'data_breach',
      'dpia_completed',
    ],
    defaultRetention: 2555, // 7 years
    countries: ['EU'],
  },
  HIPAA: {
    name: 'Health Insurance Portability and Accountability Act',
    criticalEvents: [
      'patient_data_access',
      'data_modification',
      'unauthorized_access',
      'audit_log_query',
      'breach_notification',
    ],
    defaultRetention: 2555, // 6 years + current
    countries: ['US'],
  },
  SOC2: {
    name: 'Service Organization Control 2',
    criticalEvents: [
      'access_granted',
      'access_revoked',
      'configuration_change',
      'incident_detected',
      'maintenance_window',
    ],
    defaultRetention: 365,
    countries: ['US', 'Global'],
  },
  PCI_DSS: {
    name: 'Payment Card Industry Data Security Standard',
    criticalEvents: [
      'card_data_access',
      'encryption_key_change',
      'failed_auth_attempt',
      'security_scan_completed',
      'vulnerability_patched',
    ],
    defaultRetention: 365,
    countries: ['Global'],
  },
};

// Helper: Calculate event hash (blockchain-like)
function calculateEventHash(event: AuditEvent, previousHash: string | null): string {
  const data = JSON.stringify({
    ...event,
    hash: undefined,
  });
  
  const combined = previousHash ? `${previousHash}${data}` : data;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

// Helper: Determine compliance frameworks
function determineFrameworks(
  eventType: string,
  dataClassification: string,
  country: string
): string[] {
  const frameworks: string[] = [];

  if (eventType.includes('data') || eventType.includes('user')) {
    if (country === 'EU') frameworks.push('GDPR');
  }

  if (eventType.includes('health') || eventType.includes('patient')) {
    frameworks.push('HIPAA');
  }

  if (eventType.includes('access') || eventType.includes('auth')) {
    frameworks.push('SOC2');
  }

  if (eventType.includes('card') || eventType.includes('payment')) {
    frameworks.push('PCI_DSS');
  }

  if (dataClassification === 'RESTRICTED') {
    frameworks.push('GDPR', 'HIPAA', 'SOC2');
  }

  return [...new Set(frameworks)];
}

// Initialize Kafka consumer
async function initializeKafkaConsumer() {
  kafkaProducer = kafka.producer();
  kafkaConsumer = kafka.consumer({ groupId: 'audit-service-group' });

  await kafkaProducer.connect();
  await kafkaConsumer.connect();

  // Subscribe to all audit-related topics
  await kafkaConsumer.subscribe({
    topics: [
      'auth.events',
      'user.events',
      'authorization.events',
      'token.events',
      'security.events',
      'audit.commands',
    ],
    fromBeginning: false,
  });

  // Start consuming
  await kafkaConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value!.toString());
        
        // Store event in database
        const lastEvent = await prisma.auditLog.findFirst({
          orderBy: { createdAt: 'desc' },
        });

        const newEvent: AuditEvent = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          eventType: event.type || 'UNKNOWN',
          userId: event.userId || 'SYSTEM',
          resourceType: event.resourceType || 'UNKNOWN',
          resourceId: event.resourceId || '',
          action: event.action || 'UNKNOWN',
          status: event.status || 'SUCCESS',
          ipAddress: event.ipAddress || '0.0.0.0',
          userAgent: event.userAgent || 'Unknown',
          details: event.details || {},
          dataClassification: event.dataClassification || 'INTERNAL',
          complianceFrameworks: determineFrameworks(
            event.type || 'UNKNOWN',
            event.dataClassification || 'INTERNAL',
            event.country || 'US'
          ),
          retentionDays: event.retentionDays || 365,
          immutable: true,
          hash: '',
          previousHash: lastEvent ? lastEvent.hash : null,
        };

        // Calculate hash
        newEvent.hash = calculateEventHash(
          newEvent,
          newEvent.previousHash
        );

        // Persist to database
        await prisma.auditLog.create({
          data: {
            id: newEvent.id,
            eventType: newEvent.eventType,
            userId: newEvent.userId,
            resourceType: newEvent.resourceType,
            resourceId: newEvent.resourceId,
            action: newEvent.action,
            status: newEvent.status,
            ipAddress: newEvent.ipAddress,
            userAgent: newEvent.userAgent,
            details: newEvent.details,
            dataClassification: newEvent.dataClassification,
            complianceFrameworks: newEvent.complianceFrameworks,
            retentionDays: newEvent.retentionDays,
            hash: newEvent.hash,
            previousHash: newEvent.previousHash,
            expiresAt: new Date(
              Date.now() + newEvent.retentionDays * 24 * 60 * 60 * 1000
            ),
          },
        });

        // Cache in Redis for fast access (24 hours)
        await redis.set(
          `audit:${newEvent.id}`,
          JSON.stringify(newEvent),
          { EX: 86400 }
        );

        // Index in Elasticsearch for search (async, non-blocking)
        indexToElasticsearch(newEvent).catch((err) =>
          logger.error({ err }, 'Failed to index in Elasticsearch')
        );

        // Check for security incidents
        await checkSecurityIncidents(newEvent);

        logger.info(
          {
            eventId: newEvent.id,
            eventType: newEvent.eventType,
            userId: newEvent.userId,
            frameworks: newEvent.complianceFrameworks,
          },
          'Audit event processed'
        );
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

// Index events to Elasticsearch
async function indexToElasticsearch(event: AuditEvent) {
  try {
    // This would typically use @elastic/elasticsearch client
    // For now, we'll simulate the operation
    const elasticsearchUrl =
      process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
    
    const response = await fetch(
      `${elasticsearchUrl}/audit-events-${new Date().toISOString().split('T')[0]}/_doc/${event.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          '@timestamp': event.timestamp,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Elasticsearch indexing failed: ${response.statusText}`);
    }
  } catch (error) {
    logger.warn(
      { error },
      'Elasticsearch not available, skipping indexing'
    );
  }
}

// Check for security incidents
async function checkSecurityIncidents(event: AuditEvent) {
  if (event.status === 'FAILURE') {
    // Track failed attempts
    const failureKey = `failures:${event.userId}:${event.eventType}`;
    const failureCount = await redis.incr(failureKey);
    await redis.expire(failureKey, 3600); // 1 hour window

    // Alert on excessive failures
    if (failureCount > 5) {
      logger.warn(
        {
          userId: event.userId,
          eventType: event.eventType,
          failureCount,
        },
        'Excessive failures detected - security incident'
      );

      // Publish security alert
      await kafkaProducer.send({
        topic: 'security.alerts',
        messages: [
          {
            value: JSON.stringify({
              type: 'EXCESSIVE_FAILURES',
              userId: event.userId,
              eventType: event.eventType,
              count: failureCount,
              timestamp: new Date(),
            }),
          },
        ],
      });
    }
  }

  // Check for suspicious patterns
  if (
    event.eventType === 'data_export' &&
    event.resourceType === 'user_data'
  ) {
    logger.warn(
      { userId: event.userId, resourceId: event.resourceId },
      'Data export detected - requires GDPR compliance review'
    );
  }
}

// API Endpoints

// Store audit event
app.post('/audit/events', async (req: Request, res: Response) => {
  try {
    const { eventType, userId, action, details, dataClassification } = req.body;

    const lastEvent = await prisma.auditLog.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const newEvent: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      eventType,
      userId,
      resourceType: req.body.resourceType || 'UNKNOWN',
      resourceId: req.body.resourceId || '',
      action,
      status: req.body.status || 'SUCCESS',
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.get('user-agent') || 'Unknown',
      details,
      dataClassification: dataClassification || 'INTERNAL',
      complianceFrameworks: determineFrameworks(
        eventType,
        dataClassification || 'INTERNAL',
        req.body.country || 'US'
      ),
      retentionDays: req.body.retentionDays || 365,
      immutable: true,
      hash: '',
      previousHash: lastEvent ? lastEvent.hash : null,
    };

    newEvent.hash = calculateEventHash(newEvent, newEvent.previousHash);

    await prisma.auditLog.create({
      data: {
        id: newEvent.id,
        eventType: newEvent.eventType,
        userId: newEvent.userId,
        resourceType: newEvent.resourceType,
        resourceId: newEvent.resourceId,
        action: newEvent.action,
        status: newEvent.status,
        ipAddress: newEvent.ipAddress,
        userAgent: newEvent.userAgent,
        details: newEvent.details,
        dataClassification: newEvent.dataClassification,
        complianceFrameworks: newEvent.complianceFrameworks,
        retentionDays: newEvent.retentionDays,
        hash: newEvent.hash,
        previousHash: newEvent.previousHash,
        expiresAt: new Date(
          Date.now() + newEvent.retentionDays * 24 * 60 * 60 * 1000
        ),
      },
    });

    await redis.set(
      `audit:${newEvent.id}`,
      JSON.stringify(newEvent),
      { EX: 86400 }
    );

    // Publish to Kafka
    await kafkaProducer.send({
      topic: 'audit.events',
      messages: [{ value: JSON.stringify(newEvent) }],
    });

    res.status(201).json({ id: newEvent.id, hash: newEvent.hash });
  } catch (error) {
    logger.error({ error }, 'Failed to store audit event');
    res
      .status(500)
      .json({ error: { code: 'AUDIT_STORAGE_ERROR', message: String(error) } });
  }
});

// Query audit events
app.post('/audit/query', async (req: Request, res: Response) => {
  try {
    const filter: EventFilter = req.body;

    const events = await prisma.auditLog.findMany({
      where: {
        ...(filter.startDate && { createdAt: { gte: filter.startDate } }),
        ...(filter.endDate && { createdAt: { lte: filter.endDate } }),
        ...(filter.userId && { userId: filter.userId }),
        ...(filter.eventType && { eventType: filter.eventType }),
        ...(filter.status && { status: filter.status }),
        ...(filter.resourceType && { resourceType: filter.resourceType }),
        ...(filter.framework && {
          complianceFrameworks: { hasSome: [filter.framework] },
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    res.json({ events: events.length, data: events });
  } catch (error) {
    logger.error({ error }, 'Failed to query audit events');
    res
      .status(500)
      .json({ error: { code: 'QUERY_ERROR', message: String(error) } });
  }
});

// Verify event chain (blockchain-like integrity)
app.get('/audit/verify/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.auditLog.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Verify current hash
    const recalculatedHash = calculateEventHash(
      event as unknown as AuditEvent,
      event.previousHash
    );

    const isValid = event.hash === recalculatedHash;

    // Get previous event to verify chain
    let previousValid = true;
    if (event.previousHash) {
      const previousEvent = await prisma.auditLog.findFirst({
        where: { hash: event.previousHash },
      });
      previousValid = !!previousEvent;
    }

    res.json({
      eventId: event.id,
      currentHashValid: isValid,
      chainValid: previousValid,
      hash: event.hash,
      previousHash: event.previousHash,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to verify event');
    res
      .status(500)
      .json({ error: { code: 'VERIFICATION_ERROR', message: String(error) } });
  }
});

// Generate compliance report
app.post('/audit/compliance/report', async (req: Request, res: Response) => {
  try {
    const { framework, startDate, endDate } = req.body;

    if (!COMPLIANCE_CONFIGS[framework as keyof typeof COMPLIANCE_CONFIGS]) {
      return res.status(400).json({ error: 'Invalid compliance framework' });
    }

    const config = COMPLIANCE_CONFIGS[framework as keyof typeof COMPLIANCE_CONFIGS];

    const criticalEvents = await prisma.auditLog.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        complianceFrameworks: { hasSome: [framework] },
        eventType: { in: config.criticalEvents },
      },
    });

    const failedEvents = await prisma.auditLog.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        complianceFrameworks: { hasSome: [framework] },
        status: 'FAILURE',
      },
    });

    const allEvents = await prisma.auditLog.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        complianceFrameworks: { hasSome: [framework] },
      },
    });

    const complianceScore = Math.max(
      0,
      100 - (failedEvents.length / allEvents.length) * 100
    );

    const report: ComplianceReport = {
      id: crypto.randomUUID(),
      framework,
      period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      totalEvents: allEvents.length,
      criticalActions: criticalEvents.length,
      failedActions: failedEvents.length,
      complianceScore,
      recommendations: [
        ...(failedEvents.length > 10 ? ['Investigate failed actions'] : []),
        ...(complianceScore < 95
          ? ['Implement additional security controls']
          : []),
        'Review access logs regularly',
      ],
      generatedAt: new Date(),
    };

    // Cache report
    await redis.set(
      `compliance-report:${report.id}`,
      JSON.stringify(report),
      { EX: 604800 } // 7 days
    );

    res.json(report);
  } catch (error) {
    logger.error({ error }, 'Failed to generate compliance report');
    res.status(500).json({
      error: { code: 'REPORT_GENERATION_ERROR', message: String(error) },
    });
  }
});

// Export audit logs
app.get('/audit/export', async (req: Request, res: Response) => {
  try {
    const { format = 'json', startDate, endDate } = req.query;

    const events = await prisma.auditLog.findMany({
      where: {
        ...(startDate && {
          createdAt: { gte: new Date(startDate as string) },
        }),
        ...(endDate && { createdAt: { lte: new Date(endDate as string) } }),
      },
      orderBy: { createdAt: 'asc' },
    });

    if (format === 'csv') {
      // Convert to CSV
      const csvContent = [
        'ID,Timestamp,EventType,UserId,Action,Status,ResourceType,ResourceId',
        ...events.map(
          (e) =>
            `"${e.id}","${e.createdAt}","${e.eventType}","${e.userId}","${e.action}","${e.status}","${e.resourceType}","${e.resourceId}"`
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="audit-export.csv"'
      );
      res.send(csvContent);
    } else {
      // JSON export
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="audit-export.json"'
      );
      res.json(events);
    }
  } catch (error) {
    logger.error({ error }, 'Failed to export audit logs');
    res.status(500).json({
      error: { code: 'EXPORT_ERROR', message: String(error) },
    });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'audit-service' });
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
const PORT = process.env.PORT || 3004;

async function start() {
  try {
    await initializeKafkaConsumer();

    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Audit service started');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start audit service');
    process.exit(1);
  }
}

start();
