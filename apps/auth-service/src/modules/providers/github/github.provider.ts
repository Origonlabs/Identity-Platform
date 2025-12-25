import { Injectable } from '@nestjs/common';
import { BaseOAuthProvider } from '../base/base-oauth-provider';
import {
  OAuthProviderConfig,
  AuthorizationUrlOptions,
  ProviderTokens,
  ProviderUserProfile,
} from '../base/oauth-provider.interface';

@Injectable()
export class GithubProvider extends BaseOAuthProvider {
  private readonly authUrl = 'https://github.com/login/oauth/authorize';
  private readonly tokenUrl = 'https://github.com/login/oauth/access_token';
  private readonly userUrl = 'https://api.github.com/user';
  private readonly emailUrl = 'https://api.github.com/user/emails';

  constructor(config: OAuthProviderConfig) {
    super('github', config);
  }

  async getAuthorizationUrl(options: AuthorizationUrlOptions): Promise<string> {
    return this.buildAuthorizationUrl(this.authUrl, {
      ...options,
      scope: options.scope || ['user:email', 'read:user'],
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
      scope: response.scope,
    };
  }

  async getUserProfile(accessToken: string): Promise<ProviderUserProfile> {
    // Get user profile
    const user = await this.makeRequest(this.userUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    // Get user emails
    const emails = await this.makeRequest(this.emailUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const primaryEmail = emails.find((e: any) => e.primary);

    return {
      id: user.id.toString(),
      email: primaryEmail?.email || user.email,
      emailVerified: primaryEmail?.verified || false,
      name: user.name,
      avatarUrl: user.avatar_url,
      raw: { ...user, emails },
    };
  }
}
