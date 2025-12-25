import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import express, { Request, Response } from 'express';
import { Kafka, Producer } from 'kafkajs';
import pino from 'pino';
import { createClient } from 'redis';

// Types
interface Tenant {
  id: string;
  name: string;
  domain: string;
  customDomain: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  plan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  subscription: SubscriptionInfo;
  features: FeatureFlags;
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

interface SubscriptionInfo {
  status: 'ACTIVE' | 'TRIAL' | 'PAUSED' | 'CANCELED';
  plan: string;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  nextBillingDate: Date;
  amount: number;
  currency: string;
}

interface FeatureFlags {
  mfa: boolean;
  webauthn: boolean;
  sso: boolean;
  scim: boolean;
  auditLogs: boolean;
  advancedAnalytics: boolean;
  customBranding: boolean;
  apiAccess: boolean;
}

interface TenantSettings {
  sessionTimeout: number;
  mfaRequired: boolean;
  passwordPolicy: PasswordPolicy;
  riskAssessment: RiskAssessmentConfig;
  dataResidency: string;
  dataEncryption: boolean;
}

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expirationDays: number;
}

interface RiskAssessmentConfig {
  enabled: boolean;
  threshold: number;
  enableGeoBlocking: boolean;
  enableDeviceFingerprinting: boolean;
}

interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  key: string;
  secret: string;
  permissions: string[];
  rateLimit: number;
  active: boolean;
  createdAt: Date;
  expiresAt: Date | null;
}

interface ProvisioningRequest {
  id: string;
  tenantId: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  resourceType: string;
  data: Record<string, unknown>;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  error: string | null;
  createdAt: Date;
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

// Middleware: API Key authentication
app.use((req: Request, res: Response, next) => {
  if (req.path === '/health') {
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  // Store for later use
  (req as any).apiKey = apiKey;
  next();
});

// Initialize services
const prisma = new PrismaClient();
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

const kafka = new Kafka({
  clientId: 'admin-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

let kafkaProducer: Producer;

// Initialize Kafka producer
async function initializeKafkaProducer() {
  kafkaProducer = kafka.producer();
  await kafkaProducer.connect();
  logger.info('Kafka producer initialized');
}

// API Endpoints

// CREATE TENANT
app.post('/tenants', async (req: Request, res: Response) => {
  try {
    const { name, domain, plan = 'STARTER' } = req.body;

    if (!name || !domain) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: name, domain' });
    }

    // Check domain uniqueness
    const existingTenant = await prisma.tenant.findUnique({
      where: { domain },
    });

    if (existingTenant) {
      return res.status(409).json({ error: 'Domain already in use' });
    }

    const defaultFeatures: FeatureFlags = {
      mfa: plan !== 'FREE',
      webauthn: plan === 'PROFESSIONAL' || plan === 'ENTERPRISE',
      sso: plan === 'ENTERPRISE',
      scim: plan === 'ENTERPRISE',
      auditLogs: plan !== 'FREE',
      advancedAnalytics: plan === 'PROFESSIONAL' || plan === 'ENTERPRISE',
      customBranding: plan === 'ENTERPRISE',
      apiAccess: plan !== 'FREE',
    };

    const defaultSettings: TenantSettings = {
      sessionTimeout: 3600,
      mfaRequired: plan === 'ENTERPRISE',
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialChars: plan !== 'FREE',
        expirationDays: plan === 'FREE' ? 0 : 90,
      },
      riskAssessment: {
        enabled: plan !== 'FREE',
        threshold: plan === 'ENTERPRISE' ? 50 : 70,
        enableGeoBlocking: plan === 'ENTERPRISE',
        enableDeviceFingerprinting: plan === 'PROFESSIONAL' || plan === 'ENTERPRISE',
      },
      dataResidency: 'US',
      dataEncryption: true,
    };

    const tenant = await prisma.tenant.create({
      data: {
        id: crypto.randomUUID(),
        name,
        domain,
        customDomain: null,
        status: 'ACTIVE',
        plan,
        subscription: {
          status: 'TRIAL',
          plan,
          billingCycle: 'MONTHLY',
          nextBillingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          amount: 0,
          currency: 'USD',
        },
        features: defaultFeatures,
        settings: defaultSettings,
      },
    });

    // Publish event
    await kafkaProducer.send({
      topic: 'admin.events',
      messages: [
        {
          value: JSON.stringify({
            type: 'tenant.created',
            tenantId: tenant.id,
            timestamp: new Date(),
          }),
        },
      ],
    });

    // Cache tenant
    await redis.set(
      `tenant:${tenant.id}`,
      JSON.stringify(tenant),
      { EX: 3600 }
    );

    res.status(201).json({
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
      plan: tenant.plan,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create tenant');
    res
      .status(500)
      .json({ error: { code: 'TENANT_CREATE_ERROR', message: String(error) } });
  }
});

// GET TENANT
app.get('/tenants/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check cache
    const cached = await redis.get(`tenant:${id}`);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const tenant = await prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    await redis.set(`tenant:${id}`, JSON.stringify(tenant), { EX: 3600 });

    res.json(tenant);
  } catch (error) {
    logger.error({ error }, 'Failed to get tenant');
    res.status(500).json({
      error: { code: 'TENANT_GET_ERROR', message: String(error) },
    });
  }
});

// UPDATE TENANT
app.patch('/tenants/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, plan, settings, customDomain } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(plan && { plan }),
        ...(settings && { settings }),
        ...(customDomain && { customDomain }),
      },
    });

    // Invalidate cache
    await redis.del(`tenant:${id}`);

    // Publish event
    await kafkaProducer.send({
      topic: 'admin.events',
      messages: [
        {
          value: JSON.stringify({
            type: 'tenant.updated',
            tenantId: tenant.id,
            timestamp: new Date(),
          }),
        },
      ],
    });

    res.json(tenant);
  } catch (error) {
    logger.error({ error }, 'Failed to update tenant');
    res.status(500).json({
      error: { code: 'TENANT_UPDATE_ERROR', message: String(error) },
    });
  }
});

// SUSPEND TENANT
app.post('/tenants/:id/suspend', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    await redis.del(`tenant:${id}`);

    // Publish event
    await kafkaProducer.send({
      topic: 'admin.events',
      messages: [
        {
          value: JSON.stringify({
            type: 'tenant.suspended',
            tenantId: tenant.id,
            reason,
            timestamp: new Date(),
          }),
        },
      ],
    });

    res.json({ message: 'Tenant suspended', tenantId: id });
  } catch (error) {
    logger.error({ error }, 'Failed to suspend tenant');
    res.status(500).json({
      error: { code: 'TENANT_SUSPEND_ERROR', message: String(error) },
    });
  }
});

// CREATE API KEY
app.post('/tenants/:tenantId/api-keys', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { name, permissions = ['read'], rateLimit = 1000, expiresAt } =
      req.body;

    const keyId = crypto.randomUUID();
    const keySecret = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(keySecret).digest('hex');

    const apiKey = await prisma.apiKey.create({
      data: {
        id: keyId,
        tenantId,
        name,
        key: `api_${keyId}`,
        secret: keyHash,
        permissions,
        rateLimit,
        active: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    res.status(201).json({
      id: apiKey.id,
      key: apiKey.key,
      secret: keySecret, // Only returned once
      permissions: apiKey.permissions,
      rateLimit: apiKey.rateLimit,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create API key');
    res.status(500).json({
      error: { code: 'API_KEY_CREATE_ERROR', message: String(error) },
    });
  }
});

// LIST API KEYS
app.get('/tenants/:tenantId/api-keys', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const apiKeys = await prisma.apiKey.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        key: true,
        permissions: true,
        active: true,
        createdAt: true,
        expiresAt: true,
        rateLimit: true,
      },
    });

    res.json({ apiKeys });
  } catch (error) {
    logger.error({ error }, 'Failed to list API keys');
    res.status(500).json({
      error: { code: 'API_KEY_LIST_ERROR', message: String(error) },
    });
  }
});

// REVOKE API KEY
app.delete(
  '/tenants/:tenantId/api-keys/:keyId',
  async (req: Request, res: Response) => {
    try {
      const { keyId } = req.params;

      await prisma.apiKey.update({
        where: { id: keyId },
        data: { active: false },
      });

      res.json({ message: 'API key revoked' });
    } catch (error) {
      logger.error({ error }, 'Failed to revoke API key');
      res.status(500).json({
        error: { code: 'API_KEY_REVOKE_ERROR', message: String(error) },
      });
    }
  }
);

// SCIM 2.0 PROVISIONING - Create User
app.post('/tenants/:tenantId/scim/Users', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { userName, name, emails, active = true } = req.body;

    const provisioningRequest = await prisma.provisioningRequest.create({
      data: {
        id: crypto.randomUUID(),
        tenantId,
        type: 'CREATE',
        resourceType: 'User',
        data: { userName, name, emails, active },
        status: 'PENDING',
        error: null,
      },
    });

    // Publish provisioning event
    await kafkaProducer.send({
      topic: 'provisioning.events',
      messages: [
        {
          value: JSON.stringify({
            type: 'user.provisioning.requested',
            provisioningRequestId: provisioningRequest.id,
            tenantId,
            userData: { userName, name, emails, active },
            timestamp: new Date(),
          }),
        },
      ],
    });

    res.status(201).json({
      id: `urn:ietf:params:scim:schemas:core:2.0:User:${provisioningRequest.id}`,
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      userName,
      name,
      emails,
      active,
      meta: {
        resourceType: 'User',
        created: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to provision user');
    res.status(500).json({
      error: { code: 'PROVISIONING_ERROR', message: String(error) },
    });
  }
});

// SCIM 2.0 - Get User
app.get('/tenants/:tenantId/scim/Users/:userId', async (
  req: Request,
  res: Response
) => {
  try {
    const { tenantId, userId } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenant: { id: tenantId },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: `urn:ietf:params:scim:schemas:core:2.0:User:${user.id}`,
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      userName: user.email,
      active: true,
      meta: {
        resourceType: 'User',
        created: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get SCIM user');
    res.status(500).json({
      error: { code: 'SCIM_GET_ERROR', message: String(error) },
    });
  }
});

// GET USAGE ANALYTICS
app.get('/tenants/:tenantId/analytics', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { period = 'month' } = req.query;

    // Get from cache or compute
    const cacheKey = `analytics:${tenantId}:${period}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Compute analytics (simplified)
    const analytics = {
      tenantId,
      period,
      stats: {
        activeUsers: Math.floor(Math.random() * 10000),
        loginAttempts: Math.floor(Math.random() * 50000),
        failedLogins: Math.floor(Math.random() * 5000),
        mfaAdoption: Math.floor(Math.random() * 100),
        averageSessionDuration: Math.floor(Math.random() * 3600),
        apiRequestsCount: Math.floor(Math.random() * 100000),
        dataStorageUsed: Math.floor(Math.random() * 100),
      },
      topServices: [
        { name: 'Authentication', requests: 45000 },
        { name: 'Authorization', requests: 35000 },
        { name: 'Token Management', requests: 25000 },
      ],
      errorRate: (Math.random() * 5).toFixed(2),
      generatedAt: new Date(),
    };

    await redis.set(cacheKey, JSON.stringify(analytics), { EX: 3600 });

    res.json(analytics);
  } catch (error) {
    logger.error({ error }, 'Failed to get analytics');
    res.status(500).json({
      error: { code: 'ANALYTICS_ERROR', message: String(error) },
    });
  }
});

// FEATURE FLAG MANAGEMENT
app.patch(
  '/tenants/:id/features',
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const features = req.body;

      const tenant = await prisma.tenant.update({
        where: { id },
        data: { features },
      });

      await redis.del(`tenant:${id}`);

      // Publish event
      await kafkaProducer.send({
        topic: 'admin.events',
        messages: [
          {
            value: JSON.stringify({
              type: 'features.updated',
              tenantId: tenant.id,
              features,
              timestamp: new Date(),
            }),
          },
        ],
      });

      res.json({ features: tenant.features });
    } catch (error) {
      logger.error({ error }, 'Failed to update features');
      res.status(500).json({
        error: { code: 'FEATURE_UPDATE_ERROR', message: String(error) },
      });
    }
  }
);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'admin-service' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await kafkaProducer.disconnect();
  await prisma.$disconnect();
  await redis.disconnect();
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3006;

async function start() {
  try {
    await initializeKafkaProducer();

    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Admin service started');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start admin service');
    process.exit(1);
  }
}

start();
