import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { OAuth2Service } from '../services/oauth2.service';
import { TokenService } from '../services/token.service';
import { TokenRequestDto, TokenResponseDto, RevokeTokenDto } from '../dto/token.dto';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';

@ApiTags('oauth')
@Controller('oauth')
export class TokenController {
  constructor(
    private readonly oauth2Service: OAuth2Service,
    private readonly tokenService: TokenService,
  ) {}

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Token endpoint (OAuth 2.0)',
    description: 'Exchange authorization code for access token, or refresh an access token',
  })
  @ApiBody({ type: TokenRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens issued successfully',
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Invalid client credentials' })
  @RateLimit({ points: 30, duration: 60, keyPrefix: 'oauth_token' })
  async token(@Body() dto: TokenRequestDto): Promise<TokenResponseDto> {
    return this.oauth2Service.token(dto);
  }

  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Token revocation endpoint (RFC 7009)',
    description: 'Revoke an access token or refresh token',
  })
  @ApiBody({ type: RevokeTokenDto })
  @ApiResponse({ status: 200, description: 'Token revoked successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @RateLimit({ points: 20, duration: 60, keyPrefix: 'oauth_revoke' })
  async revoke(@Body() dto: RevokeTokenDto): Promise<{ success: boolean }> {
    const tokenTypeHint = dto.token_type_hint || 'access_token';

    if (tokenTypeHint === 'access_token') {
      await this.tokenService.revokeAccessToken(dto.token);
    } else if (tokenTypeHint === 'refresh_token') {
      await this.tokenService.revokeRefreshToken(dto.token);
    }

    return { success: true };
  }

  @Post('introspect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Token introspection endpoint (RFC 7662)',
    description: 'Check if a token is valid and get its metadata',
  })
  @ApiResponse({ status: 200, description: 'Token metadata returned' })
  @RateLimit({ points: 50, duration: 60, keyPrefix: 'oauth_introspect' })
  async introspect(@Body() body: { token: string; token_type_hint?: string }) {
    const payload = await this.tokenService.verifyAccessToken(body.token);

    if (!payload) {
      return { active: false };
    }

    return {
      active: true,
      scope: payload.scope,
      client_id: payload.client_id,
      sub: payload.sub,
      exp: payload.exp,
      iat: payload.iat,
      token_type: 'Bearer',
    };
  }
}
