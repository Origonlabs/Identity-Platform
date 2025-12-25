import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import express, { Express, Request, Response } from 'express';
import { Kafka } from 'kafkajs';
import pino from 'pino';
import Redis from 'redis';

// Types
interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  attributes: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateUserRequest {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  attributes?: Record<string, any>;
}

interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  attributes?: Record<string, any>;
}

interface VerificationRequest {
  type: 'email' | 'phone';
  code: string;
  value?: string;
}

// Initialize
const prisma = new PrismaClient();
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

const kafka = new Kafka({
  clientId: 'identity-service',
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
  res.json({ status: 'ok', service: 'identity-service' });
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

// Identity Service
class IdentityService {
  /**
   * Create a new user
   */
  async createUser(request: CreateUserRequest): Promise<UserProfile> {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: request.email },
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password if provided
      let passwordHash: string | null = null;
      if (request.password) {
        passwordHash = await bcrypt.hash(request.password, 12);
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          email: request.email,
          password_hash: passwordHash,
          first_name: request.firstName,
          last_name: request.lastName,
          avatar_url: request.avatar,
          attributes: request.attributes || {},
        },
      });

      // Publish event
      await kafkaProducer.send({
        topic: 'identity-events',
        messages: [
          {
            key: user.id,
            value: JSON.stringify({
              event_type: 'UserCreated',
              user_id: user.id,
              email: user.email,
              timestamp: new Date(),
            }),
          },
        ],
      });

      return this.mapToUserProfile(user);
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      // Try cache first
      const cached = await redisClient.get(`user:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from DB
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return null;
      }

      const profile = this.mapToUserProfile(user);

      // Cache for 5 minutes
      await redisClient.setEx(`user:${userId}`, 300, JSON.stringify(profile));

      return profile;
    } catch (error) {
      logger.error('Failed to get user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(
    userId: string,
    request: UpdateUserRequest
  ): Promise<UserProfile> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          first_name: request.firstName,
          last_name: request.lastName,
          avatar_url: request.avatar,
          attributes: request.attributes,
        },
      });

      // Invalidate cache
      await redisClient.del(`user:${userId}`);

      // Publish event
      await kafkaProducer.send({
        topic: 'identity-events',
        messages: [
          {
            key: userId,
            value: JSON.stringify({
              event_type: 'UserUpdated',
              user_id: userId,
              changes: request,
              timestamp: new Date(),
            }),
          },
        ],
      });

      return this.mapToUserProfile(user);
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { deleted_at: new Date() },
      });

      // Invalidate cache
      await redisClient.del(`user:${userId}`);

      // Publish event
      await kafkaProducer.send({
        topic: 'identity-events',
        messages: [
          {
            key: userId,
            value: JSON.stringify({
              event_type: 'UserDeleted',
              user_id: userId,
              timestamp: new Date(),
            }),
          },
        ],
      });

      logger.info(`User ${userId} deleted`);
    } catch (error) {
      logger.error('Failed to delete user:', error);
      throw error;
    }
  }

  /**
   * Verify email or phone
   */
  async verify(userId: string, request: VerificationRequest): Promise<void> {
    try {
      // Get verification code from cache
      const storedCode = await redisClient.get(
        `verification:${userId}:${request.type}`
      );

      if (!storedCode || storedCode !== request.code) {
        throw new Error('Invalid or expired verification code');
      }

      // Update user
      if (request.type === 'email') {
        await prisma.user.update({
          where: { id: userId },
          data: { email_verified_at: new Date() },
        });
      } else if (request.type === 'phone') {
        await prisma.user.update({
          where: { id: userId },
          data: {
            phone_number: request.value,
            phone_verified_at: new Date(),
          },
        });
      }

      // Invalidate cache
      await redisClient.del(`user:${userId}`);
      await redisClient.del(`verification:${userId}:${request.type}`);

      // Publish event
      await kafkaProducer.send({
        topic: 'identity-events',
        messages: [
          {
            key: userId,
            value: JSON.stringify({
              event_type: `${request.type === 'email' ? 'Email' : 'Phone'}Verified`,
              user_id: userId,
              timestamp: new Date(),
            }),
          },
        ],
      });

      logger.info(`User ${userId} verified ${request.type}`);
    } catch (error) {
      logger.error('Verification failed:', error);
      throw error;
    }
  }

  /**
   * Get users by organization
   */
  async getOrganizationUsers(
    organizationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ users: UserProfile[]; total: number }> {
    try {
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: { organization_id: organizationId },
          take: limit,
          skip: offset,
        }),
        prisma.user.count({
          where: { organization_id: organizationId },
        }),
      ]);

      return {
        users: users.map((u) => this.mapToUserProfile(u)),
        total,
      };
    } catch (error) {
      logger.error('Failed to get organization users:', error);
      throw error;
    }
  }

  /**
   * Detect fraud (ML-based)
   */
  async detectFraud(userId: string, event: any): Promise<{ isFraud: boolean; score: number }> {
    try {
      // Get user history
      const recentLogins = await prisma.auditLog.findMany({
        where: {
          user_id: userId,
          event_type: 'AUTH_SUCCESS',
          created_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        },
        orderBy: { created_at: 'desc' },
        take: 100,
      });

      // Simple heuristic for now (would be ML model in production)
      let fraudScore = 0;

      // Check for rapid successive logins
      if (recentLogins.length > 0) {
        const lastLogin = recentLogins[0];
        const timeSinceLastLogin = Date.now() - lastLogin.created_at.getTime();

        if (timeSinceLastLogin < 60000) {
          // Less than 1 minute
          fraudScore += 0.3;
        }
      }

      // Check for unusual location
      if (recentLogins.length > 0) {
        const lastLocation = JSON.parse(recentLogins[0].metadata || '{}').location;
        const currentLocation = event.location;

        if (lastLocation && currentLocation) {
          const distance = this.calculateDistance(lastLocation, currentLocation);

          if (distance > 1000) {
            // > 1000 km
            fraudScore += 0.2;
          }
        }
      }

      // Check for new device
      const knownDevices = await redisClient.get(`known_devices:${userId}`);
      if (knownDevices && !JSON.parse(knownDevices).includes(event.deviceId)) {
        fraudScore += 0.1;
      }

      return {
        isFraud: fraudScore > 0.5,
        score: fraudScore,
      };
    } catch (error) {
      logger.error('Fraud detection failed:', error);
      return { isFraud: false, score: 0 };
    }
  }

  /**
   * Helper: Calculate distance between two coordinates
   */
  private calculateDistance(
    loc1: { lat: number; lng: number },
    loc2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
    const dLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((loc1.lat * Math.PI) / 180) *
        Math.cos((loc2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Helper: Map Prisma user to UserProfile
   */
  private mapToUserProfile(user: any): UserProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      avatar: user.avatar_url,
      emailVerified: !!user.email_verified_at,
      phoneVerified: !!user.phone_verified_at,
      attributes: user.attributes || {},
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}

// REST API Routes
const identityService = new IdentityService();

app.post('/api/v1/users', async (req: Request, res: Response) => {
  try {
    const user = await identityService.createUser(req.body);
    res.status(201).json(user);
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/v1/users/:userId', async (req: Request, res: Response) => {
  try {
    const user = await identityService.getUserById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    logger.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/v1/users/:userId', async (req: Request, res: Response) => {
  try {
    const user = await identityService.updateUser(req.params.userId, req.body);
    res.json(user);
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/v1/users/:userId', async (req: Request, res: Response) => {
  try {
    await identityService.deleteUser(req.params.userId);
    res.json({ success: true });
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/v1/users/:userId/verify', async (req: Request, res: Response) => {
  try {
    await identityService.verify(req.params.userId, req.body);
    res.json({ success: true });
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});

app.get(
  '/api/v1/organizations/:orgId/users',
  async (req: Request, res: Response) => {
    try {
      const result = await identityService.getOrganizationUsers(
        req.params.orgId,
        parseInt(req.query.limit as string) || 50,
        parseInt(req.query.offset as string) || 0
      );
      res.json(result);
    } catch (error: any) {
      logger.error(error);
      res.status(500).json({ error: error.message });
    }
  }
);

app.post('/api/v1/users/:userId/fraud-detection', async (req: Request, res: Response) => {
  try {
    const result = await identityService.detectFraud(
      req.params.userId,
      req.body
    );
    res.json(result);
  } catch (error: any) {
    logger.error(error);
    res.status(500).json({ error: error.message });
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
          name: 'identity-events',
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
      logger.info(`Identity Service listening on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await kafkaProducer.disconnect();
  await redisClient.disconnect();
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export { IdentityService };
