import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { OAuth2Service } from './oauth2.service';
import { TokenService } from './token.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

describe('OAuth2Service', () => {
  let service: OAuth2Service;
  let prismaService: PrismaService;
  let tokenService: TokenService;

  const mockClient = {
    id: 'client-123',
    clientId: 'test-client',
    clientSecret: 'test-secret',
    redirectUris: ['http://localhost:3000/callback'],
    grantTypes: ['authorization_code', 'refresh_token'],
    allowedScopes: ['openid', 'email', 'profile'],
    pkceRequired: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    emailVerified: true,
    passwordHash: 'hashed',
    mfaEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    client: {
      findUnique: jest.fn(),
    },
    authorizationCode: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    accessToken: {
      findUnique: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockTokenService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    hashToken: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        AUTHORIZATION_CODE_EXPIRES_IN: 600,
        ACCESS_TOKEN_EXPIRES_IN: 3600,
        REFRESH_TOKEN_EXPIRES_IN: 2592000,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuth2Service,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OAuth2Service>(OAuth2Service);
    prismaService = module.get<PrismaService>(PrismaService);
    tokenService = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authorize', () => {
    const authorizeDto = {
      response_type: 'code',
      client_id: 'test-client',
      redirect_uri: 'http://localhost:3000/callback',
      scope: 'openid email',
      state: 'random-state',
    };

    it('should generate authorization code for valid request', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      mockPrismaService.authorizationCode.create.mockResolvedValue({
        code: 'auth-code-123',
        clientId: mockClient.id,
        userId: mockUser.id,
        scope: 'openid email',
        redirectUri: authorizeDto.redirect_uri,
        expiresAt: new Date(Date.now() + 600000),
      });

      const result = await service.authorize(authorizeDto, mockUser.id);

      expect(result).toHaveProperty('code');
      expect(result.state).toBe(authorizeDto.state);
      expect(mockPrismaService.client.findUnique).toHaveBeenCalledWith({
        where: { clientId: authorizeDto.client_id },
      });
      expect(mockPrismaService.authorizationCode.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid client', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(null);

      await expect(service.authorize(authorizeDto, mockUser.id)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException for invalid redirect_uri', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      const invalidDto = {
        ...authorizeDto,
        redirect_uri: 'http://evil.com/callback',
      };

      await expect(service.authorize(invalidDto, mockUser.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for unsupported grant type', async () => {
      const clientWithoutAuthCode = {
        ...mockClient,
        grantTypes: ['client_credentials'],
      };
      mockPrismaService.client.findUnique.mockResolvedValue(clientWithoutAuthCode);

      await expect(service.authorize(authorizeDto, mockUser.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate PKCE when required', async () => {
      const pkceClient = { ...mockClient, pkceRequired: true };
      mockPrismaService.client.findUnique.mockResolvedValue(pkceClient);
      const dtoWithoutPKCE = { ...authorizeDto };

      await expect(service.authorize(dtoWithoutPKCE, mockUser.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate scope restrictions', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
      const dtoWithInvalidScope = {
        ...authorizeDto,
        scope: 'admin delete_all',
      };

      await expect(service.authorize(dtoWithInvalidScope, mockUser.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('token', () => {
    describe('authorization_code grant', () => {
      const tokenDto = {
        grant_type: 'authorization_code',
        code: 'auth-code-123',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'test-client',
        client_secret: 'test-secret',
      };

      it('should exchange authorization code for tokens', async () => {
        const mockAuthCode = {
          id: 'authcode-123',
          code: 'auth-code-123',
          clientId: mockClient.id,
          userId: mockUser.id,
          scope: 'openid email',
          redirectUri: tokenDto.redirect_uri,
          expiresAt: new Date(Date.now() + 600000),
          client: mockClient,
          user: mockUser,
        };

        mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
        mockPrismaService.authorizationCode.findUnique.mockResolvedValue(mockAuthCode);
        mockTokenService.generateAccessToken.mockResolvedValue({
          token: 'access-token',
          expiresIn: 3600,
        });
        mockTokenService.generateRefreshToken.mockResolvedValue({
          token: 'refresh-token',
        });

        const result = await service.token(tokenDto);

        expect(result).toHaveProperty('access_token', 'access-token');
        expect(result).toHaveProperty('refresh_token', 'refresh-token');
        expect(result).toHaveProperty('token_type', 'Bearer');
        expect(result).toHaveProperty('expires_in', 3600);
        expect(mockPrismaService.authorizationCode.delete).toHaveBeenCalled();
      });

      it('should throw UnauthorizedException for expired authorization code', async () => {
        const expiredAuthCode = {
          code: 'auth-code-123',
          clientId: mockClient.id,
          userId: mockUser.id,
          scope: 'openid email',
          redirectUri: tokenDto.redirect_uri,
          expiresAt: new Date(Date.now() - 1000),
          client: mockClient,
          user: mockUser,
        };

        mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
        mockPrismaService.authorizationCode.findUnique.mockResolvedValue(expiredAuthCode);

        await expect(service.token(tokenDto)).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException for invalid client credentials', async () => {
        const invalidDto = {
          ...tokenDto,
          client_secret: 'wrong-secret',
        };

        mockPrismaService.client.findUnique.mockResolvedValue(mockClient);

        await expect(service.token(invalidDto)).rejects.toThrow(UnauthorizedException);
      });

      it('should validate PKCE code_verifier when required', async () => {
        const pkceClient = { ...mockClient, pkceRequired: true };
        const codeChallenge = createHash('sha256')
          .update('test-verifier')
          .digest('base64url');

        const authCodeWithPKCE = {
          code: 'auth-code-123',
          clientId: pkceClient.id,
          userId: mockUser.id,
          scope: 'openid email',
          redirectUri: tokenDto.redirect_uri,
          expiresAt: new Date(Date.now() + 600000),
          codeChallenge,
          codeChallengeMethod: 'S256',
          client: pkceClient,
          user: mockUser,
        };

        mockPrismaService.client.findUnique.mockResolvedValue(pkceClient);
        mockPrismaService.authorizationCode.findUnique.mockResolvedValue(authCodeWithPKCE);

        await expect(service.token(tokenDto)).rejects.toThrow(BadRequestException);
      });
    });

    describe('refresh_token grant', () => {
      const refreshTokenDto = {
        grant_type: 'refresh_token',
        refresh_token: 'refresh-token-123',
        client_id: 'test-client',
        client_secret: 'test-secret',
      };

      it('should issue new access token with valid refresh token', async () => {
        const mockRefreshToken = {
          id: 'rt-123',
          token: 'refresh-token-123',
          tokenHash: mockTokenService.hashToken('refresh-token-123'),
          clientId: mockClient.id,
          userId: mockUser.id,
          scope: 'openid email',
          expiresAt: new Date(Date.now() + 2592000000),
          revoked: false,
          client: mockClient,
          user: mockUser,
        };

        mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
        mockTokenService.hashToken.mockReturnValue('hashed-token');
        mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
        mockTokenService.generateAccessToken.mockResolvedValue({
          token: 'new-access-token',
          expiresIn: 3600,
        });

        const result = await service.token(refreshTokenDto);

        expect(result).toHaveProperty('access_token', 'new-access-token');
        expect(result).toHaveProperty('token_type', 'Bearer');
        expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
          where: { id: mockRefreshToken.id },
          data: { lastUsedAt: expect.any(Date) },
        });
      });

      it('should throw UnauthorizedException for revoked refresh token', async () => {
        const revokedToken = {
          token: 'refresh-token-123',
          tokenHash: 'hashed',
          clientId: mockClient.id,
          userId: mockUser.id,
          scope: 'openid email',
          expiresAt: new Date(Date.now() + 2592000000),
          revoked: true,
          client: mockClient,
          user: mockUser,
        };

        mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
        mockTokenService.hashToken.mockReturnValue('hashed');
        mockPrismaService.refreshToken.findUnique.mockResolvedValue(revokedToken);

        await expect(service.token(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('client_credentials grant', () => {
      const clientCredsDto = {
        grant_type: 'client_credentials',
        client_id: 'test-client',
        client_secret: 'test-secret',
        scope: 'api.read',
      };

      it('should issue access token for valid client credentials', async () => {
        const clientWithCreds = {
          ...mockClient,
          grantTypes: ['client_credentials'],
        };

        mockPrismaService.client.findUnique.mockResolvedValue(clientWithCreds);
        mockTokenService.generateAccessToken.mockResolvedValue({
          token: 'client-access-token',
          expiresIn: 3600,
        });

        const result = await service.token(clientCredsDto);

        expect(result).toHaveProperty('access_token', 'client-access-token');
        expect(result).toHaveProperty('token_type', 'Bearer');
        expect(result).not.toHaveProperty('refresh_token');
      });
    });
  });

  describe('introspect', () => {
    it('should return active token information', async () => {
      const mockAccessToken = {
        id: 'at-123',
        token: 'access-token',
        clientId: mockClient.id,
        userId: mockUser.id,
        scope: 'openid email',
        expiresAt: new Date(Date.now() + 3600000),
        revoked: false,
        client: mockClient,
        user: mockUser,
      };

      mockTokenService.hashToken.mockReturnValue('hashed');
      mockPrismaService.accessToken.findUnique.mockResolvedValue(mockAccessToken);

      const result = await service.introspect({ token: 'access-token' });

      expect(result.active).toBe(true);
      expect(result.scope).toBe('openid email');
      expect(result.client_id).toBe(mockClient.clientId);
    });

    it('should return inactive for expired token', async () => {
      const expiredToken = {
        token: 'access-token',
        clientId: mockClient.id,
        userId: mockUser.id,
        scope: 'openid email',
        expiresAt: new Date(Date.now() - 1000),
        revoked: false,
        client: mockClient,
        user: mockUser,
      };

      mockTokenService.hashToken.mockReturnValue('hashed');
      mockPrismaService.accessToken.findUnique.mockResolvedValue(expiredToken);

      const result = await service.introspect({ token: 'access-token' });

      expect(result.active).toBe(false);
    });

    it('should return inactive for non-existent token', async () => {
      mockTokenService.hashToken.mockReturnValue('hashed');
      mockPrismaService.accessToken.findUnique.mockResolvedValue(null);

      const result = await service.introspect({ token: 'non-existent' });

      expect(result.active).toBe(false);
    });
  });

  describe('revoke', () => {
    it('should revoke access token', async () => {
      const mockAccessToken = {
        id: 'at-123',
        token: 'access-token',
        clientId: mockClient.id,
        userId: mockUser.id,
        revoked: false,
      };

      mockTokenService.hashToken.mockReturnValue('hashed');
      mockPrismaService.accessToken.findUnique.mockResolvedValue(mockAccessToken);

      await service.revoke({
        token: 'access-token',
        token_type_hint: 'access_token',
      });

      expect(mockPrismaService.accessToken.findUnique).toHaveBeenCalled();
    });

    it('should revoke refresh token', async () => {
      const mockRefreshToken = {
        id: 'rt-123',
        token: 'refresh-token',
        clientId: mockClient.id,
        userId: mockUser.id,
        revoked: false,
      };

      mockTokenService.hashToken.mockReturnValue('hashed');
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);

      await service.revoke({
        token: 'refresh-token',
        token_type_hint: 'refresh_token',
      });

      expect(mockPrismaService.refreshToken.findUnique).toHaveBeenCalled();
    });
  });
});
