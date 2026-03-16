export class ObjectPool<T> {
  private available: T[] = [];
  private factory: () => T;
  private resetFn: (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void, prealloc = 0) {
    this.factory = factory;
    this.resetFn = reset;
    for (let i = 0; i < prealloc; i++) {
      this.available.push(this.factory());
    }
  }

  acquire(): T {
    if (this.available.length > 0) {
      const obj = this.available.pop()!;
      this.resetFn(obj);
      return obj;
    }
    return this.factory();
  }

  release(obj: T): void {
    this.available.push(obj);
  }

  get size(): number {
    return this.available.length;
  }
}
