import { Injectable } from '@nestjs/common';
import { BaseOAuthProvider } from '../base/base-oauth-provider';
import {
  OAuthProviderConfig,
  AuthorizationUrlOptions,
  ProviderTokens,
  ProviderUserProfile,
} from '../base/oauth-provider.interface';

@Injectable()
export class FacebookProvider extends BaseOAuthProvider {
  private readonly authUrl = 'https://www.facebook.com/v18.0/dialog/oauth';
  private readonly tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
  private readonly userUrl = 'https://graph.facebook.com/v18.0/me';

  constructor(config: OAuthProviderConfig) {
    super('facebook', config);
  }

  async getAuthorizationUrl(options: AuthorizationUrlOptions): Promise<string> {
    return this.buildAuthorizationUrl(this.authUrl, {
      ...options,
      scope: options.scope || ['email', 'public_profile'],
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
      tokenType: response.token_type || 'bearer',
      expiresIn: response.expires_in,
    };
  }

  async getUserProfile(accessToken: string): Promise<ProviderUserProfile> {
    const fields = 'id,email,name,first_name,last_name,picture';
    const user = await this.makeRequest(
      `${this.userUrl}?fields=${fields}&access_token=${accessToken}`,
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.first_name,
      lastName: user.last_name,
      avatarUrl: user.picture?.data?.url,
      raw: user,
    };
  }
}
