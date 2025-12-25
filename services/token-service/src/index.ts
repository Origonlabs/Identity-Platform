import axios from 'axios';
import express, { Express, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Kafka } from 'kafkajs';
import pino from 'pino';
import Redis from 'redis';

// Types
interface TokenRequest {
  userId: string;
  scopes?: string[];
  expiresInSeconds?: number;
  audience?: string;
  claims?: Record<string, any>;
}

interface RefreshTokenRequest {
  refreshToken: string;
  scopes?: string[];
}

interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken?: string;
  scope?: string;
}

interface TokenValidation {
  valid: boolean;
  expired: boolean;
  claims?: any;
  error?: string;
}

interface M2MTokenRequest {
  clientId: string;
  clientSecret: string;
  scopes?: string[];
  expiresInSeconds?: number;
}

// Initialize
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

const kafka = new Kafka({
  clientId: 'token-service',
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
  res.json({ status: 'ok', service: 'token-service' });
});

app.get('/ready', async (req: Request, res: Response) => {
  try {
    await redisClient.ping();
    // Check Vault
    const vaultAddr = process.env.VAULT_ADDR || 'http://vault:8200';
    const vaultToken = process.env.VAULT_TOKEN;
    await axios.get(`${vaultAddr}/v1/sys/health`, {
      headers: { 'X-Vault-Token': vaultToken },
    });
    res.json({ status: 'ready' });
  } catch (error) {
    logger.error(error);
    res.status(503).json({ status: 'not-ready' });
  }
});

// Token Service
class TokenService {
  private jwtSecret: string;
  private vaultAddr: string;
  private vaultToken: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.vaultAddr = process.env.VAULT_ADDR || 'http://vault:8200';
    this.vaultToken = process.env.VAULT_TOKEN || '';
  }

  /**
   * Issue access token
   */
  async issueAccessToken(request: TokenRequest): Promise<TokenResponse> {
    try {
      const expiresIn = request.expiresInSeconds || 3600; // 1 hour default

      const token = jwt.sign(
        {
          sub: request.userId,
          ...request.claims,
        },
        this.jwtSecret,
        {
          expiresIn,
          issuer: 'token-service',
          audience: request.audience || 'api',
          scope: request.scopes?.join(' ') || '',
        }
      );

      // Store token metadata in Redis
      await redisClient.setEx(
        `token:${request.userId}:${token}`,
        expiresIn,
        JSON.stringify({
          userId: request.userId,
          scopes: request.scopes || [],
          issuedAt: new Date(),
        })
      );

      // Log event
      await this.logTokenEvent({
        eventType: 'TOKEN_ISSUED',
        userId: request.userId,
        tokenType: 'access',
        scopes: request.scopes,
      });

      return {
        accessToken: token,
        tokenType: 'Bearer',
        expiresIn,
        scope: request.scopes?.join(' '),
      };
    } catch (error) {
      logger.error('Failed to issue access token:', error);
      throw error;
    }
  }

  /**
   * Issue refresh token
   */
  async issueRefreshToken(request: TokenRequest): Promise<string> {
    try {
      const expiresIn = request.expiresInSeconds || 604800; // 7 days

      const refreshToken = jwt.sign(
        {
          sub: request.userId,
          type: 'refresh',
          scopes: request.scopes || [],
        },
        this.jwtSecret,
        {
          expiresIn,
          issuer: 'token-service',
        }
      );

      // Store in Redis for revocation tracking
      await redisClient.setEx(
        `refresh_token:${request.userId}:${refreshToken}`,
        expiresIn,
        JSON.stringify({
          userId: request.userId,
          scopes: request.scopes || [],
          issuedAt: new Date(),
        })
      );

      return refreshToken;
    } catch (error) {
      logger.error('Failed to issue refresh token:', error);
      throw error;
    }
  }

  /**
   * Issue M2M token (Machine-to-Machine)
   */
  async issueM2MToken(request: M2MTokenRequest): Promise<TokenResponse> {
    try {
      // Verify client credentials
      const isValid = await this.verifyM2MCredentials(
        request.clientId,
        request.clientSecret
      );

      if (!isValid) {
        throw new Error('Invalid client credentials');
      }

      const expiresIn = request.expiresInSeconds || 3600;

      const token = jwt.sign(
        {
          sub: request.clientId,
          type: 'm2m',
        },
        this.jwtSecret,
        {
          expiresIn,
          issuer: 'token-service',
          scope: request.scopes?.join(' ') || '',
        }
      );

      await this.logTokenEvent({
        eventType: 'M2M_TOKEN_ISSUED',
        clientId: request.clientId,
        scopes: request.scopes,
      });

      return {
        accessToken: token,
        tokenType: 'Bearer',
        expiresIn,
      };
    } catch (error) {
      logger.error('Failed to issue M2M token:', error);
      throw error;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(request: RefreshTokenRequest): Promise<TokenResponse> {
    try {
      // Validate refresh token
      const decoded = jwt.verify(request.refreshToken, this.jwtSecret) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      // Check if token is revoked
      const isRevoked = await redisClient.get(
        `revoked_token:${request.refreshToken}`
      );
      if (isRevoked) {
        throw new Error('Token has been revoked');
      }

      // Issue new access token
      const newToken = await this.issueAccessToken({
        userId: decoded.sub,
        scopes: request.scopes || decoded.scopes,
        expiresInSeconds: 3600,
      });

      return newToken;
    } catch (error) {
      logger.error('Failed to refresh token:', error);
      throw error;
    }
  }

  /**
   * Validate token
   */
  async validateToken(token: string, checkRevocation: boolean = true): Promise<TokenValidation> {
    try {
      if (checkRevocation) {
        // Check if revoked
        const isRevoked = await redisClient.get(`revoked_token:${token}`);
        if (isRevoked) {
          return {
            valid: false,
            expired: false,
            error: 'Token has been revoked',
          };
        }
      }

      const decoded = jwt.verify(token, this.jwtSecret);

      return {
        valid: true,
        expired: false,
        claims: decoded,
      };
    } catch (error: any) {
      return {
        valid: false,
        expired: error.name === 'TokenExpiredError',
        error: error.message,
      };
    }
  }

  /**
   * Revoke token
   */
  async revokeToken(token: string, reason?: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any;

      if (decoded && decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);

        if (ttl > 0) {
          await redisClient.setEx(`revoked_token:${token}`, ttl, reason || 'revoked');
        }
      }

      await this.logTokenEvent({
        eventType: 'TOKEN_REVOKED',
        reason: reason || 'user_requested',
      });
    } catch (error) {
      logger.error('Failed to revoke token:', error);
      throw error;
    }
  }

  /**
   * Revoke all user tokens
   */
  async revokeAllUserTokens(userId: string, reason?: string): Promise<void> {
    try {
      // Get all user tokens from Redis
      const keys = await redisClient.keys(`token:${userId}:*`);

      for (const key of keys) {
        await redisClient.del(key);
      }

      // Also revoke refresh tokens
      const refreshKeys = await redisClient.keys(`refresh_token:${userId}:*`);
      for (const key of refreshKeys) {
        await redisClient.del(key);
      }

      await this.logTokenEvent({
        eventType: 'ALL_TOKENS_REVOKED',
        userId,
        reason: reason || 'user_requested',
      });

      logger.info(`All tokens revoked for user ${userId}`);
    } catch (error) {
      logger.error('Failed to revoke all user tokens:', error);
      throw error;
    }
  }

  /**
   * Get token from Vault (secret rotation)
   */
  async getVaultSecret(path: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.vaultAddr}/v1/${path}`,
        {
          headers: { 'X-Vault-Token': this.vaultToken },
        }
      );

      return response.data.data.data.value;
    } catch (error) {
      logger.error('Failed to get Vault secret:', error);
      throw error;
    }
  }

  /**
   * Helper: Verify M2M credentials
   */
  private async verifyM2MCredentials(
    clientId: string,
    clientSecret: string
  ): Promise<boolean> {
    try {
      // In production, verify from database
      // For now, simple validation
      return clientId.length > 0 && clientSecret.length > 0;
    } catch (error) {
      logger.error('Failed to verify M2M credentials:', error);
      return false;
    }
  }

  /**
   * Helper: Log token event
   */
  private async logTokenEvent(event: any): Promise<void> {
    try {
      await kafkaProducer.send({
        topic: 'token-events',
        messages: [
          {
            key: event.userId || event.clientId || 'system',
            value: JSON.stringify({
              ...event,
              timestamp: new Date(),
            }),
          },
        ],
      });
    } catch (error) {
      logger.error('Failed to log token event:', error);
    }
  }
}

// REST API Routes
const tokenService = new TokenService();

app.post('/api/v1/tokens/issue', async (req: Request, res: Response) => {
  try {
    const result = await tokenService.issueAccessToken(req.body);
    res.json(result);
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/v1/tokens/refresh', async (req: Request, res: Response) => {
  try {
    const result = await tokenService.refreshToken(req.body);
    res.json(result);
  } catch (error: any) {
    logger.error(error);
    res.status(401).json({ error: error.message });
  }
});

app.post('/api/v1/tokens/m2m', async (req: Request, res: Response) => {
  try {
    const result = await tokenService.issueM2MToken(req.body);
    res.json(result);
  } catch (error: any) {
    logger.error(error);
    res.status(401).json({ error: error.message });
  }
});

app.post('/api/v1/tokens/validate', async (req: Request, res: Response) => {
  try {
    const result = await tokenService.validateToken(
      req.body.token,
      req.body.checkRevocation !== false
    );
    res.json(result);
  } catch (error: any) {
    logger.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/tokens/revoke', async (req: Request, res: Response) => {
  try {
    await tokenService.revokeToken(req.body.token, req.body.reason);
    res.json({ success: true });
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/v1/tokens/revoke-all', async (req: Request, res: Response) => {
  try {
    await tokenService.revokeAllUserTokens(req.body.userId, req.body.reason);
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
          name: 'token-events',
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
      logger.info(`Token Service listening on port ${port}`);
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
  process.exit(0);
});

startServer();

export { TokenService };
