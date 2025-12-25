import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  OAuthConnection,
  OAuthProvider,
  TokenSet,
} from '@opendex/contracts';

export class ProviderDto implements OAuthProvider {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsIn(['oauth2', 'oidc', 'saml'])
  category!: OAuthProvider['category'];

  @IsString()
  authorizationUrl!: string;

  @IsString()
  tokenUrl!: string;

  @IsArray()
  @IsString({ each: true })
  scopes!: string[];

  @IsBoolean()
  supportsPkce!: boolean;

  @IsOptional()
  @IsBoolean()
  requiresWebhookForRefresh?: boolean;
}

export class TokenSetDto implements TokenSet {
  @IsString()
  accessToken!: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  expiresIn?: number;

  @IsOptional()
  @IsString()
  tokenType?: string;

  @IsString()
  issuedAt!: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  idToken?: string;
}

export class CreateConnectionDto implements Omit<OAuthConnection, 'status' | 'createdAt' | 'updatedAt'> {
  @IsString()
  id!: string;

  @IsString()
  providerId!: string;

  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  userId!: string;

  @IsArray()
  @IsString({ each: true })
  scope!: string[];

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsISO8601()
  createdAt!: string;

  @IsISO8601()
  updatedAt!: string;

  @ValidateNested()
  @Type(() => TokenSetDto)
  tokenSet!: TokenSetDto;
}
