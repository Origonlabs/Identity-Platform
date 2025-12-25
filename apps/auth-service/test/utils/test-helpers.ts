import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { randomBytes, createHash } from 'crypto';

export class TestHelpers {
  constructor(private readonly prisma: PrismaService) {}

  async createTestClient(overrides: any = {}) {
    return this.prisma.client.create({
      data: {
        clientId: overrides.clientId || `test-client-${randomBytes(4).toString('hex')}`,
        clientSecret: overrides.clientSecret || 'test-secret',
        name: overrides.name || 'Test Client',
        redirectUris: overrides.redirectUris || ['http://localhost:3000/callback'],
        grantTypes: overrides.grantTypes || ['authorization_code', 'refresh_token'],
        allowedScopes: overrides.allowedScopes || ['openid', 'email', 'profile'],
        pkceRequired: overrides.pkceRequired || false,
        ...overrides,
      },
    });
  }

  async createTestUser(overrides: any = {}) {
    return this.prisma.user.create({
      data: {
        email: overrides.email || `test-${randomBytes(4).toString('hex')}@example.com`,
        emailVerified: overrides.emailVerified ?? true,
        passwordHash: overrides.passwordHash || 'hashed-password',
        mfaEnabled: overrides.mfaEnabled || false,
        ...overrides,
      },
    });
  }

  async createTestAuthorizationCode(clientId: string, userId: string, overrides: any = {}) {
    return this.prisma.authorizationCode.create({
      data: {
        code: overrides.code || randomBytes(32).toString('hex'),
        clientId,
        userId,
        scope: overrides.scope || 'openid email',
        redirectUri: overrides.redirectUri || 'http://localhost:3000/callback',
        expiresAt: overrides.expiresAt || new Date(Date.now() + 600000),
        codeChallenge: overrides.codeChallenge,
        codeChallengeMethod: overrides.codeChallengeMethod,
        ...overrides,
      },
    });
  }

  async createTestAccessToken(clientId: string, userId: string, overrides: any = {}) {
    const token = overrides.token || randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

    return this.prisma.accessToken.create({
      data: {
        token,
        tokenHash,
        clientId,
        userId,
        scope: overrides.scope || 'openid email',
        expiresAt: overrides.expiresAt || new Date(Date.now() + 3600000),
        revoked: overrides.revoked || false,
        ...overrides,
      },
    });
  }

  async createTestRefreshToken(clientId: string, userId: string, overrides: any = {}) {
    const token = overrides.token || randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

    return this.prisma.refreshToken.create({
      data: {
        token,
        tokenHash,
        clientId,
        userId,
        scope: overrides.scope || 'openid email',
        expiresAt: overrides.expiresAt || new Date(Date.now() + 2592000000),
        revoked: overrides.revoked || false,
        ...overrides,
      },
    });
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  generatePKCEPair() {
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
    };
  }

  async cleanupTestData(clientId?: string, userId?: string) {
    if (clientId) {
      await this.prisma.accessToken.deleteMany({ where: { clientId } });
      await this.prisma.refreshToken.deleteMany({ where: { clientId } });
      await this.prisma.authorizationCode.deleteMany({ where: { clientId } });
      await this.prisma.client.delete({ where: { id: clientId } });
    }

    if (userId) {
      await this.prisma.session.deleteMany({ where: { userId } });
      await this.prisma.oAuthAccount.deleteMany({ where: { userId } });
      await this.prisma.user.delete({ where: { id: userId } });
    }
  }

  parseJWT(token: string) {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    return {
      header: JSON.parse(Buffer.from(parts[0], 'base64').toString()),
      payload: JSON.parse(Buffer.from(parts[1], 'base64').toString()),
      signature: parts[2],
    };
  }

  async waitForCondition(
    condition: () => Promise<boolean>,
    timeout = 5000,
    interval = 100,
  ): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error('Condition timeout');
  }
}

export function createMockOAuthProvider() {
  return {
    getAuthorizationUrl: jest.fn(),
    getAccessToken: jest.fn(),
    getUserProfile: jest.fn(),
    refreshAccessToken: jest.fn(),
    revokeToken: jest.fn(),
  };
}

export function createMockPrismaService() {
  return {
    client: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    authorizationCode: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    accessToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    oAuthAccount: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };
}
