/**
 * K6 Load Test - Authentication Flow
 * Tests signup, signin, and token refresh under load
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const signupDuration = new Trend('signup_duration');
const signinDuration = new Trend('signin_duration');
const tokenRefreshDuration = new Trend('token_refresh_duration');
const signupSuccesses = new Counter('signup_successes');
const signinSuccesses = new Counter('signin_successes');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm-up: 10 VUs for 30s
    { duration: '1m', target: 50 },    // Ramp-up: 50 VUs for 1 min
    { duration: '3m', target: 100 },   // Load test: 100 VUs for 3 min
    { duration: '2m', target: 200 },   // Stress test: 200 VUs for 2 min
    { duration: '1m', target: 100 },   // Scale down: 100 VUs for 1 min
    { duration: '30s', target: 0 },    // Cool down: 0 VUs for 30s
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'], // 95% < 2s, 99% < 5s
    'http_req_failed': ['rate<0.05'],                   // Error rate < 5%
    'errors': ['rate<0.1'],                             // Custom error rate < 10%
    'signup_duration': ['p(95)<3000'],                  // 95% signups < 3s
    'signin_duration': ['p(95)<1500'],                  // 95% signins < 1.5s
    'token_refresh_duration': ['p(95)<500'],            // 95% token refreshes < 500ms
  },
};

// Environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8102';
const PROJECT_ID = __ENV.PROJECT_ID || 'test-project';

// Helper function to generate random email
function randomEmail() {
  return `loadtest-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

// Helper function to generate random password
function randomPassword() {
  return `TestPass${Math.random().toString(36).substring(7)}!123`;
}

export default function() {
  const email = randomEmail();
  const password = randomPassword();
  let accessToken = null;
  let refreshToken = null;

  // Test 1: User Signup
  group('User Signup', () => {
    const signupPayload = JSON.stringify({
      email: email,
      password: password,
      projectId: PROJECT_ID,
    });

    const signupParams = {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'signup' },
    };

    const signupStart = Date.now();
    const signupRes = http.post(
      `${BASE_URL}/api/v1/auth/signup`,
      signupPayload,
      signupParams
    );
    const signupEnd = Date.now();

    signupDuration.add(signupEnd - signupStart);

    const signupSuccess = check(signupRes, {
      'signup status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'signup returns access token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.accessToken !== undefined;
        } catch (e) {
          return false;
        }
      },
    });

    if (signupSuccess) {
      signupSuccesses.add(1);
      try {
        const signupBody = JSON.parse(signupRes.body);
        accessToken = signupBody.accessToken;
        refreshToken = signupBody.refreshToken;
      } catch (e) {
        errorRate.add(1);
      }
    } else {
      errorRate.add(1);
    }
  });

  sleep(1);

  // Test 2: User Signin (with existing account)
  if (accessToken) {
    group('User Signin', () => {
      const signinPayload = JSON.stringify({
        email: email,
        password: password,
        projectId: PROJECT_ID,
      });

      const signinParams = {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'signin' },
      };

      const signinStart = Date.now();
      const signinRes = http.post(
        `${BASE_URL}/api/v1/auth/signin`,
        signinPayload,
        signinParams
      );
      const signinEnd = Date.now();

      signinDuration.add(signinEnd - signinStart);

      const signinSuccess = check(signinRes, {
        'signin status is 200': (r) => r.status === 200,
        'signin returns access token': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.accessToken !== undefined;
          } catch (e) {
            return false;
          }
        },
      });

      if (signinSuccess) {
        signinSuccesses.add(1);
      } else {
        errorRate.add(1);
      }
    });

    sleep(1);
  }

  // Test 3: Token Refresh
  if (refreshToken) {
    group('Token Refresh', () => {
      const refreshPayload = JSON.stringify({
        refreshToken: refreshToken,
      });

      const refreshParams = {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'token-refresh' },
      };

      const refreshStart = Date.now();
      const refreshRes = http.post(
        `${BASE_URL}/api/v1/auth/refresh`,
        refreshPayload,
        refreshParams
      );
      const refreshEnd = Date.now();

      tokenRefreshDuration.add(refreshEnd - refreshStart);

      const refreshSuccess = check(refreshRes, {
        'refresh status is 200': (r) => r.status === 200,
        'refresh returns new access token': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.accessToken !== undefined;
          } catch (e) {
            return false;
          }
        },
      });

      if (!refreshSuccess) {
        errorRate.add(1);
      }
    });

    sleep(1);
  }

  // Test 4: Get User Profile (authenticated request)
  if (accessToken) {
    group('Get User Profile', () => {
      const profileParams = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        tags: { name: 'profile' },
      };

      const profileRes = http.get(
        `${BASE_URL}/api/v1/users/me`,
        profileParams
      );

      const profileSuccess = check(profileRes, {
        'profile status is 200': (r) => r.status === 200,
        'profile returns user data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.email === email;
          } catch (e) {
            return false;
          }
        },
      });

      if (!profileSuccess) {
        errorRate.add(1);
      }
    });
  }

  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

// Setup function - runs once before the test
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  console.log(`Project ID: ${PROJECT_ID}`);

  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    throw new Error(`Health check failed with status ${healthRes.status}`);
  }

  return { startTime: Date.now() };
}

// Teardown function - runs once after the test
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)} seconds`);
}

// Handle summary - custom report generation
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n';
  summary += `${indent}Load Test Results\n`;
  summary += `${indent}${'='.repeat(50)}\n`;
  summary += `${indent}Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%\n`;
  summary += `${indent}Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}P99 Response Time: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  summary += `${indent}Successful Signups: ${data.metrics.signup_successes.values.count}\n`;
  summary += `${indent}Successful Signins: ${data.metrics.signin_successes.values.count}\n`;

  return summary;
}
