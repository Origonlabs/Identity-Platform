import axios, { AxiosInstance } from 'axios';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * E2E Test Suite para Identity Platform Microservices
 * 
 * Cubre flujos completos de autenticación, autorización y auditoría
 */

describe('Identity Platform E2E Tests', () => {
  let client: AxiosInstance;
  const baseURL = process.env.API_URL || 'http://localhost:8000';
  let testUserId: string;
  let accessToken: string;
  let refreshToken: string;
  let sessionId: string;

  beforeAll(() => {
    client = axios.create({
      baseURL,
      validateStatus: () => true, // No throw on any status
    });
  });

  afterAll(() => {
    // Cleanup
  });

  describe('Authentication Flow', () => {
    it('should register a new user', async () => {
      const response = await client.post('/api/v1/users', {
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      testUserId = response.data.id;
    });

    it('should verify email', async () => {
      const response = await client.post(
        `/api/v1/users/${testUserId}/verify-email`,
        {
          code: '123456', // Would be from email in real scenario
        }
      );

      expect(response.status).toBe(200);
    });

    it('should authenticate with password', async () => {
      const response = await client.post('/api/v1/auth/password', {
        email: `test-${testUserId}@example.com`,
        password: 'SecurePassword123!',
      });

      expect(response.status).toBe(200);
      expect(response.data.access_token).toBeDefined();
      expect(response.data.refresh_token).toBeDefined();
      expect(response.data.session_id).toBeDefined();

      accessToken = response.data.access_token;
      refreshToken = response.data.refresh_token;
      sessionId = response.data.session_id;
    });

    it('should reject invalid credentials', async () => {
      const response = await client.post('/api/v1/auth/password', {
        email: `test-${testUserId}@example.com`,
        password: 'WrongPassword',
      });

      expect(response.status).toBe(401);
      expect(response.data.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should validate session', async () => {
      const response = await client.post('/api/v1/sessions/validate', {
        session_id: sessionId,
      });

      expect(response.status).toBe(200);
      expect(response.data.valid).toBe(true);
    });

    it('should refresh access token', async () => {
      const response = await client.post('/api/v1/tokens/refresh', {
        refresh_token: refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.data.access_token).toBeDefined();

      accessToken = response.data.access_token;
    });
  });

  describe('Authorization Flow', () => {
    it('should assign role to user', async () => {
      const response = await client.post(
        `/api/v1/authz/roles/${testUserId}`,
        {
          role_id: 'editor',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(200);
    });

    it('should check permission', async () => {
      const response = await client.post(
        '/api/v1/authz/check-permission',
        {
          user_id: testUserId,
          resource: 'documents',
          action: 'create',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.allowed).toBeDefined();
    });

    it('should evaluate policy with attributes', async () => {
      const response = await client.post(
        '/api/v1/authz/evaluate-policy',
        {
          policy_id: 'time-based-access',
          subject_id: testUserId,
          resource_id: 'sensitive-document',
          action: 'read',
          subject_attributes: {
            department: 'engineering',
            clearanceLevel: 'secret',
          },
          environment_attributes: {
            time: new Date().toISOString(),
            ipAddress: '192.168.1.1',
          },
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(['ALLOW', 'DENY', 'CONDITIONAL']).toContain(response.data.decision);
    });

    it('should evaluate device trust', async () => {
      const response = await client.post(
        '/api/v1/authz/device-trust',
        {
          user_id: testUserId,
          device_id: 'device-123',
          device_os: 'iOS',
          device_os_version: '17.0',
          device_encrypted: true,
          antivirus_enabled: true,
          firewall_enabled: true,
          device_age_days: 30,
          is_managed_device: true,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(['FULLY_TRUSTED', 'TRUSTED', 'CONDITIONALLY_TRUSTED', 'UNTRUSTED']).toContain(
        response.data.trust_level
      );
    });
  });

  describe('Audit & Compliance', () => {
    it('should log security event', async () => {
      const response = await client.post(
        '/api/v1/audit/events',
        {
          event_type: 'AUTH_SUCCESS',
          user_id: testUserId,
          action: 'LOGIN',
          status: 'SUCCESS',
          ip_address: '192.168.1.1',
          metadata: { device: 'mobile', os: 'iOS' },
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.event_id).toBeDefined();
    });

    it('should retrieve audit logs', async () => {
      const response = await client.get(
        `/api/v1/audit/logs?user_id=${testUserId}&limit=10`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.events)).toBe(true);
    });

    it('should generate compliance report', async () => {
      const response = await client.post(
        '/api/v1/audit/compliance-report',
        {
          report_type: 'SOC2',
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: new Date(),
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.report_id).toBeDefined();
      expect(['COMPLIANT', 'NON_COMPLIANT', 'PARTIAL']).toContain(
        response.data.soc2_status.status
      );
    });
  });

  describe('Webhook Flow', () => {
    it('should create webhook', async () => {
      const response = await client.post(
        '/api/v1/webhooks',
        {
          event_type: 'auth.success',
          url: 'https://webhook.example.com/auth',
          secret: 'webhook-secret-key',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
    });

    it('should list webhook deliveries', async () => {
      const webhookId = 'webhook-123'; // From previous test
      const response = await client.get(
        `/api/v1/webhooks/${webhookId}/deliveries`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.deliveries)).toBe(true);
    });
  });

  describe('Risk Assessment', () => {
    it('should assess authentication risk', async () => {
      const response = await client.post(
        '/api/v1/auth/risk-assessment',
        {
          user_id: testUserId,
          ip_address: '203.0.113.42',
          user_agent: 'Mozilla/5.0...',
          country: 'CN',
          city: 'Beijing',
          latitude: 39.9,
          longitude: 116.4,
          is_new_device: true,
          failed_attempts_last_10min: 2,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(response.data.level);
      expect(response.data.score).toBeDefined();
      expect(Array.isArray(response.data.signals)).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('auth endpoint should respond within 150ms (p99)', async () => {
      const iterations = 10;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await client.post('/api/v1/auth/password', {
          email: `test-${testUserId}@example.com`,
          password: 'SecurePassword123!',
        });
        durations.push(Date.now() - start);
      }

      durations.sort((a, b) => a - b);
      const p99 = durations[Math.floor(durations.length * 0.99)];

      expect(p99).toBeLessThan(150);
    });

    it('authz endpoint should respond within 20ms (p99)', async () => {
      const iterations = 10;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await client.post('/api/v1/authz/check-permission', {
          user_id: testUserId,
          resource: 'documents',
          action: 'read',
        });
        durations.push(Date.now() - start);
      }

      durations.sort((a, b) => a - b);
      const p99 = durations[Math.floor(durations.length * 0.99)];

      expect(p99).toBeLessThan(20);
    });
  });

  describe('Cleanup', () => {
    it('should revoke session', async () => {
      const response = await client.post(
        '/api/v1/sessions/revoke',
        {
          session_id: sessionId,
          reason: 'TEST_CLEANUP',
        }
      );

      expect(response.status).toBe(200);
    });

    it('should revoke all user tokens', async () => {
      const response = await client.post(
        `/api/v1/users/${testUserId}/revoke-all-tokens`,
        {
          reason: 'TEST_CLEANUP',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(200);
    });

    it('should delete user', async () => {
      const response = await client.delete(
        `/api/v1/users/${testUserId}`
      );

      expect(response.status).toBe(200);
    });
  });
});
