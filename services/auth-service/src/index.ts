import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import express, { Express, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Kafka } from 'kafkajs';
import pino from 'pino';
import Redis from 'redis';

// Types
interface AuthRequest {
  email: string;
  password: string;
  user_agent?: string;
  ip_address?: string;
  metadata?: Record<string, string>;
}

interface AuthResponse {
  success: boolean;
  user_id?: string;
  session_id?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: {
    code: string;
    message: string;
  };
}

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Redis
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Initialize Kafka
const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const kafkaProducer = kafka.producer();

// Initialize Logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

// Initialize Express
const app: Express = express();
app.use(express.json());

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// Ready Check Endpoint
app.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis
    const redisHealth = await redisClient.ping();
    
    // Check Kafka
    const kafkaAdmin = kafka.admin();
    await kafkaAdmin.connect();
    await kafkaAdmin.listBrokers();
    await kafkaAdmin.disconnect();

    res.json({ status: 'ready' });
  } catch (error) {
    logger.error(error);
    res.status(503).json({ status: 'not-ready' });
  }
});

// REST API Endpoints
class AuthService {
  /**
   * Authenticate user with password
   */
  async authenticateWithPassword(req: AuthRequest): Promise<AuthResponse> {
    try {
      // Validate input
      if (!req.email || !req.password) {
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email and password are required',
          },
        };
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: req.email },
      });

      if (!user || !user.password_hash) {
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        };
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(req.password, user.password_hash);

      if (!passwordMatch) {
        // Log failed attempt
        await this.logSecurityEvent({
          event_type: 'AUTH_FAILURE',
          user_id: user.id,
          reason: 'Invalid password',
          ip_address: req.ip_address,
        });

        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        };
      }

      // Check if account is verified
      if (!user.email_verified_at) {
        return {
          success: false,
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Please verify your email before logging in',
          },
        };
      }

      // Check if account is active
      if (user.deleted_at) {
        return {
          success: false,
          error: {
            code: 'ACCOUNT_DELETED',
            message: 'This account has been deleted',
          },
        };
      }

      // Assess risk
      const riskAssessment = await this.assessRisk({
        user_id: user.id,
        ip_address: req.ip_address,
        user_agent: req.user_agent,
        metadata: req.metadata,
      });

      // If risk is critical, require MFA
      if (riskAssessment.level === 'CRITICAL') {
        return {
          success: false,
          error: {
            code: 'RISK_DETECTED',
            message: 'Suspicious activity detected. Additional verification required.',
          },
        };
      }

      // Create session
      const sessionId = await this.createSession({
        user_id: user.id,
        ip_address: req.ip_address,
        user_agent: req.user_agent,
      });

      // Generate tokens
      const accessToken = this.generateAccessToken(user.id, sessionId);
      const refreshToken = this.generateRefreshToken(user.id, sessionId);

      // Log successful authentication
      await this.logSecurityEvent({
        event_type: 'AUTH_SUCCESS',
        user_id: user.id,
        ip_address: req.ip_address,
      });

      return {
        success: true,
        user_id: user.id,
        session_id: sessionId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
      };
    } catch (error) {
      logger.error(error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during authentication',
        },
      };
    }
  }

  /**
   * Assess authentication risk using ML-based approach
   */
  async assessRisk(request: {
    user_id: string;
    ip_address?: string;
    user_agent?: string;
    metadata?: Record<string, string>;
  }): Promise<{ level: string; score: number; signals: string[] }> {
    const signals: string[] = [];
    let riskScore = 0;

    // Check login velocity (impossible travel)
    const lastLogin = await redisClient.get(`last_login:${request.user_id}`);
    if (lastLogin) {
      const lastLoginTime = JSON.parse(lastLogin);
      if (lastLoginTime.ip !== request.ip_address) {
        signals.push('impossible_travel');
        riskScore += 0.3;
      }
    }

    // Check device
    const knownDevices = await redisClient.get(`known_devices:${request.user_id}`);
    if (knownDevices) {
      const devices = JSON.parse(knownDevices);
      if (!devices.includes(request.user_agent)) {
        signals.push('new_device');
        riskScore += 0.2;
      }
    } else {
      signals.push('new_device');
      riskScore += 0.2;
    }

    // Check failed login attempts
    const failedAttempts = await redisClient.get(
      `failed_attempts:${request.user_id}`
    );
    if (failedAttempts && parseInt(failedAttempts) > 3) {
      signals.push('velocity_check');
      riskScore += 0.25;
    }

    // Store current login
    await redisClient.setEx(
      `last_login:${request.user_id}`,
      86400,
      JSON.stringify({
        ip: request.ip_address,
        timestamp: new Date(),
      })
    );

    // Determine risk level
    let level = 'LOW';
    if (riskScore > 0.7) level = 'CRITICAL';
    else if (riskScore > 0.5) level = 'HIGH';
    else if (riskScore > 0.3) level = 'MEDIUM';

    return { level, score: riskScore, signals };
  }

  /**
   * Create user session
   */
  async createSession(request: {
    user_id: string;
    ip_address?: string;
    user_agent?: string;
  }): Promise<string> {
    const sessionId = require('crypto').randomUUID();

    await redisClient.setEx(
      `session:${sessionId}`,
      86400, // 24 hours
      JSON.stringify({
        user_id: request.user_id,
        ip_address: request.ip_address,
        user_agent: request.user_agent,
        created_at: new Date(),
      })
    );

    // Emit event
    await kafkaProducer.send({
      topic: 'auth-events',
      messages: [
        {
          key: request.user_id,
          value: JSON.stringify({
            event_type: 'SESSION_CREATED',
            user_id: request.user_id,
            session_id: sessionId,
            timestamp: new Date(),
          }),
        },
      ],
    });

    return sessionId;
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(userId: string, sessionId: string): string {
    const token = jwt.sign(
      {
        sub: userId,
        session_id: sessionId,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      {
        expiresIn: '1h',
        issuer: 'auth-service',
        audience: 'api',
      }
    );

    return token;
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(userId: string, sessionId: string): string {
    const token = jwt.sign(
      {
        sub: userId,
        session_id: sessionId,
        type: 'refresh',
      },
      process.env.JWT_SECRET || 'your-secret-key',
      {
        expiresIn: '7d',
        issuer: 'auth-service',
      }
    );

    return token;
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event: {
    event_type: string;
    user_id: string;
    reason?: string;
    ip_address?: string;
  }): Promise<void> {
    try {
      await kafkaProducer.send({
        topic: 'security-events',
        messages: [
          {
            key: event.user_id,
            value: JSON.stringify({
              ...event,
              timestamp: new Date(),
            }),
          },
        ],
      });
    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }
}

// REST API Routes
const authService = new AuthService();

app.post('/api/v1/auth/password', async (req: Request, res: Response) => {
  const result = await authService.authenticateWithPassword({
    email: req.body.email,
    password: req.body.password,
    user_agent: req.headers['user-agent'],
    ip_address: req.ip,
  });

  res.json(result);
});

// Initialize and start server
async function startServer() {
  try {
    // Connect Redis
    await redisClient.connect();
    logger.info('Connected to Redis');

    // Connect Kafka
    await kafkaProducer.connect();
    logger.info('Connected to Kafka');

    // Create Kafka topics
    const kafkaAdmin = kafka.admin();
    await kafkaAdmin.connect();
    await kafkaAdmin.createTopics({
      topics: [
        { name: 'auth-events', numPartitions: 3, replicationFactor: 1 },
        { name: 'security-events', numPartitions: 3, replicationFactor: 1 },
      ],
      validateOnly: false,
      timeout: 30000,
    });
    await kafkaAdmin.disconnect();
    logger.info('Created Kafka topics');

    // Start gRPC server (placeholder)
    logger.info('gRPC server would be started here');

    // Start REST server
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      logger.info(`Auth Service listening on port ${port}`);
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

export { AuthService };
