import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockPrismaService = {
    accessToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        JWT_SECRET: 'test-secret-key',
        ACCESS_TOKEN_EXPIRES_IN: 3600,
        REFRESH_TOKEN_EXPIRES_IN: 2592000,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    const tokenOptions = {
      clientId: 'client-123',
      userId: 'user-123',
      scope: 'openid email profile',
    };

    it('should generate and store access token', async () => {
      const mockToken = 'generated-jwt-token';
      mockJwtService.sign.mockReturnValue(mockToken);
      mockPrismaService.accessToken.create.mockResolvedValue({
        id: 'token-123',
        token: mockToken,
        tokenHash: expect.any(String),
        clientId: tokenOptions.clientId,
        userId: tokenOptions.userId,
        scope: tokenOptions.scope,
        expiresAt: expect.any(Date),
        createdAt: new Date(),
      });

      const result = await service.generateAccessToken(tokenOptions);

      expect(result).toHaveProperty('token', mockToken);
      expect(result).toHaveProperty('expiresIn', 3600);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: tokenOptions.userId,
          client_id: tokenOptions.clientId,
          scope: tokenOptions.scope,
        }),
        expect.objectContaining({
          expiresIn: 3600,
        }),
      );
      expect(mockPrismaService.accessToken.create).toHaveBeenCalled();
    });

    it('should include correct claims in JWT', async () => {
      mockJwtService.sign.mockReturnValue('token');
      mockPrismaService.accessToken.create.mockResolvedValue({
        token: 'token',
        expiresIn: 3600,
      });

      await service.generateAccessToken(tokenOptions);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: tokenOptions.userId,
          client_id: tokenOptions.clientId,
          scope: tokenOptions.scope,
          iat: expect.any(Number),
          exp: expect.any(Number),
        }),
        expect.any(Object),
      );
    });
  });

  describe('generateRefreshToken', () => {
    const tokenOptions = {
      clientId: 'client-123',
      userId: 'user-123',
      scope: 'openid email profile',
    };

    it('should generate and store refresh token', async () => {
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'rt-123',
        token: expect.any(String),
        tokenHash: expect.any(String),
        clientId: tokenOptions.clientId,
        userId: tokenOptions.userId,
        scope: tokenOptions.scope,
        expiresAt: expect.any(Date),
        revoked: false,
        createdAt: new Date(),
      });

      const result = await service.generateRefreshToken(tokenOptions);

      expect(result).toHaveProperty('token');
      expect(result.token).toHaveLength(64);
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: expect.any(String),
          tokenHash: expect.any(String),
          clientId: tokenOptions.clientId,
          userId: tokenOptions.userId,
          scope: tokenOptions.scope,
        }),
      });
    });

    it('should generate cryptographically secure random token', async () => {
      mockPrismaService.refreshToken.create.mockResolvedValue({
        token: 'token1',
      });

      const result1 = await service.generateRefreshToken(tokenOptions);
      const result2 = await service.generateRefreshToken(tokenOptions);

      expect(result1.token).not.toBe(result2.token);
    });
  });

  describe('validateAccessToken', () => {
    const mockToken = 'valid-jwt-token';

    it('should validate and return decoded token for valid JWT', async () => {
      const decodedPayload = {
        sub: 'user-123',
        client_id: 'client-123',
        scope: 'openid email',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockJwtService.verify.mockReturnValue(decodedPayload);
      mockPrismaService.accessToken.findUnique.mockResolvedValue({
        id: 'token-123',
        token: mockToken,
        clientId: 'client-123',
        userId: 'user-123',
        scope: 'openid email',
        expiresAt: new Date(Date.now() + 3600000),
        revoked: false,
      });

      const result = await service.validateAccessToken(mockToken);

      expect(result).toEqual(decodedPayload);
      expect(mockJwtService.verify).toHaveBeenCalledWith(mockToken);
    });

    it('should throw error for invalid JWT signature', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(service.validateAccessToken('invalid-token')).rejects.toThrow();
    });

    it('should throw error for expired token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.validateAccessToken(mockToken)).rejects.toThrow();
    });

    it('should throw error for revoked token', async () => {
      const decodedPayload = {
        sub: 'user-123',
        client_id: 'client-123',
        scope: 'openid email',
      };

      mockJwtService.verify.mockReturnValue(decodedPayload);
      mockPrismaService.accessToken.findUnique.mockResolvedValue({
        token: mockToken,
        revoked: true,
      });

      await expect(service.validateAccessToken(mockToken)).rejects.toThrow();
    });
  });

  describe('hashToken', () => {
    it('should generate consistent hash for same input', () => {
      const token = 'test-token-123';

      const hash1 = service.hashToken(token);
      const hash2 = service.hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = service.hashToken('token1');
      const hash2 = service.hashToken('token2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('revokeToken', () => {
    it('should revoke access token', async () => {
      const tokenId = 'token-123';
      mockPrismaService.accessToken.update.mockResolvedValue({
        id: tokenId,
        revoked: true,
      });

      await service.revokeAccessToken(tokenId);

      expect(mockPrismaService.accessToken.update).toHaveBeenCalledWith({
        where: { id: tokenId },
        data: { revoked: true },
      });
    });

    it('should revoke refresh token', async () => {
      const tokenId = 'rt-123';
      mockPrismaService.refreshToken.update.mockResolvedValue({
        id: tokenId,
        revoked: true,
      });

      await service.revokeRefreshToken(tokenId);

      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: tokenId },
        data: { revoked: true },
      });
    });
  });
});
