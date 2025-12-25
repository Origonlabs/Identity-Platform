import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { jwtVerify } from 'jose';

type JwtSecret = { kid: string; secret: string };

function parseJwtSecrets(envSecrets?: string, singleSecret?: string): JwtSecret[] {
  if (envSecrets) {
    return envSecrets
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [kid, ...secretParts] = entry.split(':');
        const secret = secretParts.join(':');
        if (!kid || !secret) {
          throw new Error(`Invalid INTERNAL_SERVICE_JWT_SECRETS entry '${entry}'`);
        }
        return { kid, secret };
      });
  }
  if (singleSecret) {
    return [{ kid: 'primary', secret: singleSecret }];
  }
  return [];
}

@Injectable()
export class InternalServiceGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const jwtSecret = this.config.get<string>('INTERNAL_SERVICE_JWT_SECRET');
    const jwtSecretsRaw = this.config.get<string>('INTERNAL_SERVICE_JWT_SECRETS');
    const jwtSecrets = parseJwtSecrets(jwtSecretsRaw, jwtSecret);
    const token = this.config.get<string>('INTERNAL_SERVICE_TOKEN');
    if (jwtSecrets.length === 0 && !token) {
      throw new UnauthorizedException('Missing INTERNAL_SERVICE_TOKEN or INTERNAL_SERVICE_JWT_SECRET(S)');
    }

    const request = context.switchToHttp().getRequest();
    const headerValue = request.headers['x-internal-service-token'];
    const authHeader = request.headers['authorization'];
    const bearer = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;
    const provided = bearer || (Array.isArray(headerValue) ? headerValue[0] : headerValue);
    if (!provided) {
      throw new UnauthorizedException('Missing internal service token');
    }

    if (jwtSecrets.length > 0) {
      try {
        const { protectedHeader } = await jwtVerify(provided, async (header) => {
          const secretEntry =
            header?.kid !== undefined
              ? jwtSecrets.find((s) => s.kid === header.kid)
              : jwtSecrets[0];
          if (!secretEntry) {
            throw new UnauthorizedException('Invalid internal service token (kid not recognized)');
          }
          return new TextEncoder().encode(secretEntry.secret);
        }, {
          issuer: 'stack-backend',
          audience: 'internal-services',
        });
        if (protectedHeader?.kid && !jwtSecrets.some((s) => s.kid === protectedHeader.kid)) {
          throw new UnauthorizedException('Invalid internal service token (kid not recognized)');
        }
        return true;
      } catch {
        throw new UnauthorizedException('Invalid internal service token');
      }
    }

    if (!token) {
      throw new UnauthorizedException('Missing INTERNAL_SERVICE_TOKEN');
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
