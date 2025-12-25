import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_DATABASE_URL,

  // Connection pooling
  connectionLimit: parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10', 10),

  // Logging
  logging: process.env.DATABASE_LOGGING === 'true',

  // SSL
  ssl: process.env.DATABASE_SSL === 'true' ? {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
  } : false,
}));
