import { Injectable } from '@nestjs/common';
import { BaseOAuthProvider } from '../base/base-oauth-provider';
import {
  OAuthProviderConfig,
  AuthorizationUrlOptions,
  ProviderTokens,
  ProviderUserProfile,
} from '../base/oauth-provider.interface';

@Injectable()
export class DiscordProvider extends BaseOAuthProvider {
  private readonly authUrl = 'https://discord.com/api/oauth2/authorize';
  private readonly tokenUrl = 'https://discord.com/api/oauth2/token';
  private readonly userUrl = 'https://discord.com/api/users/@me';

  constructor(config: OAuthProviderConfig) {
    super('discord', config);
  }

  async getAuthorizationUrl(options: AuthorizationUrlOptions): Promise<string> {
    return this.buildAuthorizationUrl(this.authUrl, {
      ...options,
      scope: options.scope || ['identify', 'email'],
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

    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
      : null;

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.verified,
      name: user.username,
      avatarUrl,
      locale: user.locale,
      raw: user,
    };
  }
}
