import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const REQUIRED_SCOPES_KEY = 'required_scopes';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.get<string[]>(
      REQUIRED_SCOPES_KEY,
      context.getHandler(),
    );

    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.scope) {
      throw new ForbiddenException('Insufficient scope');
    }

    const userScopes = user.scope.split(' ');
    const hasRequiredScopes = requiredScopes.every((scope) =>
      userScopes.includes(scope),
    );

    if (!hasRequiredScopes) {
      throw new ForbiddenException(`Required scopes: ${requiredScopes.join(', ')}`);
    }

    return true;
  }
}
