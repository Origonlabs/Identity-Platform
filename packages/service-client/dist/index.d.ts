export interface CircuitBreakerConfig {
  failureThreshold?: number;
  resetTimeout?: number;
}

export interface ServiceClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  circuitBreaker?: CircuitBreakerConfig;
}

export class ServiceClient {
  constructor(config: ServiceClientConfig);
  get<T>(path: string): Promise<T>;
  post<T>(path: string, data: any): Promise<T>;
  put<T>(path: string, data: any): Promise<T>;
  delete<T>(path: string): Promise<T>;
  call<T>(url: string, options?: { method?: any; body?: any; headers?: any }): Promise<T>;
}

export function createServiceClient(config: ServiceClientConfig): ServiceClient;
