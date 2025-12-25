import { Controller, Get, Post, Query, Body, UseGuards, Req, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { OAuth2Service } from '../services/oauth2.service';
import { AuthorizeRequestDto } from '../dto/authorize.dto';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';

@ApiTags('oauth')
@Controller('oauth')
export class AuthorizeController {
  constructor(private readonly oauth2Service: OAuth2Service) {}

  @Get('authorize')
  @ApiOperation({
    summary: 'Authorization endpoint (OAuth 2.0)',
    description: 'Initiates the OAuth 2.0 authorization flow',
  })
  @ApiResponse({ status: 302, description: 'Redirects to login or consent page' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @RateLimit({ points: 20, duration: 60, keyPrefix: 'oauth_authorize' })
  async authorize(
    @Query() query: AuthorizeRequestDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    // In a real implementation, you would:
    // 1. Check if user is authenticated
    // 2. If not, redirect to login with return URL
    // 3. If authenticated, check if consent is needed
    // 4. If consent needed, show consent page
    // 5. If all checks pass, generate authorization code

    // For now, this is a simplified version
    // You need to integrate with your authentication system

    const userId = req.user?.id; // Assuming you have auth middleware

    if (!userId) {
      // Redirect to login
      const loginUrl = `/login?return_to=${encodeURIComponent(req.url)}`;
      return res.redirect(loginUrl);
    }

    try {
      const result = await this.oauth2Service.authorize(query, userId);

      // Build redirect URL
      const redirectUrl = new URL(query.redirect_uri);
      redirectUrl.searchParams.append('code', result.code);
      if (result.state) {
        redirectUrl.searchParams.append('state', result.state);
      }

      return res.redirect(redirectUrl.toString());
    } catch (error: any) {
      // OAuth errors should be returned as query parameters to redirect_uri
      const errorUrl = new URL(query.redirect_uri);
      errorUrl.searchParams.append('error', error.error || 'server_error');
      errorUrl.searchParams.append('error_description', error.errorDescription || error.message);
      if (query.state) {
        errorUrl.searchParams.append('state', query.state);
      }

      return res.redirect(errorUrl.toString());
    }
  }

  @Post('authorize')
  @ApiOperation({
    summary: 'Authorization endpoint (POST)',
    description: 'POST version of authorization endpoint for consent submission',
  })
  async authorizePost(
    @Body() body: AuthorizeRequestDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    // This handles consent form submission
    return this.authorize(body, req, res);
  }
}
