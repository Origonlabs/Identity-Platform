import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  points: number; // Number of requests
  duration: number; // Time window in seconds
  keyPrefix?: string;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const identifier = this.getIdentifier(request);
    const key = `${rateLimitOptions.keyPrefix || 'rate_limit'}:${identifier}`;

    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, rateLimitOptions.duration);
    }

    if (current > rateLimitOptions.points) {
      const ttl = await this.redis.ttl(key);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests',
          retryAfter: ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Add rate limit headers
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', rateLimitOptions.points);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimitOptions.points - current));
    response.setHeader('X-RateLimit-Reset', Date.now() + (await this.redis.ttl(key)) * 1000);

    return true;
  }

  private getIdentifier(request: any): string {
    // Try to get user ID if authenticated, otherwise use IP
    return request.user?.id || request.ip || 'anonymous';
  }
}
