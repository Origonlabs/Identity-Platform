import { PrismaClient } from '@prisma/client';
import express, { Express, Request, Response } from 'express';
import { Kafka } from 'kafkajs';
import pino from 'pino';
import Redis from 'redis';

// Types
interface PermissionCheck {
  userId: string;
  resource: string;
  action: string;
  context?: Record<string, any>;
}

interface PermissionResult {
  allowed: boolean;
  reason: string;
  requiredRoles?: string[];
  enforcementPoint: string;
}

interface PolicyEvaluation {
  policyId: string;
  subjectId: string;
  resourceId: string;
  action: string;
  subjectAttributes?: Record<string, any>;
  resourceAttributes?: Record<string, any>;
  environmentAttributes?: Record<string, any>;
}

interface PolicyResult {
  decision: 'ALLOW' | 'DENY' | 'CONDITIONAL';
  conditions?: string[];
  explanation?: string;
  confidenceScore: number;
}

interface DeviceTrustRequest {
  userId: string;
  deviceId: string;
  deviceOs: string;
  osVersion: string;
  isEncrypted: boolean;
  antivirusEnabled: boolean;
  firewallEnabled: boolean;
  isManaged: boolean;
}

interface TrustScore {
  score: number;
  trustLevel: 'FULLY_TRUSTED' | 'TRUSTED' | 'CONDITIONALLY_TRUSTED' | 'UNTRUSTED';
  factors: Array<{ name: string; status: string; weight: number }>;
}

// Initialize
const prisma = new PrismaClient();
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

const kafka = new Kafka({
  clientId: 'authorization-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const kafkaProducer = kafka.producer();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

// Initialize Express
const app: Express = express();
app.use(express.json());

// Health endpoints
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'authorization-service' });
});

app.get('/ready', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redisClient.ping();
    res.json({ status: 'ready' });
  } catch (error) {
    logger.error(error);
    res.status(503).json({ status: 'not-ready' });
  }
});

// Authorization Service
class AuthorizationService {
  /**
   * Check user permission (RBAC)
   */
  async checkPermission(request: PermissionCheck): Promise<PermissionResult> {
    try {
      // Try cache first
      const cacheKey = `permission:${request.userId}:${request.resource}:${request.action}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        const result = JSON.parse(cached);
        if (Date.now() - result.cachedAt < 60000) {
          // 1 minute cache
          return result;
        }
      }

      // Get user roles
      const userRoles = await prisma.userRole.findMany({
        where: { user_id: request.userId },
        include: { role: { include: { permissions: true } } },
      });

      // Check if any role has the required permission
      const hasPermission = userRoles.some((ur) =>
        ur.role.permissions.some(
          (p) => p.resource === request.resource && p.action === request.action
        )
      );

      const result: PermissionResult = {
        allowed: hasPermission,
        reason: hasPermission ? 'Permission granted' : 'Permission denied',
        requiredRoles: !hasPermission
          ? userRoles.map((ur) => ur.role.name)
          : undefined,
        enforcementPoint: 'RBAC',
      };

      // Cache result
      await redisClient.setEx(
        cacheKey,
        60,
        JSON.stringify({ ...result, cachedAt: Date.now() })
      );

      // Log event
      await this.logAuthorizationEvent({
        eventType: hasPermission ? 'PERMISSION_ALLOWED' : 'PERMISSION_DENIED',
        userId: request.userId,
        resource: request.resource,
        action: request.action,
        result: hasPermission,
      });

      return result;
    } catch (error) {
      logger.error('Permission check failed:', error);
      throw error;
    }
  }

  /**
   * Evaluate policy (ABAC)
   */
  async evaluatePolicy(request: PolicyEvaluation): Promise<PolicyResult> {
    try {
      // Get policy
      const policy = await prisma.policy.findUnique({
        where: { id: request.policyId },
      });

      if (!policy) {
        return {
          decision: 'DENY',
          explanation: 'Policy not found',
          confidenceScore: 1.0,
        };
      }

      // Parse policy rules
      const rules = JSON.parse(policy.rules || '[]');

      // Evaluate all rules
      let decision: PolicyResult['decision'] = 'DENY';
      let conditions: string[] = [];
      let confidenceScore = 0;

      for (const rule of rules) {
        const ruleResult = this.evaluateRule(rule, {
          subject: request.subjectAttributes || {},
          resource: request.resourceAttributes || {},
          environment: request.environmentAttributes || {},
        });

        if (ruleResult.match === 'ALLOW') {
          decision = 'ALLOW';
          confidenceScore = Math.max(confidenceScore, ruleResult.confidence);
        } else if (ruleResult.match === 'CONDITIONAL') {
          decision = 'CONDITIONAL';
          conditions.push(ruleResult.condition);
          confidenceScore = Math.max(confidenceScore, ruleResult.confidence);
        }
      }

      const result: PolicyResult = {
        decision,
        conditions: conditions.length > 0 ? conditions : undefined,
        explanation: `Policy ${request.policyId} evaluated`,
        confidenceScore,
      };

      // Log event
      await kafkaProducer.send({
        topic: 'authorization-events',
        messages: [
          {
            key: request.subjectId,
            value: JSON.stringify({
              event_type: 'POLICY_EVALUATED',
              policy_id: request.policyId,
              subject_id: request.subjectId,
              decision: decision,
              confidence: confidenceScore,
              timestamp: new Date(),
            }),
          },
        ],
      });

      return result;
    } catch (error) {
      logger.error('Policy evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Evaluate device trust (Zero Trust)
   */
  async evaluateDeviceTrust(request: DeviceTrustRequest): Promise<TrustScore> {
    try {
      const factors: TrustScore['factors'] = [];
      let trustScore = 0;

      // OS & Version (20% weight)
      const osStatus = this.evaluateOSVersion(request.osVersion);
      factors.push({
        name: 'os_version',
        status: osStatus.status,
        weight: 0.2,
      });
      trustScore += osStatus.score * 0.2;

      // Encryption (20% weight)
      factors.push({
        name: 'encryption',
        status: request.isEncrypted ? 'PASS' : 'FAIL',
        weight: 0.2,
      });
      trustScore += (request.isEncrypted ? 1 : 0) * 0.2;

      // Antivirus (15% weight)
      factors.push({
        name: 'antivirus',
        status: request.antivirusEnabled ? 'PASS' : 'FAIL',
        weight: 0.15,
      });
      trustScore += (request.antivirusEnabled ? 1 : 0) * 0.15;

      // Firewall (15% weight)
      factors.push({
        name: 'firewall',
        status: request.firewallEnabled ? 'PASS' : 'FAIL',
        weight: 0.15,
      });
      trustScore += (request.firewallEnabled ? 1 : 0) * 0.15;

      // Device Management (30% weight)
      factors.push({
        name: 'device_management',
        status: request.isManaged ? 'PASS' : 'FAIL',
        weight: 0.3,
      });
      trustScore += (request.isManaged ? 1 : 0) * 0.3;

      // Determine trust level
      let trustLevel: TrustScore['trustLevel'];
      if (trustScore >= 0.9) {
        trustLevel = 'FULLY_TRUSTED';
      } else if (trustScore >= 0.7) {
        trustLevel = 'TRUSTED';
      } else if (trustScore >= 0.5) {
        trustLevel = 'CONDITIONALLY_TRUSTED';
      } else {
        trustLevel = 'UNTRUSTED';
      }

      const result: TrustScore = {
        score: trustScore,
        trustLevel,
        factors,
      };

      // Cache device trust
      await redisClient.setEx(
        `device_trust:${request.userId}:${request.deviceId}`,
        3600,
        JSON.stringify(result)
      );

      return result;
    } catch (error) {
      logger.error('Device trust evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    roleId: string,
    organizationId?: string
  ): Promise<void> {
    try {
      await prisma.userRole.create({
        data: {
          user_id: userId,
          role_id: roleId,
          organization_id: organizationId,
        },
      });

      // Invalidate user permission cache
      await redisClient.del(`user_roles:${userId}`);

      // Publish event
      await kafkaProducer.send({
        topic: 'authorization-events',
        messages: [
          {
            key: userId,
            value: JSON.stringify({
              event_type: 'ROLE_ASSIGNED',
              user_id: userId,
              role_id: roleId,
              timestamp: new Date(),
            }),
          },
        ],
      });

      logger.info(`Role ${roleId} assigned to user ${userId}`);
    } catch (error) {
      logger.error('Failed to assign role:', error);
      throw error;
    }
  }

  /**
   * Helper: Evaluate OS version
   */
  private evaluateOSVersion(osVersion: string): { status: string; score: number } {
    // Simplified version checking
    const minVersions: Record<string, number> = {
      iOS: 14,
      Android: 10,
      Windows: 10,
      macOS: 11,
      Linux: 5,
    };

    const version = parseInt(osVersion.split('.')[0]);
    const isSecure = version >= 14; // Simplified check

    return {
      status: isSecure ? 'PASS' : 'WARNING',
      score: isSecure ? 1.0 : 0.5,
    };
  }

  /**
   * Helper: Evaluate rule
   */
  private evaluateRule(
    rule: any,
    context: { subject: any; resource: any; environment: any }
  ): { match: 'ALLOW' | 'DENY' | 'CONDITIONAL'; confidence: number; condition?: string } {
    // Simplified rule evaluation
    if (rule.effect === 'Allow') {
      return { match: 'ALLOW', confidence: 0.9 };
    }
    return { match: 'DENY', confidence: 0.9 };
  }

  /**
   * Helper: Log authorization event
   */
  private async logAuthorizationEvent(event: any): Promise<void> {
    try {
      await kafkaProducer.send({
        topic: 'authorization-events',
        messages: [
          {
            key: event.userId,
            value: JSON.stringify({
              ...event,
              timestamp: new Date(),
            }),
          },
        ],
      });
    } catch (error) {
      logger.error('Failed to log authorization event:', error);
    }
  }
}

// REST API Routes
const authzService = new AuthorizationService();

app.post('/api/v1/authz/check-permission', async (req: Request, res: Response) => {
  try {
    const result = await authzService.checkPermission(req.body);
    res.json(result);
  } catch (error: any) {
    logger.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/authz/evaluate-policy', async (req: Request, res: Response) => {
  try {
    const result = await authzService.evaluatePolicy(req.body);
    res.json(result);
  } catch (error: any) {
    logger.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/authz/device-trust', async (req: Request, res: Response) => {
  try {
    const result = await authzService.evaluateDeviceTrust(req.body);
    res.json(result);
  } catch (error: any) {
    logger.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/authz/assign-role', async (req: Request, res: Response) => {
  try {
    await authzService.assignRole(
      req.body.userId,
      req.body.roleId,
      req.body.organizationId
    );
    res.json({ success: true });
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});

// Startup
async function startServer() {
  try {
    await redisClient.connect();
    logger.info('Connected to Redis');

    await kafkaProducer.connect();
    logger.info('Connected to Kafka');

    const kafkaAdmin = kafka.admin();
    await kafkaAdmin.connect();
    await kafkaAdmin.createTopics({
      topics: [
        {
          name: 'authorization-events',
          numPartitions: 3,
          replicationFactor: 1,
        },
      ],
      validateOnly: false,
      timeout: 30000,
    });
    await kafkaAdmin.disconnect();
    logger.info('Created Kafka topics');

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      logger.info(`Authorization Service listening on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await kafkaProducer.disconnect();
  await redisClient.disconnect();
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export { AuthorizationService };
