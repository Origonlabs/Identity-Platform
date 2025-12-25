import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { GoogleProvider } from './google.provider';

describe('GoogleProvider', () => {
  let provider: GoogleProvider;
  let httpService: HttpService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        OAUTH_GOOGLE_CLIENT_ID: 'google-client-id',
        OAUTH_GOOGLE_CLIENT_SECRET: 'google-client-secret',
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
        GoogleProvider,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get<GoogleProvider>(GoogleProvider);
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
        scope: 'openid email profile',
      };

      const url = await provider.getAuthorizationUrl(options);

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=google-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
      expect(url).toContain('state=random-state');
      expect(url).toContain('response_type=code');
      expect(url).toContain('access_type=offline');
    });

    it('should include prompt=consent for offline access', async () => {
      const options = {
        redirectUri: 'http://localhost:3000/callback',
        state: 'state',
      };

      const url = await provider.getAuthorizationUrl(options);

      expect(url).toContain('prompt=consent');
      expect(url).toContain('access_type=offline');
    });
  });

  describe('getAccessToken', () => {
    it('should exchange code for access and refresh tokens', async () => {
      const mockResponse = {
        data: {
          access_token: 'google-access-token',
          refresh_token: 'google-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'openid email profile',
          id_token: 'google-id-token',
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await provider.getAccessToken(
        'auth-code',
        'http://localhost:3000/callback',
      );

      expect(result).toEqual({
        accessToken: 'google-access-token',
        refreshToken: 'google-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
        scope: 'openid email profile',
        idToken: 'google-id-token',
      });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          client_id: 'google-client-id',
          client_secret: 'google-client-secret',
          code: 'auth-code',
          redirect_uri: 'http://localhost:3000/callback',
          grant_type: 'authorization_code',
        }),
      );
    });

    it('should handle token exchange errors', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => ({
          response: {
            data: {
              error: 'invalid_grant',
              error_description: 'Code expired',
            },
          },
        })),
      );

      await expect(
        provider.getAccessToken('expired-code', 'http://localhost:3000/callback'),
      ).rejects.toThrow();
    });
  });

  describe('getUserProfile', () => {
    it('should fetch user profile from Google API', async () => {
      const mockResponse = {
        data: {
          sub: 'google-user-id-123',
          email: 'test@gmail.com',
          email_verified: true,
          name: 'Test User',
          given_name: 'Test',
          family_name: 'User',
          picture: 'https://lh3.googleusercontent.com/photo.jpg',
          locale: 'en',
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await provider.getUserProfile('google-access-token');

      expect(result).toEqual({
        providerId: 'google-user-id-123',
        provider: 'google',
        email: 'test@gmail.com',
        emailVerified: true,
        name: 'Test User',
        givenName: 'Test',
        familyName: 'User',
        picture: 'https://lh3.googleusercontent.com/photo.jpg',
        locale: 'en',
      });

      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        expect.objectContaining({
          headers: { Authorization: 'Bearer google-access-token' },
        }),
      );
    });

    it('should handle unverified email', async () => {
      const mockResponse = {
        data: {
          sub: 'google-user-id-123',
          email: 'unverified@gmail.com',
          email_verified: false,
          name: 'Unverified User',
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await provider.getUserProfile('google-access-token');

      expect(result.emailVerified).toBe(false);
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token using refresh token', async () => {
      const mockResponse = {
        data: {
          access_token: 'new-access-token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'openid email profile',
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await provider.refreshAccessToken('google-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          client_id: 'google-client-id',
          client_secret: 'google-client-secret',
          refresh_token: 'google-refresh-token',
          grant_type: 'refresh_token',
        }),
      );
    });

    it('should handle invalid refresh token', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => ({
          response: {
            data: {
              error: 'invalid_grant',
              error_description: 'Token has been expired or revoked',
            },
          },
        })),
      );

      await expect(provider.refreshAccessToken('invalid-refresh-token')).rejects.toThrow();
    });
  });

  describe('revokeToken', () => {
    it('should revoke access token', async () => {
      mockHttpService.post.mockReturnValue(of({ status: 200 }));

      await provider.revokeToken('google-access-token');

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/revoke',
        null,
        expect.objectContaining({
          params: { token: 'google-access-token' },
        }),
      );
    });

    it('should handle revocation errors', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Invalid token')),
      );

      await expect(provider.revokeToken('invalid-token')).rejects.toThrow();
    });
  });
});
