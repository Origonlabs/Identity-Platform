import { Test, TestingModule } from '@nestjs/testing';
import { OIDCService } from './oidc.service';
import { TokenService } from './token.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('OIDCService', () => {
  let service: OIDCService;
  let tokenService: TokenService;
  let prismaService: PrismaService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    emailVerified: true,
    profile: {
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
    },
  };

  const mockTokenService = {
    validateAccessToken: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    accessToken: {
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        ISSUER: 'https://auth.example.com',
        JWT_SECRET: 'test-secret',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OIDCService,
        { provide: TokenService, useValue: mockTokenService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OIDCService>(OIDCService);
    tokenService = module.get<TokenService>(TokenService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateIdToken', () => {
    const options = {
      userId: 'user-123',
      clientId: 'client-123',
      nonce: 'random-nonce',
      scope: 'openid email profile',
    };

    it('should generate ID token with required claims', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const idToken = await service.generateIdToken(options);

      expect(idToken).toBeDefined();
      expect(typeof idToken).toBe('string');

      const payload = JSON.parse(
        Buffer.from(idToken.split('.')[1], 'base64').toString(),
      );

      expect(payload).toHaveProperty('iss', 'https://auth.example.com');
      expect(payload).toHaveProperty('sub', options.userId);
      expect(payload).toHaveProperty('aud', options.clientId);
      expect(payload).toHaveProperty('nonce', options.nonce);
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
    });

    it('should include email claim when email scope requested', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const idToken = await service.generateIdToken({
        ...options,
        scope: 'openid email',
      });

      const payload = JSON.parse(
        Buffer.from(idToken.split('.')[1], 'base64').toString(),
      );

      expect(payload).toHaveProperty('email', mockUser.email);
      expect(payload).toHaveProperty('email_verified', mockUser.emailVerified);
    });

    it('should include profile claims when profile scope requested', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const idToken = await service.generateIdToken({
        ...options,
        scope: 'openid profile',
      });

      const payload = JSON.parse(
        Buffer.from(idToken.split('.')[1], 'base64').toString(),
      );

      expect(payload).toHaveProperty('name', mockUser.profile.name);
      expect(payload).toHaveProperty('picture', mockUser.profile.picture);
    });

    it('should not include email when scope not requested', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const idToken = await service.generateIdToken({
        ...options,
        scope: 'openid',
      });

      const payload = JSON.parse(
        Buffer.from(idToken.split('.')[1], 'base64').toString(),
      );

      expect(payload).not.toHaveProperty('email');
      expect(payload).toHaveProperty('sub');
    });
  });

  describe('getUserInfo', () => {
    const mockAccessToken = {
      id: 'token-123',
      userId: 'user-123',
      scope: 'openid email profile',
      expiresAt: new Date(Date.now() + 3600000),
      revoked: false,
    };

    it('should return user info for valid access token', async () => {
      mockTokenService.validateAccessToken.mockResolvedValue({
        sub: mockUser.id,
        scope: 'openid email profile',
      });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const userInfo = await service.getUserInfo('valid-token');

      expect(userInfo).toHaveProperty('sub', mockUser.id);
      expect(userInfo).toHaveProperty('email', mockUser.email);
      expect(userInfo).toHaveProperty('email_verified', mockUser.emailVerified);
      expect(userInfo).toHaveProperty('name', mockUser.profile.name);
    });

    it('should only return claims allowed by scope', async () => {
      mockTokenService.validateAccessToken.mockResolvedValue({
        sub: mockUser.id,
        scope: 'openid',
      });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const userInfo = await service.getUserInfo('valid-token');

      expect(userInfo).toHaveProperty('sub', mockUser.id);
      expect(userInfo).not.toHaveProperty('email');
      expect(userInfo).not.toHaveProperty('name');
    });

    it('should throw error for invalid token', async () => {
      mockTokenService.validateAccessToken.mockRejectedValue(
        new Error('Invalid token'),
      );

      await expect(service.getUserInfo('invalid-token')).rejects.toThrow();
    });
  });

  describe('getDiscoveryDocument', () => {
    it('should return OIDC discovery metadata', () => {
      const discovery = service.getDiscoveryDocument();

      expect(discovery).toHaveProperty('issuer', 'https://auth.example.com');
      expect(discovery).toHaveProperty('authorization_endpoint');
      expect(discovery).toHaveProperty('token_endpoint');
      expect(discovery).toHaveProperty('userinfo_endpoint');
      expect(discovery).toHaveProperty('jwks_uri');
      expect(discovery).toHaveProperty('response_types_supported');
      expect(discovery).toHaveProperty('subject_types_supported');
      expect(discovery).toHaveProperty('id_token_signing_alg_values_supported');
      expect(discovery).toHaveProperty('scopes_supported');
      expect(discovery.scopes_supported).toContain('openid');
      expect(discovery.scopes_supported).toContain('email');
      expect(discovery.scopes_supported).toContain('profile');
    });

    it('should include PKCE support', () => {
      const discovery = service.getDiscoveryDocument();

      expect(discovery).toHaveProperty('code_challenge_methods_supported');
      expect(discovery.code_challenge_methods_supported).toContain('S256');
      expect(discovery.code_challenge_methods_supported).toContain('plain');
    });
  });

  describe('getJWKS', () => {
    it('should return JSON Web Key Set', () => {
      const jwks = service.getJWKS();

      expect(jwks).toHaveProperty('keys');
      expect(Array.isArray(jwks.keys)).toBe(true);
      expect(jwks.keys.length).toBeGreaterThan(0);
      expect(jwks.keys[0]).toHaveProperty('kty');
      expect(jwks.keys[0]).toHaveProperty('use', 'sig');
      expect(jwks.keys[0]).toHaveProperty('alg');
    });
  });

  describe('validateIdToken', () => {
    it('should validate correct ID token structure', async () => {
      const validIdToken = await service.generateIdToken({
        userId: mockUser.id,
        clientId: 'client-123',
        nonce: 'nonce',
        scope: 'openid',
      });

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const isValid = await service.validateIdToken(validIdToken, 'client-123');

      expect(isValid).toBe(true);
    });

    it('should reject ID token with wrong audience', async () => {
      const idToken = await service.generateIdToken({
        userId: mockUser.id,
        clientId: 'client-123',
        nonce: 'nonce',
        scope: 'openid',
      });

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.validateIdToken(idToken, 'wrong-client-id'),
      ).rejects.toThrow();
    });

    it('should reject expired ID token', async () => {
      const expiredToken = await service.generateIdToken({
        userId: mockUser.id,
        clientId: 'client-123',
        nonce: 'nonce',
        scope: 'openid',
        expiresIn: -3600,
      });

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.validateIdToken(expiredToken, 'client-123'),
      ).rejects.toThrow();
    });
  });
});
