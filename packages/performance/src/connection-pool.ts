import type { PoolOptions } from './types';

export class ConnectionPool<T> {
  private readonly pool: T[] = [];
  private readonly waiting: Array<{
    resolve: (connection: T) => void;
    reject: (error: Error) => void;
  }> = [];
  private active = 0;

  constructor(
    private readonly factory: () => Promise<T>,
    private readonly destroy: (connection: T) => Promise<void>,
    private readonly options: PoolOptions
  ) {}

  async acquire(): Promise<T> {
    if (this.pool.length > 0) {
      const connection = this.pool.pop()!;
      this.active++;
      return connection;
    }

    if (this.active < this.options.max) {
      const connection = await this.factory();
      this.active++;
      return connection;
    }

    return new Promise<T>((resolve, reject) => {
      this.waiting.push({ resolve, reject });
      setTimeout(() => {
        const index = this.waiting.findIndex((w) => w.resolve === resolve);
        if (index !== -1) {
          this.waiting.splice(index, 1);
          reject(new Error('Connection acquisition timeout'));
        }
      }, this.options.acquireTimeoutMillis || 30000);
    });
  }

  async release(connection: T): Promise<void> {
    this.active--;

    if (this.pool.length < this.options.min) {
      this.pool.push(connection);
    } else {
      await this.destroy(connection);
    }

    if (this.waiting.length > 0) {
      const { resolve } = this.waiting.shift()!;
      const newConnection = await this.acquire();
      resolve(newConnection);
    }
  }

  async destroyAll(): Promise<void> {
    await Promise.all(this.pool.map((conn) => this.destroy(conn)));
    this.pool.length = 0;
    this.active = 0;
  }

  getStats() {
    return {
      poolSize: this.pool.length,
      active: this.active,
      waiting: this.waiting.length,
      total: this.pool.length + this.active,
    };
  }
}
