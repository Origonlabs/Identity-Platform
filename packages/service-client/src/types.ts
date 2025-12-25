export interface ServiceClientOptions {
  baseUrl: string;
  timeout?: number;
  retry?: RetryOptions;
  circuitBreaker?: CircuitBreakerOptions;
  headers?: Record<string, string>;
}

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoff?: 'exponential' | 'linear' | 'fixed';
  retryableStatusCodes?: number[];
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
  halfOpenMaxAttempts?: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface ServiceInstance {
  url: string;
  healthy: boolean;
  lastError?: Date;
}
