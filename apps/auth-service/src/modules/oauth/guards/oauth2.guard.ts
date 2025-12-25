import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../services/token.service';

@Injectable()
export class OAuth2Guard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    const payload = await this.tokenService.verifyAccessToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Attach user info to request
    request.user = payload;

    return true;
  }
}
