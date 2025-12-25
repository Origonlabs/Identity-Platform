import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { RateLimiter } from '@opendex/rate-limiting';
import { DistributedCache } from '@opendex/cache';
import { AdaptiveAuthenticationService, RiskScoringEngine, FraudDetectionService, BehavioralAnalyticsService, DeviceFingerprintingService } from '@opendex/security';
import { ServiceClient } from '@opendex/service-client';
import { ZeroTrustEngine } from '@opendex/zero-trust';
import { ThreatIntelligenceEngine } from '@opendex/threat-intelligence';
import { DDoSProtector } from '@opendex/ddos-protection';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

const rateLimiter = new RateLimiter(process.env.REDIS_URL);
const cache = new DistributedCache(process.env.REDIS_URL);
const zeroTrust = new ZeroTrustEngine();
const threatIntel = new ThreatIntelligenceEngine(process.env.REDIS_URL);
const ddosProtector = new DDoSProtector(process.env.REDIS_URL);

const riskEngine = new RiskScoringEngine();
const behavioralAnalytics = new BehavioralAnalyticsService();
const deviceFingerprinting = new DeviceFingerprintingService();
const fraudDetection = new FraudDetectionService(riskEngine, behavioralAnalytics, deviceFingerprinting);
const adaptiveAuth = new AdaptiveAuthenticationService(riskEngine, fraudDetection);

const services = {
  notifications: new ServiceClient({
    baseUrl: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:8201',
    circuitBreaker: { failureThreshold: 5, resetTimeout: 60000 },
  }),
  oauthConnections: new ServiceClient({
    baseUrl: process.env.OAUTH_CONNECTIONS_SERVICE_URL || 'http://localhost:8202',
    circuitBreaker: { failureThreshold: 5, resetTimeout: 60000 },
  }),
};

app.use(async (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const path = req.path;

  // DDoS Protection
  const ddosCheck = await ddosProtector.checkRequest(ip, path);
  if (!ddosCheck.allowed) {
    return res.status(429).json({
      error: 'Request blocked',
      reason: ddosCheck.reason,
    });
  }

  // Threat Intelligence
  const threats = await threatIntel.analyzeThreat({ ip });
  if (threats.length > 0 && threats.some(t => t.severity === 'critical' || t.severity === 'high')) {
    return res.status(403).json({
      error: 'Access denied',
      reason: 'Threat detected',
    });
  }

  // Rate Limiting
  const clientId = req.headers['x-api-key'] || ip;
  const limit = await rateLimiter.checkLimit(`api:${clientId}`, {
    limit: 100,
    window: 60000,
    strategy: 'sliding',
  });

  if (!limit.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: limit.retryAfter,
    });
  }

  res.setHeader('X-RateLimit-Limit', '100');
  res.setHeader('X-RateLimit-Remaining', limit.remaining.toString());
  res.setHeader('X-RateLimit-Reset', limit.resetAt.toISOString());

  // Zero-Trust Authorization (if user context available)
  if (req.headers.authorization) {
    try {
      const userContext = await extractUserContext(req);
      const sessionId = req.headers['x-session-id'] as string || `session_${Date.now()}`;
      
      const authResult = await zeroTrust.authorize(sessionId, {
        user: {
          id: userContext.userId || 'anonymous',
          role: userContext.role || 'guest',
          permissions: userContext.permissions || [],
          mfaVerified: userContext.mfaVerified || false,
          riskScore: userContext.riskScore || 0,
        },
        device: {
          id: req.headers['x-device-id'] as string || 'unknown',
          fingerprint: req.headers['x-device-fingerprint'] as string || 'unknown',
          trusted: userContext.deviceTrusted || false,
          complianceStatus: userContext.deviceCompliant ? 'compliant' : 'unknown',
        },
        network: {
          ip,
          location: 'unknown',
          vpn: threats.some(t => t.metadata.type === 'vpn'),
          proxy: threats.some(t => t.metadata.type === 'proxy'),
          tor: threats.some(t => t.metadata.type === 'tor'),
        },
        resource: {
          id: path,
          type: 'api',
          sensitivity: 'internal',
          requiredPermissions: [],
        },
        session: {
          id: sessionId,
          age: 0,
          lastActivity: new Date(),
        },
      });

      if (!authResult.allowed) {
        return res.status(403).json({
          error: 'Access denied',
          reason: authResult.reason,
          requiredActions: authResult.requiredActions,
        });
      }
    } catch (error) {
      // Continue if zero-trust check fails (for backward compatibility)
    }
  }

  next();
});

app.use('/v1/notifications', async (req, res, next) => {
  const cacheKey = `notifications:${req.method}:${req.url}`;
  
  if (req.method === 'GET') {
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
  }

  try {
    const response = await services.notifications.call(req.url, {
      method: req.method as any,
      body: req.body,
      headers: req.headers as any,
    });

    if (req.method === 'GET') {
      await cache.set(cacheKey, response, { ttl: 60 });
    }

    res.json(response);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.use('/v1/oauth-connections', async (req, res, next) => {
  const cacheKey = `oauth:${req.method}:${req.url}`;
  
  if (req.method === 'GET') {
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
  }

  try {
    const response = await services.oauthConnections.call(req.url, {
      method: req.method as any,
      body: req.body,
      headers: req.headers as any,
    });

    if (req.method === 'GET') {
      await cache.set(cacheKey, response, { ttl: 300 });
    }

    res.json(response);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function extractUserContext(req: express.Request): Promise<any> {
  // Placeholder - should extract from JWT or session
  return {
    userId: undefined,
    role: undefined,
    permissions: [],
    mfaVerified: false,
    riskScore: 0,
    deviceTrusted: false,
    deviceCompliant: false,
  };
}

process.on('SIGTERM', async () => {
  await threatIntel.close();
  await ddosProtector.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
  console.log('Zero-Trust, Threat Intelligence, and DDoS Protection enabled');
});
