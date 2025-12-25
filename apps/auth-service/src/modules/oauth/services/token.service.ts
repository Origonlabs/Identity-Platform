import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/core/infrastructure/persistence/prisma/prisma.service';
import * as crypto from 'crypto';

interface GenerateTokenOptions {
  userId: string | null;
  clientId: string;
  scope: string[];
  refreshTokenId?: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate JWT access token
   */
  async generateAccessToken(options: GenerateTokenOptions) {
    const { userId, clientId, scope, refreshTokenId } = options;

    const payload = {
      sub: userId,
      client_id: clientId,
      scope: scope.join(' '),
      type: 'access_token',
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('app.jwt.accessTokenExpiration'),
    });

    const tokenHash = this.hashToken(token);

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (client?.accessTokenTTL || 3600));

    // Store in database
    const accessToken = await this.prisma.accessToken.create({
      data: {
        token,
        tokenHash,
        clientId,
        userId: userId || '',
        scope,
        refreshTokenId,
        expiresAt,
      },
    });

    return accessToken;
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(options: Omit<GenerateTokenOptions, 'refreshTokenId'>) {
    const { userId, clientId, scope } = options;

    const token = this.generateSecureToken(64);
    const tokenHash = this.hashToken(token);

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (client?.refreshTokenTTL || 2592000));

    const refreshToken = await this.prisma.refreshToken.create({
      data: {
        token,
        tokenHash,
        clientId,
        userId: userId || '',
        scope,
        expiresAt,
      },
    });

    return refreshToken;
  }

  /**
   * Verify and decode access token
   */
  async verifyAccessToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);

      const tokenHash = this.hashToken(token);
      const dbToken = await this.prisma.accessToken.findUnique({
        where: { tokenHash },
      });

      if (!dbToken || dbToken.isRevoked) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Revoke access token
   */
  async revokeAccessToken(token: string) {
    const tokenHash = this.hashToken(token);

    await this.prisma.accessToken.updateMany({
      where: { tokenHash },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string) {
    const tokenHash = this.hashToken(token);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Hash token for database storage
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate secure random token
   */
  private generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }
}
