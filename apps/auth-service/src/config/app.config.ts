import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],

  // API Configuration
  apiVersion: process.env.API_VERSION || 'v1',
  apiPrefix: process.env.API_PREFIX || 'api',

  // Security
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m',
    refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
  },

  // OAuth Configuration
  oauth: {
    authorizationCodeExpiration: parseInt(process.env.OAUTH_AUTHORIZATION_CODE_EXPIRATION || '600', 10), // 10 minutes
    accessTokenExpiration: parseInt(process.env.OAUTH_ACCESS_TOKEN_EXPIRATION || '3600', 10), // 1 hour
    refreshTokenExpiration: parseInt(process.env.OAUTH_REFRESH_TOKEN_EXPIRATION || '2592000', 10), // 30 days
    allowedScopes: ['openid', 'profile', 'email', 'offline_access'],
  },

  // Rate Limiting
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
}));
