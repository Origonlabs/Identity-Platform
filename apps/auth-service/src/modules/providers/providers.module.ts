import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Base
import { OAuthProviderFactory } from './base/oauth-provider.factory';

// Providers
import { GithubProvider } from './github/github.provider';
import { GoogleProvider } from './google/google.provider';
import { MicrosoftProvider } from './microsoft/microsoft.provider';
import { FacebookProvider } from './facebook/facebook.provider';
import { SpotifyProvider } from './spotify/spotify.provider';
import { DiscordProvider } from './discord/discord.provider';

// Controllers
import { ProvidersController } from './providers.controller';

// Services
import { ProvidersService } from './providers.service';

@Module({
  imports: [ConfigModule],
  controllers: [ProvidersController],
  providers: [
    ProvidersService,
    OAuthProviderFactory,
    GithubProvider,
    GoogleProvider,
    MicrosoftProvider,
    FacebookProvider,
    SpotifyProvider,
    DiscordProvider,
    // Add other providers here as needed
  ],
  exports: [ProvidersService, OAuthProviderFactory],
})
export class ProvidersModule {}
