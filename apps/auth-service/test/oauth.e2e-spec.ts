import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('OAuth2 Basic Endpoints (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/oauth/authorize (GET)', () => {
    it('should redirect to login when user not authenticated', () => {
      return request(app.getHttpServer())
        .get('/oauth/authorize')
        .query({
          response_type: 'code',
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'openid email',
          state: 'random-state',
        })
        .expect(302);
    });

    it('should require response_type parameter', () => {
      return request(app.getHttpServer())
        .get('/oauth/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
        })
        .expect(400);
    });

    it('should require client_id parameter', () => {
      return request(app.getHttpServer())
        .get('/oauth/authorize')
        .query({
          response_type: 'code',
          redirect_uri: 'http://localhost:3000/callback',
        })
        .expect(400);
    });
  });

  describe('/oauth/token (POST)', () => {
    it('should return 400 for invalid grant type', () => {
      return request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'invalid_grant',
        })
        .expect(400);
    });

    it('should return 400 for missing code in authorization_code grant', () => {
      return request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'authorization_code',
          redirect_uri: 'http://localhost:3000/callback',
        })
        .expect(400);
    });

    it('should return 400 for missing client_id', () => {
      return request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code: 'some-code',
          redirect_uri: 'http://localhost:3000/callback',
        })
        .expect(400);
    });

    it('should return 401 for invalid client credentials', () => {
      return request(app.getHttpServer())
        .post('/oauth/token')
        .send({
          grant_type: 'client_credentials',
          client_id: 'non-existent-client',
          client_secret: 'wrong-secret',
        })
        .expect(401);
    });
  });

  describe('/oauth/userinfo (GET)', () => {
    it('should return 401 without auth header', () => {
      return request(app.getHttpServer())
        .get('/oauth/userinfo')
        .expect(401);
    });

    it('should return 401 with invalid token', () => {
      return request(app.getHttpServer())
        .get('/oauth/userinfo')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 with malformed auth header', () => {
      return request(app.getHttpServer())
        .get('/oauth/userinfo')
        .set('Authorization', 'invalid-format')
        .expect(401);
    });
  });

  describe('/oauth/introspect (POST)', () => {
    it('should return inactive for non-existent token', () => {
      return request(app.getHttpServer())
        .post('/oauth/introspect')
        .send({
          token: 'non-existent-token',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.active).toBe(false);
        });
    });

    it('should require token parameter', () => {
      return request(app.getHttpServer())
        .post('/oauth/introspect')
        .send({})
        .expect(400);
    });
  });

  describe('/oauth/revoke (POST)', () => {
    it('should accept revoke request', () => {
      return request(app.getHttpServer())
        .post('/oauth/revoke')
        .send({
          token: 'some-token',
          token_type_hint: 'access_token',
        })
        .expect(200);
    });

    it('should require token parameter', () => {
      return request(app.getHttpServer())
        .post('/oauth/revoke')
        .send({})
        .expect(400);
    });
  });

  describe('/.well-known/openid-configuration (GET)', () => {
    it('should return OIDC discovery document', () => {
      return request(app.getHttpServer())
        .get('/.well-known/openid-configuration')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('issuer');
          expect(res.body).toHaveProperty('authorization_endpoint');
          expect(res.body).toHaveProperty('token_endpoint');
          expect(res.body).toHaveProperty('userinfo_endpoint');
          expect(res.body).toHaveProperty('jwks_uri');
          expect(res.body).toHaveProperty('scopes_supported');
          expect(res.body.scopes_supported).toContain('openid');
        });
    });
  });

  describe('/.well-known/jwks.json (GET)', () => {
    it('should return JWKS', () => {
      return request(app.getHttpServer())
        .get('/.well-known/jwks.json')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('keys');
          expect(Array.isArray(res.body.keys)).toBe(true);
        });
    });
  });

  describe('/api/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBeDefined();
        });
    });
  });

  describe('/api/health/live (GET)', () => {
    it('should return liveness status', () => {
      return request(app.getHttpServer())
        .get('/api/health/live')
        .expect(200);
    });
  });

  describe('/api/health/ready (GET)', () => {
    it('should return readiness status', () => {
      return request(app.getHttpServer())
        .get('/api/health/ready')
        .expect(200);
    });
  });
});
