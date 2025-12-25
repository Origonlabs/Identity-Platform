import { IsString, IsNotEmpty, IsOptional, IsIn, IsUrl, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthorizeRequestDto {
  @ApiProperty({
    description: 'OAuth 2.0 response type',
    example: 'code',
    enum: ['code', 'token', 'id_token'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['code', 'token', 'id_token', 'code id_token', 'code token', 'id_token token', 'code id_token token'])
  response_type!: string;

  @ApiProperty({
    description: 'Client identifier',
    example: 'my-client-id',
  })
  @IsString()
  @IsNotEmpty()
  client_id!: string;

  @ApiProperty({
    description: 'Redirect URI where the response will be sent',
    example: 'https://example.com/callback',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  redirect_uri!: string;

  @ApiPropertyOptional({
    description: 'OAuth 2.0 scope',
    example: 'openid profile email',
  })
  @IsString()
  @IsOptional()
  scope?: string;

  @ApiPropertyOptional({
    description: 'Opaque value to maintain state between request and callback',
    example: 'random-state-string',
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({
    description: 'PKCE code challenge',
    example: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  })
  @IsString()
  @IsOptional()
  code_challenge?: string;

  @ApiPropertyOptional({
    description: 'PKCE code challenge method',
    example: 'S256',
    enum: ['plain', 'S256'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['plain', 'S256'])
  code_challenge_method?: string;

  @ApiPropertyOptional({
    description: 'OpenID Connect nonce',
    example: 'random-nonce',
  })
  @IsString()
  @IsOptional()
  nonce?: string;

  @ApiPropertyOptional({
    description: 'OpenID Connect prompt parameter',
    example: 'consent',
    enum: ['none', 'login', 'consent', 'select_account'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['none', 'login', 'consent', 'select_account'])
  prompt?: string;

  @ApiPropertyOptional({
    description: 'OpenID Connect max_age parameter',
    example: 3600,
  })
  @IsOptional()
  max_age?: number;
}

export class AuthorizeResponseDto {
  @ApiProperty({
    description: 'Authorization code',
    example: 'SplxlOBeZQQYbYS6WxSbIA',
  })
  code?: string;

  @ApiPropertyOptional({
    description: 'Access token (implicit flow)',
  })
  access_token?: string;

  @ApiPropertyOptional({
    description: 'Token type',
    example: 'Bearer',
  })
  token_type?: string;

  @ApiPropertyOptional({
    description: 'Expires in seconds',
    example: 3600,
  })
  expires_in?: number;

  @ApiPropertyOptional({
    description: 'ID token (OpenID Connect)',
  })
  id_token?: string;

  @ApiPropertyOptional({
    description: 'State parameter from request',
  })
  state?: string;
}
