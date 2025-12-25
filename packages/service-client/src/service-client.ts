import fetch from 'node-fetch';
import type {
  ServiceClientOptions,
  RequestOptions,
  RetryOptions,
  CircuitBreakerOptions,
} from './types';
import { CircuitBreaker, CircuitBreakerOpenError } from './circuit-breaker';
import { RetryPolicy } from './retry-policy';

const defaultRetryOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 100,
  maxDelay: 5000,
  backoff: 'exponential',
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

const defaultCircuitBreakerOptions: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  resetTimeout: 60000,
  monitoringPeriod: 10000,
  halfOpenMaxAttempts: 2,
};

export class ServiceClient {
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryPolicy: RetryPolicy;
  private readonly baseUrl: string;
  private readonly defaultTimeout: number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: ServiceClientOptions) {
    this.baseUrl = options.baseUrl;
    this.defaultTimeout = options.timeout ?? 5000;
    this.defaultHeaders = options.headers ?? {};

    const retryOptions = {
      ...defaultRetryOptions,
      ...options.retry,
    };
    this.retryPolicy = new RetryPolicy(retryOptions);

    const circuitBreakerOptions = {
      ...defaultCircuitBreakerOptions,
      ...options.circuitBreaker,
    };
    this.circuitBreaker = new CircuitBreaker(circuitBreakerOptions);
  }

  async call<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method ?? 'GET';
    const timeout = options.timeout ?? this.defaultTimeout;
    const headers = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
      ...options.headers,
    };

    return this.circuitBreaker.execute(() =>
      this.retryPolicy.execute(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const body =
            options.body !== undefined
              ? JSON.stringify(options.body)
              : undefined;

          const response = await fetch(url, {
            method,
            headers,
            body,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const error: any = new Error(
              `HTTP ${response.status}: ${response.statusText}`
            );
            error.status = response.status;
            error.response = response;
            throw error;
          }

          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            return (await response.json()) as T;
          }

          return (await response.text()) as unknown as T;
        } catch (error) {
          clearTimeout(timeoutId);

          if (error instanceof CircuitBreakerOpenError) {
            throw error;
          }

          if (error instanceof Error && error.name === 'AbortError') {
            const timeoutError: any = new Error('Request timeout');
            timeoutError.status = 408;
            throw timeoutError;
          }

          throw error;
        }
      })
    );
  }

  get<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.call<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.call<T>(endpoint, { ...options, method: 'POST', body });
  }

  put<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.call<T>(endpoint, { ...options, method: 'PUT', body });
  }

  patch<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.call<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  delete<T>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<T> {
    return this.call<T>(endpoint, { ...options, method: 'DELETE' });
  }
}
