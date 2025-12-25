import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class InternalServiceGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const token = this.config.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!token) {
      throw new UnauthorizedException('Missing INTERNAL_SERVICE_TOKEN');
    }

    const request = context.switchToHttp().getRequest();
    const headerValue = request.headers['x-internal-service-token'];
    const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!provided) {
      throw new UnauthorizedException('Missing internal service token');
    }

    const tokenBuffer = Buffer.from(token);
    const providedBuffer = Buffer.from(provided);
    if (tokenBuffer.length !== providedBuffer.length) {
      throw new UnauthorizedException('Invalid internal service token');
    }

    if (!timingSafeEqual(tokenBuffer, providedBuffer)) {
      throw new UnauthorizedException('Invalid internal service token');
    }

    return true;
  }
}
