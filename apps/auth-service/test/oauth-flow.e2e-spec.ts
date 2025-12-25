import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('Complete OAuth2 Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testClient: any;
  let testUser: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // Setup test data
    testClient = await prisma.client.create({
      data: {
        clientId: 'test-client-e2e',
        clientSecret: 'test-secret-e2e',
        name: 'Test Client',
        redirectUris: ['http://localhost:3000/callback'],
        grantTypes: ['authorization_code', 'refresh_token', 'client_credentials'],
        allowedScopes: ['openid', 'email', 'profile', 'offline_access'],
        pkceRequired: false,
      },
    });

    testUser = await prisma.user.create({
      data: {
        email: 'e2e-test@example.com',
        emailVerified: true,
        passwordHash: 'hashed-password',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.accessToken.deleteMany({
      where: { clientId: testClient.id },
    });
    await prisma.refreshToken.deleteMany({
      where: { clientId: testClient.id },
    });
    await prisma.authorizationCode.deleteMany({
      where: { clientId: testClient.id },
    });
    await prisma.client.delete({ where: { id: testClient.id } });
    await prisma.user.delete({ where: { id: testUser.id } });

    await app.close();
  });

  describe('Authorization Code Flow', () => {
    let authorizationCode: string;
    let accessToken: string;
    let refreshToken: string;

    it('should initiate authorization and generate code', async () => {
      const response = await request(app.getHttpServer())
        .get('/oauth/authorize')
        .query({
          response_type: 'code',
          client_id: testClient.clientId,
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'openid email',
          state: 'random-state-123',
        })
        .expect(302);

      expect(response.headers.location).toBeDefined();
      const location = new URL(response.headers.location, 'http://localhost:3000');
      authorizationCode = location.searchParams.get('code');

      expect(authorizationCode).toBeDefined();
      expect(location.searchParams.get('state')).toBe('random-state-123');
    });

    it('should exchange authorization code for tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code: authorizationCode,
          redirect_uri: 'http://localhost:3000/callback',
          client_id: testClient.clientId,
          client_secret: testClient.clientSecret,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('token_type', 'Bearer');
      expect(response.body).toHaveProperty('expires_in');
      expect(response.body).toHaveProperty('scope');

      accessToken = response.body.access_token;
      refreshToken = response.body.refresh_token;
    });

    it('should access userinfo with access token', async () => {
      const response = await request(app.getHttpServer())
        .get('/oauth/userinfo')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('sub', testUser.id);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('email_verified', testUser.emailVerified);
    });

    it('should introspect access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/oauth/introspect')
        .send({
          token: accessToken,
          token_type_hint: 'access_token',
        })
        .expect(200);

      expect(response.body).toHaveProperty('active', true);
      expect(response.body).toHaveProperty('client_id', testClient.clientId);
      expect(response.body).toHaveProperty('scope');
    });

    it('should refresh access token using refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: testClient.clientId,
          client_secret: testClient.clientSecret,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('token_type', 'Bearer');
      expect(response.body.access_token).not.toBe(accessToken);

      accessToken = response.body.access_token;
    });

    it('should revoke access token', async () => {
      await request(app.getHttpServer())
        .post('/oauth/revoke')
        .send({
          token: accessToken,
          token_type_hint: 'access_token',
        })
        .expect(200);

      const introspectResponse = await request(app.getHttpServer())
        .post('/oauth/introspect')
        .send({
          token: accessToken,
        })
        .expect(200);

      expect(introspectResponse.body.active).toBe(false);
    });

    it('should not reuse authorization code', async () => {
      await request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code: authorizationCode,
          redirect_uri: 'http://localhost:3000/callback',
          client_id: testClient.clientId,
          client_secret: testClient.clientSecret,
        })
        .expect(401);
    });
  });

  describe('PKCE Flow', () => {
    let pkceClient: any;
    let codeVerifier: string;
    let codeChallenge: string;
    let authCode: string;

    beforeAll(async () => {
      pkceClient = await prisma.client.create({
        data: {
          clientId: 'pkce-client',
          name: 'PKCE Client',
          redirectUris: ['http://localhost:3000/callback'],
          grantTypes: ['authorization_code'],
          allowedScopes: ['openid', 'email'],
          pkceRequired: true,
        },
      });

      codeVerifier = 'test-code-verifier-12345678901234567890';
      const crypto = require('crypto');
      codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
    });

    afterAll(async () => {
      await prisma.authorizationCode.deleteMany({
        where: { clientId: pkceClient.id },
      });
      await prisma.client.delete({ where: { id: pkceClient.id } });
    });

    it('should require code_challenge for PKCE client', async () => {
      await request(app.getHttpServer())
        .get('/oauth/authorize')
        .query({
          response_type: 'code',
          client_id: pkceClient.clientId,
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'openid email',
          state: 'state',
        })
        .expect(400);
    });

    it('should generate code with PKCE challenge', async () => {
      const response = await request(app.getHttpServer())
        .get('/oauth/authorize')
        .query({
          response_type: 'code',
          client_id: pkceClient.clientId,
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'openid email',
          state: 'state',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        })
        .expect(302);

      const location = new URL(response.headers.location, 'http://localhost:3000');
      authCode = location.searchParams.get('code');
      expect(authCode).toBeDefined();
    });

    it('should require code_verifier for token exchange', async () => {
      await request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code: authCode,
          redirect_uri: 'http://localhost:3000/callback',
          client_id: pkceClient.clientId,
        })
        .expect(400);
    });

    it('should exchange code with valid code_verifier', async () => {
      const response = await request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code: authCode,
          redirect_uri: 'http://localhost:3000/callback',
          client_id: pkceClient.clientId,
          code_verifier: codeVerifier,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
    });
  });

  describe('Client Credentials Flow', () => {
    it('should issue token for valid client credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'client_credentials',
          client_id: testClient.clientId,
          client_secret: testClient.clientSecret,
          scope: 'api.read',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('token_type', 'Bearer');
      expect(response.body).not.toHaveProperty('refresh_token');
    });

    it('should reject invalid client credentials', async () => {
      await request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'client_credentials',
          client_id: testClient.clientId,
          client_secret: 'wrong-secret',
        })
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should reject invalid redirect_uri', async () => {
      await request(app.getHttpServer())
        .get('/oauth/authorize')
        .query({
          response_type: 'code',
          client_id: testClient.clientId,
          redirect_uri: 'http://evil.com/callback',
          scope: 'openid',
          state: 'state',
        })
        .expect(400);
    });

    it('should reject unsupported grant type', async () => {
      await request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'password',
          username: 'user',
          password: 'pass',
        })
        .expect(400);
    });

    it('should reject expired authorization code', async () => {
      const expiredCode = await prisma.authorizationCode.create({
        data: {
          code: 'expired-code',
          clientId: testClient.id,
          userId: testUser.id,
          scope: 'openid',
          redirectUri: 'http://localhost:3000/callback',
          expiresAt: new Date(Date.now() - 60000),
        },
      });

      await request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code: expiredCode.code,
          redirect_uri: 'http://localhost:3000/callback',
          client_id: testClient.clientId,
          client_secret: testClient.clientSecret,
        })
        .expect(401);
    });

    it('should reject access to userinfo without token', async () => {
      await request(app.getHttpServer()).get('/oauth/userinfo').expect(401);
    });

    it('should reject invalid bearer token', async () => {
      await request(app.getHttpServer())
        .get('/oauth/userinfo')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('OIDC Discovery', () => {
    it('should return discovery document', async () => {
      const response = await request(app.getHttpServer())
        .get('/.well-known/openid-configuration')
        .expect(200);

      expect(response.body).toHaveProperty('issuer');
      expect(response.body).toHaveProperty('authorization_endpoint');
      expect(response.body).toHaveProperty('token_endpoint');
      expect(response.body).toHaveProperty('userinfo_endpoint');
      expect(response.body).toHaveProperty('jwks_uri');
      expect(response.body).toHaveProperty('scopes_supported');
      expect(response.body.scopes_supported).toContain('openid');
    });

    it('should return JWKS', async () => {
      const response = await request(app.getHttpServer())
        .get('/.well-known/jwks.json')
        .expect(200);

      expect(response.body).toHaveProperty('keys');
      expect(Array.isArray(response.body.keys)).toBe(true);
      expect(response.body.keys.length).toBeGreaterThan(0);
    });
  });
});
