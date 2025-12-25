import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Get('info')
  @ApiOperation({
    summary: 'Get authentication service info',
    description: 'Returns information about the authentication service',
  })
  @ApiResponse({
    status: 200,
    description: 'Service information',
    schema: {
      type: 'object',
      properties: {
        service: { type: 'string' },
        version: { type: 'string' },
        oauth2: { type: 'boolean' },
        oidc: { type: 'boolean' },
        providers: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  getInfo() {
    return {
      service: 'OpenDex Auth Service',
      version: '1.0.0',
      oauth2: true,
      oidc: true,
      endpoints: {
        authorization: '/oauth/authorize',
        token: '/oauth/token',
        userinfo: '/oauth/userinfo',
        revocation: '/oauth/revoke',
        introspection: '/oauth/introspect',
      },
      documentation: '/api/docs',
    };
  }
}
