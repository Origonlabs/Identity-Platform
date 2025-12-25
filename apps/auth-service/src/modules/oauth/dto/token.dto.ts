import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TokenRequestDto {
  @ApiProperty({
    description: 'OAuth 2.0 grant type',
    example: 'authorization_code',
    enum: ['authorization_code', 'refresh_token', 'client_credentials', 'password'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['authorization_code', 'refresh_token', 'client_credentials', 'password'])
  grant_type!: string;

  @ApiPropertyOptional({
    description: 'Authorization code (for authorization_code grant)',
    example: 'SplxlOBeZQQYbYS6WxSbIA',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    description: 'Redirect URI that was used in authorization request',
    example: 'https://example.com/callback',
  })
  @IsString()
  @IsOptional()
  redirect_uri?: string;

  @ApiPropertyOptional({
    description: 'Client identifier',
    example: 'my-client-id',
  })
  @IsString()
  @IsOptional()
  client_id?: string;

  @ApiPropertyOptional({
    description: 'Client secret',
  })
  @IsString()
  @IsOptional()
  client_secret?: string;

  @ApiPropertyOptional({
    description: 'Refresh token (for refresh_token grant)',
  })
  @IsString()
  @IsOptional()
  refresh_token?: string;

  @ApiPropertyOptional({
    description: 'PKCE code verifier',
    example: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
  })
  @IsString()
  @IsOptional()
  code_verifier?: string;

  @ApiPropertyOptional({
    description: 'Requested scope',
    example: 'openid profile email',
  })
  @IsString()
  @IsOptional()
  scope?: string;

  @ApiPropertyOptional({
    description: 'Username (for password grant)',
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({
    description: 'Password (for password grant)',
  })
  @IsString()
  @IsOptional()
  password?: string;
}

export class TokenResponseDto {
  @ApiProperty({
    description: 'Access token',
    example: '2YotnFZFEjr1zCsicMWpAA',
  })
  access_token!: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  token_type!: string;

  @ApiProperty({
    description: 'Expires in seconds',
    example: 3600,
  })
  expires_in!: number;

  @ApiPropertyOptional({
    description: 'Refresh token',
    example: 'tGzv3JOkF0XG5Qx2TlKWIA',
  })
  refresh_token?: string;

  @ApiPropertyOptional({
    description: 'Granted scope',
    example: 'openid profile email',
  })
  scope?: string;

  @ApiPropertyOptional({
    description: 'ID token (OpenID Connect)',
  })
  id_token?: string;
}

export class RevokeTokenDto {
  @ApiProperty({
    description: 'Token to revoke',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiPropertyOptional({
    description: 'Token type hint',
    enum: ['access_token', 'refresh_token'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['access_token', 'refresh_token'])
  token_type_hint?: string;
}
