import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@/core/infrastructure/persistence/prisma/prisma.service';
import { OAuth2Guard } from '../guards/oauth2.guard';

@ApiTags('oidc')
@Controller('oauth')
export class UserInfoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('userinfo')
  @UseGuards(OAuth2Guard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'UserInfo endpoint (OpenID Connect)',
    description: 'Get authenticated user information',
  })
  @ApiResponse({
    status: 200,
    description: 'User information returned',
    schema: {
      type: 'object',
      properties: {
        sub: { type: 'string' },
        email: { type: 'string' },
        email_verified: { type: 'boolean' },
        name: { type: 'string' },
        given_name: { type: 'string' },
        family_name: { type: 'string' },
        picture: { type: 'string' },
        locale: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async userinfo(@Req() req: any) {
    const userId = req.user.sub;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        displayName: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        locale: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Return OpenID Connect standard claims
    return {
      sub: user.id,
      email: user.email,
      email_verified: user.emailVerified,
      name: user.displayName,
      given_name: user.firstName,
      family_name: user.lastName,
      picture: user.avatarUrl,
      locale: user.locale,
    };
  }
}
