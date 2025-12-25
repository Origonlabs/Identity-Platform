import type { QueryOptimizationOptions } from './types';

export class QueryOptimizer {
  optimizeQuery<T>(
    query: () => Promise<T[]>,
    options: QueryOptimizationOptions = {}
  ): () => Promise<T[]> {
    return async () => {
      let results = await query();

      if (options.maxResults && results.length > options.maxResults) {
        results = results.slice(0, options.maxResults);
      }

      return results;
    };
  }

  async executeParallel<T>(
    queries: Array<() => Promise<T>>,
    maxConcurrency = 5
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const query of queries) {
      const promise = query().then((result) => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex((p) => p === promise),
          1
        );
      }
    }

    await Promise.all(executing);
    return results;
  }

  async executeSequential<T>(
    queries: Array<() => Promise<T>>
  ): Promise<T[]> {
    const results: T[] = [];

    for (const query of queries) {
      const result = await query();
      results.push(result);
    }

    return results;
  }
}
