import { Injectable } from '@nestjs/common';
import { BaseOAuthProvider } from '../base/base-oauth-provider';
import {
  OAuthProviderConfig,
  AuthorizationUrlOptions,
  ProviderTokens,
  ProviderUserProfile,
} from '../base/oauth-provider.interface';

@Injectable()
export class GoogleProvider extends BaseOAuthProvider {
  private readonly authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly tokenUrl = 'https://oauth2.googleapis.com/token';
  private readonly userUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';

  constructor(config: OAuthProviderConfig) {
    super('google', config);
  }

  async getAuthorizationUrl(options: AuthorizationUrlOptions): Promise<string> {
    return this.buildAuthorizationUrl(this.authUrl, {
      ...options,
      scope: options.scope || ['openid', 'email', 'profile'],
      extraParams: {
        access_type: 'offline', // Get refresh token
        ...options.extraParams,
      },
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
      idToken: response.id_token,
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
      emailVerified: user.verified_email,
      name: user.name,
      firstName: user.given_name,
      lastName: user.family_name,
      avatarUrl: user.picture,
      locale: user.locale,
      raw: user,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<ProviderTokens> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const response = await this.makeRequest(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    return {
      accessToken: response.access_token,
      expiresIn: response.expires_in,
      tokenType: response.token_type,
      scope: response.scope,
    };
  }
}
