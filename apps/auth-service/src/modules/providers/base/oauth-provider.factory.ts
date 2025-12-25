import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IOAuthProvider, OAuthProviderConfig } from './oauth-provider.interface';
import { GithubProvider } from '../github/github.provider';
import { GoogleProvider } from '../google/google.provider';
import { MicrosoftProvider } from '../microsoft/microsoft.provider';
import { FacebookProvider } from '../facebook/facebook.provider';
import { SpotifyProvider } from '../spotify/spotify.provider';
import { DiscordProvider } from '../discord/discord.provider';

@Injectable()
export class OAuthProviderFactory {
  private readonly logger = new Logger(OAuthProviderFactory.name);
  private readonly providers = new Map<string, any>();

  constructor(private readonly configService: ConfigService) {
    // Register all available providers
    this.providers.set('github', GithubProvider);
    this.providers.set('google', GoogleProvider);
    this.providers.set('microsoft', MicrosoftProvider);
    this.providers.set('facebook', FacebookProvider);
    this.providers.set('spotify', SpotifyProvider);
    this.providers.set('discord', DiscordProvider);
  }

  /**
   * Create provider instance
   */
  createProvider(providerId: string): IOAuthProvider {
    const ProviderClass = this.providers.get(providerId);

    if (!ProviderClass) {
      throw new Error(`Unknown OAuth provider: ${providerId}`);
    }

    const config = this.getProviderConfig(providerId);
    return new ProviderClass(config);
  }

  /**
   * Get provider configuration from environment
   */
  private getProviderConfig(providerId: string): OAuthProviderConfig {
    const upperProviderId = providerId.toUpperCase();
    const clientId = this.configService.get<string>(`OAUTH_${upperProviderId}_CLIENT_ID`);
    const clientSecret = this.configService.get<string>(`OAUTH_${upperProviderId}_CLIENT_SECRET`);

    if (!clientId || !clientSecret) {
      throw new Error(
        `OAuth provider ${providerId} is not configured. ` +
        `Please set OAUTH_${upperProviderId}_CLIENT_ID and OAUTH_${upperProviderId}_CLIENT_SECRET`,
      );
    }

    return {
      clientId,
      clientSecret,
    };
  }

  /**
   * Get list of enabled providers
   */
  getEnabledProviders(): string[] {
    const enabled: string[] = [];

    for (const providerId of this.providers.keys()) {
      try {
        this.getProviderConfig(providerId);
        enabled.push(providerId);
      } catch {
        // Provider not configured, skip
      }
    }

    return enabled;
  }
}
