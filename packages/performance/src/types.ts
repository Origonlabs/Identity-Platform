export interface QueryOptimizationOptions {
  maxResults?: number;
  useIndex?: boolean;
  cacheable?: boolean;
  parallel?: boolean;
}

export interface BatchOptions {
  batchSize: number;
  concurrency?: number;
  timeout?: number;
}

export interface PoolOptions {
  min: number;
  max: number;
  idleTimeoutMillis?: number;
  acquireTimeoutMillis?: number;
}
