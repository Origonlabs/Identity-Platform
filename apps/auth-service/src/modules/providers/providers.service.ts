import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/core/infrastructure/persistence/prisma/prisma.service';
import { OAuthProviderFactory } from './base/oauth-provider.factory';
import * as crypto from 'crypto';

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: OAuthProviderFactory,
  ) {}

  /**
   * Get authorization URL for a provider
   */
  async getAuthorizationUrl(
    providerId: string,
    redirectUri: string,
    scope?: string[],
  ): Promise<{ url: string; state: string }> {
    const provider = this.providerFactory.createProvider(providerId);
    const state = this.generateState();

    const url = await provider.getAuthorizationUrl({
      redirectUri,
      state,
      scope,
    });

    return { url, state };
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(
    providerId: string,
    code: string,
    redirectUri: string,
  ): Promise<{ userId: string; isNewUser: boolean }> {
    const provider = this.providerFactory.createProvider(providerId);

    // Exchange code for tokens
    const tokens = await provider.getAccessToken(code, redirectUri);

    // Get user profile from provider
    const profile = await provider.getUserProfile(tokens.accessToken);

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    const isNewUser = !user;

    if (!user) {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          email: profile.email!,
          emailVerified: profile.emailVerified || false,
          displayName: profile.name,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl,
          locale: profile.locale,
        },
      });

      this.logger.log(`New user created via ${providerId}: ${user.id}`);
    } else {
      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    // Store or update OAuth account
    await this.prisma.oAuthAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: providerId,
          providerAccountId: profile.id,
        },
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : null,
        tokenType: tokens.tokenType,
        scope: tokens.scope,
        providerData: profile.raw,
      },
      create: {
        userId: user.id,
        provider: providerId,
        providerAccountId: profile.id,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : null,
        tokenType: tokens.tokenType,
        scope: tokens.scope,
        providerData: profile.raw,
      },
    });

    return { userId: user.id, isNewUser };
  }

  /**
   * Get list of enabled providers
   */
  getEnabledProviders(): string[] {
    return this.providerFactory.getEnabledProviders();
  }

  /**
   * Generate secure random state
   */
  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
