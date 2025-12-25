import { Injectable } from '@nestjs/common';
import { BaseOAuthProvider } from '../base/base-oauth-provider';
import {
  OAuthProviderConfig,
  AuthorizationUrlOptions,
  ProviderTokens,
  ProviderUserProfile,
} from '../base/oauth-provider.interface';

@Injectable()
export class SpotifyProvider extends BaseOAuthProvider {
  private readonly authUrl = 'https://accounts.spotify.com/authorize';
  private readonly tokenUrl = 'https://accounts.spotify.com/api/token';
  private readonly userUrl = 'https://api.spotify.com/v1/me';

  constructor(config: OAuthProviderConfig) {
    super('spotify', config);
  }

  async getAuthorizationUrl(options: AuthorizationUrlOptions): Promise<string> {
    return this.buildAuthorizationUrl(this.authUrl, {
      ...options,
      scope: options.scope || ['user-read-email', 'user-read-private'],
    });
  }

  async getAccessToken(code: string, redirectUri: string): Promise<ProviderTokens> {
    const response = await this.exchangeCodeForToken(
      this.tokenUrl,
      code,
      redirectUri,
    );

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresIn: response.expires_in,
      tokenType: response.token_type,
      scope: response.scope,
    };
  }

  async getUserProfile(accessToken: string): Promise<ProviderUserProfile> {
    const user = await this.makeRequest(this.userUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.display_name,
      avatarUrl: user.images?.[0]?.url,
      raw: user,
    };
  }
}
