import Redis from 'ioredis';
import { SignJWT, jwtVerify } from 'jose';
import type { Session, SessionPolicy, SessionActivity } from './types';
import { SessionPolicyEngine } from './session-policy';

export class AdvancedSessionManager {
  private readonly redis: Redis;
  private readonly policyEngine: SessionPolicyEngine;
  private readonly secretKey: Uint8Array;

  constructor(redisUrl?: string, secretKey?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.policyEngine = new SessionPolicyEngine();
    this.secretKey = new TextEncoder().encode(
      secretKey || process.env.SESSION_SECRET_KEY || 'default-secret-key-change-in-production'
    );
  }

  async createSession(
    userId: string,
    policy: SessionPolicy,
    metadata: {
      ip: string;
      userAgent: string;
      deviceId?: string;
      location?: Session['location'];
      riskLevel?: Session['riskLevel'];
      mfaVerified?: boolean;
    }
  ): Promise<{ session: Session; token: string }> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + policy.maxDuration);

    const session: Session = {
      id: sessionId,
      userId,
      deviceId: metadata.deviceId,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      createdAt: now,
      lastActivityAt: now,
      expiresAt,
      metadata: {},
      riskLevel: metadata.riskLevel || 'low',
      mfaVerified: metadata.mfaVerified || false,
      location: metadata.location,
    };

    const token = await this.generateToken(session);

    await this.storeSession(session);
    await this.trackUserSession(userId, sessionId);

    return { session, token };
  }

  async validateSession(token: string, policy: SessionPolicy): Promise<{
    valid: boolean;
    session?: Session;
    reason?: string;
    action?: 'extend' | 'revoke' | 'require_reauth';
  }> {
    try {
      const { payload } = await jwtVerify(token, this.secretKey);
      const sessionId = payload.sid as string;

      const session = await this.getSession(sessionId);
      if (!session) {
        return { valid: false, reason: 'Session not found' };
      }

      const evaluation = this.policyEngine.evaluatePolicy(session, policy);
      if (!evaluation.valid) {
        return evaluation;
      }

      await this.updateActivity(sessionId);

      if (this.policyEngine.shouldExtendSession(session, policy)) {
        const newExpiry = this.policyEngine.calculateNewExpiry(session, policy);
        await this.extendSession(sessionId, newExpiry);
        return { valid: true, session: { ...session, expiresAt: newExpiry }, action: 'extend' };
      }

      return { valid: true, session };
    } catch (error) {
      return { valid: false, reason: 'Invalid token' };
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.revokedAt = new Date();
      await this.storeSession(session);
      await this.removeUserSession(session.userId, sessionId);
    }
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const sessionIds = await this.getUserSessions(userId);
    
    for (const sessionId of sessionIds) {
      if (sessionId !== exceptSessionId) {
        await this.revokeSession(sessionId);
      }
    }
  }

  async getActiveSessions(userId: string): Promise<Session[]> {
    const sessionIds = await this.getUserSessions(userId);
    const sessions: Session[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session && !session.revokedAt && new Date() < session.expiresAt) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  async recordActivity(sessionId: string, activity: SessionActivity): Promise<void> {
    const key = `session:activity:${sessionId}`;
    await this.redis.lpush(key, JSON.stringify(activity));
    await this.redis.ltrim(key, 0, 99);
    await this.redis.expire(key, 86400);
  }

  private async generateToken(session: Session): Promise<string> {
    const jwt = await new SignJWT({ sid: session.id, uid: session.userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(session.expiresAt)
      .sign(this.secretKey);

    return jwt;
  }

  private async storeSession(session: Session): Promise<void> {
    const key = `session:${session.id}`;
    const ttl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
    
    await this.redis.setex(key, ttl, JSON.stringify(session));
  }

  private async getSession(sessionId: string): Promise<Session | null> {
    const key = `session:${sessionId}`;
    const data = await this.redis.get(key);
    
    if (!data) return null;
    
    const session = JSON.parse(data) as Session;
    session.createdAt = new Date(session.createdAt);
    session.lastActivityAt = new Date(session.lastActivityAt);
    session.expiresAt = new Date(session.expiresAt);
    if (session.revokedAt) {
      session.revokedAt = new Date(session.revokedAt);
    }
    
    return session;
  }

  private async updateActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.lastActivityAt = new Date();
      await this.storeSession(session);
    }
  }

  private async extendSession(sessionId: string, newExpiry: Date): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.expiresAt = newExpiry;
      await this.storeSession(session);
    }
  }

  private async trackUserSession(userId: string, sessionId: string): Promise<void> {
    const key = `user:sessions:${userId}`;
    await this.redis.sadd(key, sessionId);
    await this.redis.expire(key, 86400 * 30);
  }

  private async removeUserSession(userId: string, sessionId: string): Promise<void> {
    const key = `user:sessions:${userId}`;
    await this.redis.srem(key, sessionId);
  }

  private async getUserSessions(userId: string): Promise<string[]> {
    const key = `user:sessions:${userId}`;
    return await this.redis.smembers(key);
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
