import {
  IOAuthProvider,
  OAuthProviderConfig,
  AuthorizationUrlOptions,
  ProviderTokens,
  ProviderUserProfile,
} from './oauth-provider.interface';
import { Logger } from '@nestjs/common';

/**
 * Base OAuth Provider
 * Provides common functionality for all OAuth providers
 */
export abstract class BaseOAuthProvider implements IOAuthProvider {
  protected readonly logger: Logger;

  constructor(
    public readonly providerId: string,
    protected readonly config: OAuthProviderConfig,
  ) {
    this.logger = new Logger(`${providerId}Provider`);
  }

  abstract getAuthorizationUrl(options: AuthorizationUrlOptions): Promise<string>;
  abstract getAccessToken(code: string, redirectUri: string): Promise<ProviderTokens>;
  abstract getUserProfile(accessToken: string): Promise<ProviderUserProfile>;

  /**
   * Build authorization URL with common parameters
   */
  protected buildAuthorizationUrl(
    baseUrl: string,
    options: AuthorizationUrlOptions,
  ): string {
    const url = new URL(baseUrl);

    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', options.redirectUri);
    url.searchParams.set('state', options.state);
    url.searchParams.set('response_type', 'code');

    if (options.scope && options.scope.length > 0) {
      url.searchParams.set('scope', options.scope.join(' '));
    } else if (this.config.scope && this.config.scope.length > 0) {
      url.searchParams.set('scope', this.config.scope.join(' '));
    }

    if (options.prompt) {
      url.searchParams.set('prompt', options.prompt);
    }

    if (options.loginHint) {
      url.searchParams.set('login_hint', options.loginHint);
    }

    // Add extra parameters
    if (options.extraParams) {
      Object.entries(options.extraParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    return url.toString();
  }

  /**
   * Make HTTP request to provider
   */
  protected async makeRequest<T = any>(
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OpenDex-Auth-Service/1.0',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Provider request failed: ${response.status} - ${error}`);
        throw new Error(`Provider request failed: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      this.logger.error('Provider request error', error);
      throw error;
    }
  }

  /**
   * Exchange code for token (common implementation)
   */
  protected async exchangeCodeForToken(
    tokenUrl: string,
    code: string,
    redirectUri: string,
  ): Promise<any> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    return this.makeRequest(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
  }
}
