import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/core/infrastructure/persistence/prisma/prisma.service';
import { TokenService } from './token.service';
import { PKCEService } from './pkce.service';
import {
  InvalidRequestException,
  InvalidClientException,
  InvalidGrantException,
  UnauthorizedClientException,
  UnsupportedGrantTypeException,
  InvalidScopeException,
  InvalidCodeChallengeException,
  InvalidCodeVerifierException,
} from '@/common/exceptions/oauth.exceptions';
import { AuthorizeRequestDto } from '../dto/authorize.dto';
import { TokenRequestDto, TokenResponseDto } from '../dto/token.dto';
import * as crypto from 'crypto';

@Injectable()
export class OAuth2Service {
  private readonly logger = new Logger(OAuth2Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly pkceService: PKCEService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Handle authorization request (Step 1 of OAuth 2.0 flow)
   */
  async authorize(dto: AuthorizeRequestDto, userId: string): Promise<{ code: string; state?: string }> {
    // Validate client
    const client = await this.validateClient(dto.client_id, dto.redirect_uri);

    // Validate response_type
    if (!client.responseTypes.includes(dto.response_type)) {
      throw new UnauthorizedClientException(
        `Client is not authorized to use response_type: ${dto.response_type}`,
      );
    }

    // Validate scope
    const requestedScopes = dto.scope ? dto.scope.split(' ') : [];
    this.validateScopes(requestedScopes, client.allowedScopes);

    // Validate PKCE if required
    if (client.pkceRequired && !dto.code_challenge) {
      throw new InvalidCodeChallengeException();
    }

    // Generate authorization code
    const code = this.generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setSeconds(
      expiresAt.getSeconds() +
      this.configService.get<number>('app.oauth.authorizationCodeExpiration', 600),
    );

    // Store authorization code
    await this.prisma.authorizationCode.create({
      data: {
        code,
        clientId: client.id,
        userId,
        redirectUri: dto.redirect_uri,
        scope: requestedScopes,
        codeChallenge: dto.code_challenge,
        codeChallengeMethod: dto.code_challenge_method,
        nonce: dto.nonce,
        state: dto.state,
        expiresAt,
      },
    });

    this.logger.log(`Authorization code generated for client: ${client.clientId}`);

    return {
      code,
      state: dto.state,
    };
  }

  /**
   * Handle token request (Step 2 of OAuth 2.0 flow)
   */
  async token(dto: TokenRequestDto): Promise<TokenResponseDto> {
    switch (dto.grant_type) {
      case 'authorization_code':
        return this.handleAuthorizationCodeGrant(dto);
      case 'refresh_token':
        return this.handleRefreshTokenGrant(dto);
      case 'client_credentials':
        return this.handleClientCredentialsGrant(dto);
      default:
        throw new UnsupportedGrantTypeException(dto.grant_type);
    }
  }

  /**
   * Handle authorization_code grant
   */
  private async handleAuthorizationCodeGrant(dto: TokenRequestDto): Promise<TokenResponseDto> {
    if (!dto.code) {
      throw new InvalidRequestException('code is required');
    }

    // Find authorization code
    const authCode = await this.prisma.authorizationCode.findUnique({
      where: { code: dto.code },
      include: { client: true, user: true },
    });

    if (!authCode) {
      throw new InvalidGrantException('Authorization code not found');
    }

    // Validate authorization code
    if (authCode.isUsed) {
      throw new InvalidGrantException('Authorization code already used');
    }

    if (authCode.expiresAt < new Date()) {
      throw new InvalidGrantException('Authorization code expired');
    }

    if (authCode.redirectUri !== dto.redirect_uri) {
      throw new InvalidGrantException('redirect_uri mismatch');
    }

    // Validate client
    const client = await this.validateClient(dto.client_id || '', authCode.redirectUri);
    if (client.id !== authCode.clientId) {
      throw new InvalidClientException('Client mismatch');
    }

    // Validate PKCE if present
    if (authCode.codeChallenge) {
      if (!dto.code_verifier) {
        throw new InvalidCodeVerifierException();
      }

      const isValid = this.pkceService.verifyChallenge(
        dto.code_verifier,
        authCode.codeChallenge,
        authCode.codeChallengeMethod || 'plain',
      );

      if (!isValid) {
        throw new InvalidCodeVerifierException();
      }
    }

    // Mark code as used
    await this.prisma.authorizationCode.update({
      where: { id: authCode.id },
      data: { isUsed: true, usedAt: new Date() },
    });

    // Generate tokens
    const accessToken = await this.tokenService.generateAccessToken({
      userId: authCode.userId,
      clientId: client.id,
      scope: authCode.scope,
    });

    const refreshToken = await this.tokenService.generateRefreshToken({
      userId: authCode.userId,
      clientId: client.id,
      scope: authCode.scope,
    });

    this.logger.log(`Tokens issued for user: ${authCode.userId}`);

    return {
      access_token: accessToken.token,
      token_type: 'Bearer',
      expires_in: client.accessTokenTTL,
      refresh_token: refreshToken.token,
      scope: authCode.scope.join(' '),
    };
  }

  /**
   * Handle refresh_token grant
   */
  private async handleRefreshTokenGrant(dto: TokenRequestDto): Promise<TokenResponseDto> {
    if (!dto.refresh_token) {
      throw new InvalidRequestException('refresh_token is required');
    }

    const tokenHash = this.tokenService.hashToken(dto.refresh_token);

    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { client: true, user: true },
    });

    if (!refreshToken) {
      throw new InvalidGrantException('Invalid refresh token');
    }

    if (refreshToken.isRevoked) {
      throw new InvalidGrantException('Refresh token revoked');
    }

    if (refreshToken.expiresAt && refreshToken.expiresAt < new Date()) {
      throw new InvalidGrantException('Refresh token expired');
    }

    // Validate client
    if (dto.client_id && dto.client_id !== refreshToken.client.clientId) {
      throw new InvalidClientException('Client mismatch');
    }

    // Generate new access token
    const accessToken = await this.tokenService.generateAccessToken({
      userId: refreshToken.userId,
      clientId: refreshToken.clientId,
      scope: refreshToken.scope,
      refreshTokenId: refreshToken.id,
    });

    // Update refresh token last used
    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { lastUsedAt: new Date() },
    });

    this.logger.log(`Access token refreshed for user: ${refreshToken.userId}`);

    return {
      access_token: accessToken.token,
      token_type: 'Bearer',
      expires_in: refreshToken.client.accessTokenTTL,
      scope: refreshToken.scope.join(' '),
    };
  }

  /**
   * Handle client_credentials grant
   */
  private async handleClientCredentialsGrant(dto: TokenRequestDto): Promise<TokenResponseDto> {
    const client = await this.prisma.client.findUnique({
      where: { clientId: dto.client_id },
    });

    if (!client) {
      throw new InvalidClientException();
    }

    if (!client.grantTypes.includes('client_credentials')) {
      throw new UnauthorizedClientException();
    }

    // Validate client secret for confidential clients
    if (client.clientType === 'CONFIDENTIAL') {
      if (!dto.client_secret || dto.client_secret !== client.clientSecret) {
        throw new InvalidClientException();
      }
    }

    const requestedScopes = dto.scope ? dto.scope.split(' ') : [];
    this.validateScopes(requestedScopes, client.allowedScopes);

    // Generate access token (no user context for client credentials)
    const accessToken = await this.tokenService.generateAccessToken({
      userId: null, // Client credentials don't have a user
      clientId: client.id,
      scope: requestedScopes,
    });

    return {
      access_token: accessToken.token,
      token_type: 'Bearer',
      expires_in: client.accessTokenTTL,
      scope: requestedScopes.join(' '),
    };
  }

  /**
   * Validate client and redirect URI
   */
  private async validateClient(clientId: string, redirectUri: string) {
    const client = await this.prisma.client.findUnique({
      where: { clientId },
    });

    if (!client) {
      throw new InvalidClientException('Client not found');
    }

    if (!client.redirectUris.includes(redirectUri)) {
      throw new InvalidRequestException('Invalid redirect_uri');
    }

    return client;
  }

  /**
   * Validate requested scopes
   */
  private validateScopes(requestedScopes: string[], allowedScopes: string[]) {
    const invalidScopes = requestedScopes.filter(
      (scope) => !allowedScopes.includes(scope),
    );

    if (invalidScopes.length > 0) {
      throw new InvalidScopeException(invalidScopes.join(', '));
    }
  }

  /**
   * Generate secure random token
   */
  private generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }
}
