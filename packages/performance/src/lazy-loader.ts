export class LazyLoader<T> {
  private value: T | null = null;
  private promise: Promise<T> | null = null;

  constructor(private readonly loader: () => Promise<T>) {}

  async get(): Promise<T> {
    if (this.value !== null) {
      return this.value;
    }

    if (this.promise === null) {
      this.promise = this.loader().then((v) => {
        this.value = v;
        this.promise = null;
        return v;
      });
    }

    return this.promise;
  }

  invalidate(): void {
    this.value = null;
    this.promise = null;
  }

  isLoaded(): boolean {
    return this.value !== null;
  }
}
