import { Controller, Get, Query, Param, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { ProvidersService } from './providers.service';
import { OAuth2Service } from '../oauth/services/oauth2.service';

@ApiTags('providers')
@Controller('auth/providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly oauth2Service: OAuth2Service,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List enabled OAuth providers',
    description: 'Get list of all enabled OAuth providers',
  })
  @ApiResponse({
    status: 200,
    description: 'List of enabled providers',
    schema: {
      type: 'object',
      properties: {
        providers: {
          type: 'array',
          items: { type: 'string' },
          example: ['github', 'google', 'microsoft'],
        },
      },
    },
  })
  getProviders() {
    const providers = this.providersService.getEnabledProviders();
    return { providers };
  }

  @Get(':provider/authorize')
  @ApiOperation({
    summary: 'Start OAuth flow with provider',
    description: 'Redirects to provider authorization page',
  })
  @ApiParam({ name: 'provider', example: 'github' })
  @ApiResponse({ status: 302, description: 'Redirects to provider' })
  async authorize(
    @Param('provider') provider: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('scope') scope: string,
    @Res() res: Response,
  ) {
    const scopes = scope ? scope.split(' ') : undefined;

    const { url, state } = await this.providersService.getAuthorizationUrl(
      provider,
      redirectUri,
      scopes,
    );

    // In production, you should store state in Redis/session to validate later
    // For now, we're just generating it

    return res.redirect(url);
  }

  @Get(':provider/callback')
  @ApiOperation({
    summary: 'OAuth callback endpoint',
    description: 'Handles OAuth provider callback and creates user session',
  })
  @ApiParam({ name: 'provider', example: 'github' })
  @ApiResponse({ status: 302, description: 'Redirects to application' })
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('redirect_uri') redirectUri: string,
    @Res() res: Response,
  ) {
    if (!code) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'invalid_request',
        error_description: 'Missing authorization code',
      });
    }

    try {
      // Handle provider callback
      const { userId, isNewUser } = await this.providersService.handleCallback(
        provider,
        code,
        redirectUri,
      );

      // Generate OAuth2 authorization code for the application
      // This allows the app to exchange it for access tokens
      const authResult = await this.oauth2Service.authorize(
        {
          response_type: 'code',
          client_id: 'default-client', // You should get this from query params
          redirect_uri: redirectUri,
          scope: 'openid profile email',
        },
        userId,
      );

      // Redirect back to application with authorization code
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.append('code', authResult.code);
      if (state) {
        callbackUrl.searchParams.append('state', state);
      }
      if (isNewUser) {
        callbackUrl.searchParams.append('new_user', 'true');
      }

      return res.redirect(callbackUrl.toString());
    } catch (error: any) {
      // Return error to application
      const errorUrl = new URL(redirectUri);
      errorUrl.searchParams.append('error', 'server_error');
      errorUrl.searchParams.append('error_description', error.message);
      if (state) {
        errorUrl.searchParams.append('state', state);
      }

      return res.redirect(errorUrl.toString());
    }
  }
}
