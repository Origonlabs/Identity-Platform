import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { GithubProvider } from './github.provider';

describe('GithubProvider', () => {
  let provider: GithubProvider;
  let httpService: HttpService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        OAUTH_GITHUB_CLIENT_ID: 'github-client-id',
        OAUTH_GITHUB_CLIENT_SECRET: 'github-client-secret',
      };
      return config[key];
    }),
  };

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubProvider,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get<GithubProvider>(GithubProvider);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuthorizationUrl', () => {
    it('should generate correct authorization URL', async () => {
      const options = {
        redirectUri: 'http://localhost:3000/callback',
        state: 'random-state',
        scope: 'user:email',
      };

      const url = await provider.getAuthorizationUrl(options);

      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=github-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
      expect(url).toContain('state=random-state');
      expect(url).toContain('scope=user%3Aemail');
    });

    it('should use default scope if not provided', async () => {
      const options = {
        redirectUri: 'http://localhost:3000/callback',
        state: 'state',
      };

      const url = await provider.getAuthorizationUrl(options);

      expect(url).toContain('scope=user%3Aemail');
    });
  });

  describe('getAccessToken', () => {
    it('should exchange code for access token', async () => {
      const mockResponse = {
        data: {
          access_token: 'github-access-token',
          token_type: 'bearer',
          scope: 'user:email',
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await provider.getAccessToken(
        'auth-code',
        'http://localhost:3000/callback',
      );

      expect(result).toEqual({
        accessToken: 'github-access-token',
        tokenType: 'bearer',
        scope: 'user:email',
      });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.objectContaining({
          client_id: 'github-client-id',
          client_secret: 'github-client-secret',
          code: 'auth-code',
          redirect_uri: 'http://localhost:3000/callback',
        }),
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        }),
      );
    });

    it('should handle token exchange errors', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Invalid code')),
      );

      await expect(
        provider.getAccessToken('invalid-code', 'http://localhost:3000/callback'),
      ).rejects.toThrow();
    });
  });

  describe('getUserProfile', () => {
    it('should fetch user profile with access token', async () => {
      const mockUserResponse = {
        data: {
          id: 12345,
          login: 'testuser',
          email: 'test@example.com',
          name: 'Test User',
          avatar_url: 'https://github.com/avatar.jpg',
        },
      };

      const mockEmailResponse = {
        data: [
          {
            email: 'test@example.com',
            primary: true,
            verified: true,
          },
        ],
      };

      mockHttpService.get
        .mockReturnValueOnce(of(mockUserResponse))
        .mockReturnValueOnce(of(mockEmailResponse));

      const result = await provider.getUserProfile('github-access-token');

      expect(result).toEqual({
        providerId: '12345',
        provider: 'github',
        email: 'test@example.com',
        emailVerified: true,
        name: 'Test User',
        picture: 'https://github.com/avatar.jpg',
        username: 'testuser',
      });

      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: { Authorization: 'Bearer github-access-token' },
        }),
      );
    });

    it('should handle missing email in profile', async () => {
      const mockUserResponse = {
        data: {
          id: 12345,
          login: 'testuser',
          email: null,
          name: 'Test User',
          avatar_url: 'https://github.com/avatar.jpg',
        },
      };

      const mockEmailResponse = {
        data: [
          {
            email: 'verified@example.com',
            primary: true,
            verified: true,
          },
        ],
      };

      mockHttpService.get
        .mockReturnValueOnce(of(mockUserResponse))
        .mockReturnValueOnce(of(mockEmailResponse));

      const result = await provider.getUserProfile('github-access-token');

      expect(result.email).toBe('verified@example.com');
    });

    it('should handle API errors gracefully', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('API rate limit exceeded')),
      );

      await expect(provider.getUserProfile('invalid-token')).rejects.toThrow();
    });
  });

  describe('refreshAccessToken', () => {
    it('should throw error as GitHub does not support refresh tokens', async () => {
      await expect(provider.refreshAccessToken('refresh-token')).rejects.toThrow(
        'GitHub does not support refresh tokens',
      );
    });
  });

  describe('revokeToken', () => {
    it('should revoke access token', async () => {
      mockHttpService.post.mockReturnValue(of({ status: 204 }));

      await provider.revokeToken('github-access-token');

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('revoke'),
        expect.any(Object),
        expect.objectContaining({
          headers: { Authorization: 'Bearer github-access-token' },
        }),
      );
    });

    it('should handle revocation errors', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Token already revoked')),
      );

      await expect(provider.revokeToken('invalid-token')).rejects.toThrow();
    });
  });
});
