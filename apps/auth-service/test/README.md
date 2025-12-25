# Testing Guide

This document provides information about the test suite for the Auth Service microservice.

## Test Structure

The test suite is organized into three main categories:

### 1. Unit Tests (`src/**/*.spec.ts`)

Unit tests focus on testing individual components in isolation with mocked dependencies.

**Coverage:**
- `oauth2.service.spec.ts` - OAuth2 core functionality (authorize, token, introspect, revoke)
- `token.service.spec.ts` - JWT token generation and validation
- `oidc.service.spec.ts` - OpenID Connect implementation
- `github.provider.spec.ts` - GitHub OAuth provider
- `google.provider.spec.ts` - Google OAuth provider

### 2. Integration Tests

Integration tests verify that different components work together correctly.

**Coverage:**
- OAuth provider implementations with HTTP calls
- Database operations with Prisma
- Redis caching and session management

### 3. End-to-End Tests (`test/*.e2e-spec.ts`)

E2E tests validate complete user flows through the API.

**Coverage:**
- `oauth.e2e-spec.ts` - Basic OAuth endpoint validation
- `oauth-flow.e2e-spec.ts` - Complete OAuth2 flows:
  - Authorization Code Flow
  - PKCE Flow
  - Client Credentials Flow
  - Refresh Token Flow
  - Token revocation
  - OIDC Discovery

## Running Tests

### Prerequisites

```bash
# Install dependencies
pnpm install

# Setup test database
cp .env.example .env.test
# Edit .env.test with test database credentials

# Run database migrations
pnpm prisma:migrate
```

### Commands

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Run e2e tests
pnpm test:e2e

# Run specific test file
pnpm test oauth2.service.spec.ts

# Run tests matching pattern
pnpm test --testNamePattern="should generate authorization code"
```

### Debug Tests

```bash
# Run tests in debug mode
pnpm test:debug

# Then attach your debugger to port 9229
```

## Test Utilities

### TestHelpers

Located in `test/utils/test-helpers.ts`, provides utilities for:

- Creating test clients, users, tokens
- Generating PKCE pairs
- Parsing JWTs
- Cleaning up test data

**Example:**

```typescript
import { TestHelpers } from './utils/test-helpers';

const helpers = new TestHelpers(prisma);

// Create test client
const client = await helpers.createTestClient({
  clientId: 'my-test-client',
  allowedScopes: ['openid', 'email'],
});

// Generate PKCE pair
const { codeVerifier, codeChallenge } = helpers.generatePKCEPair();

// Cleanup
await helpers.cleanupTestData(client.id);
```

## Coverage Goals

The test suite aims for:

- **Unit Tests**: >80% code coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: All major user flows covered

### Current Coverage

Run `pnpm test:cov` to see detailed coverage report.

```bash
pnpm test:cov

# View HTML coverage report
open coverage/index.html
```

## Writing Tests

### Unit Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        { provide: DependencyService, useValue: mockDependency },
      ],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should perform expected behavior', async () => {
    const result = await service.someMethod();
    expect(result).toEqual(expectedValue);
  });
});
```

### E2E Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Feature (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should perform action', () => {
    return request(app.getHttpServer())
      .get('/endpoint')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('field');
      });
  });
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on others
2. **Cleanup**: Always clean up test data in `afterEach` or `afterAll`
3. **Mocking**: Mock external dependencies (HTTP calls, databases) in unit tests
4. **Descriptive Names**: Use clear test names that describe the behavior
5. **Arrange-Act-Assert**: Follow AAA pattern in tests
6. **Edge Cases**: Test both happy paths and error scenarios

## Continuous Integration

Tests run automatically on:
- Every commit (pre-commit hook)
- Pull requests (GitHub Actions)
- Main branch merges

### CI Configuration

```yaml
# .github/workflows/test.yml
- name: Run unit tests
  run: pnpm test

- name: Run e2e tests
  run: pnpm test:e2e

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Tests Fail with Database Connection Error

```bash
# Ensure test database is running
docker-compose up -d postgres

# Check DATABASE_URL in .env.test
echo $DATABASE_URL
```

### Tests Fail with Module Not Found

```bash
# Clear jest cache
pnpm test --clearCache

# Reinstall dependencies
rm -rf node_modules
pnpm install
```

### E2E Tests Timeout

```bash
# Increase timeout in jest config
# jest.config.js
{
  testTimeout: 30000
}
```

## Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Support

For questions or issues with tests:
1. Check this documentation
2. Review existing test files for examples
3. Open an issue on GitHub
