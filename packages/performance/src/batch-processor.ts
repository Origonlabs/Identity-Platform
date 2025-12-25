import PQueue from 'p-queue';
import type { BatchOptions } from './types';

export class BatchProcessor<T, R> {
  private readonly queue: PQueue;

  constructor(private readonly options: BatchOptions) {
    this.queue = new PQueue({
      concurrency: options.concurrency || 5,
      interval: 1000,
      intervalCap: options.batchSize,
    });
  }

  async process(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const batches = this.createBatches(items);
    const results: R[] = [];

    const promises = batches.map((batch) =>
      this.queue.add(async () => {
        const batchResults = await processor(batch);
        results.push(...batchResults);
        return batchResults;
      })
    );

    await Promise.all(promises);
    return results;
  }

  async processWithTimeout(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    timeout: number
  ): Promise<R[]> {
    return Promise.race([
      this.process(items, processor),
      new Promise<R[]>((_, reject) =>
        setTimeout(() => reject(new Error('Batch processing timeout')), timeout)
      ),
    ]);
  }

  private createBatches(items: T[]): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += this.options.batchSize) {
      batches.push(items.slice(i, i + this.options.batchSize));
    }
    return batches;
  }
}
