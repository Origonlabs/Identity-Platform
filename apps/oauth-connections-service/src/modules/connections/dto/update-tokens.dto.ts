import { IsString, IsOptional, IsNumber, IsISO8601 } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTokensDto {
  @ApiProperty({
    description: 'OAuth access token',
    example: 'ya29.a0AfH6SMBx...',
  })
  @IsString()
  accessToken: string;

  @ApiPropertyOptional({
    description: 'OAuth refresh token',
    example: '1//0gOHxSbqv...',
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;

  @ApiPropertyOptional({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  @IsNumber()
  @IsOptional()
  expiresIn?: number;

  @ApiPropertyOptional({
    description: 'Token type (usually "Bearer")',
    example: 'Bearer',
  })
  @IsString()
  @IsOptional()
  tokenType?: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp when token was issued',
    example: '2024-01-15T10:30:00Z',
  })
  @IsISO8601()
  issuedAt: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 timestamp when token expires',
    example: '2024-01-15T11:30:00Z',
  })
  @IsISO8601()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'OpenID Connect ID token',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
  })
  @IsString()
  @IsOptional()
  idToken?: string;
}
