import { SetMetadata } from '@nestjs/common';
import { REQUIRED_SCOPES_KEY } from '../guards/scope.guard';

export const RequireScopes = (...scopes: string[]) =>
  SetMetadata(REQUIRED_SCOPES_KEY, scopes);
