import type { RetryOptions } from './types';

export class RetryPolicy {
  constructor(private readonly options: Required<RetryOptions>) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | unknown;
    let attempt = 0;

    while (attempt < this.options.maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }

        attempt++;
        if (attempt >= this.options.maxAttempts) {
          break;
        }

        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.options.maxAttempts) {
      return false;
    }

    if (error instanceof Error && 'status' in error) {
      const status = (error as any).status;
      if (typeof status === 'number') {
        return this.options.retryableStatusCodes.includes(status);
      }
    }

    return true;
  }

  private calculateDelay(attempt: number): number {
    switch (this.options.backoff) {
      case 'exponential':
        return Math.min(
          this.options.initialDelay * Math.pow(2, attempt - 1),
          this.options.maxDelay
        );
      case 'linear':
        return Math.min(
          this.options.initialDelay * attempt,
          this.options.maxDelay
        );
      case 'fixed':
      default:
        return this.options.initialDelay;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
