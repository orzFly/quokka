// deno-lint-ignore-file no-explicit-any

export class SingleFlightGroup<K> {
  pool = new Map<K, PromiseLike<unknown>>();

  async run<F extends (...args: any[]) => PromiseLike<any>>(
    key: K,
    generator: F,
    ...args: Parameters<F>
  ): Promise<Awaited<ReturnType<F>>> {
    let pending = this.pool.get(key);

    if (pending === undefined) {
      pending = generator(...args);
      this.pool.set(key, pending);
      try {
        return (await pending) as Awaited<ReturnType<F>>;
      } finally {
        if (this.pool.get(key) === pending) {
          this.pool.delete(key);
        } else {
          // deno-lint-ignore no-unsafe-finally
          throw new Error("...? This should never happen");
        }
      }
    }

    return (await pending) as Awaited<ReturnType<F>>;
  }

  async wait(key: K): Promise<void> {
    const pending = this.pool.get(key);
    if (pending !== undefined) {
      await pending;
    }
  }
}

export function singleFlight<F extends (key?: any) => PromiseLike<any>>(
  generator: F,
): (...args: Parameters<F>) => Promise<Awaited<ReturnType<F>>> {
  const pool = new SingleFlightGroup<Parameters<F>[0]>();
  return (...args: Parameters<F>) => {
    return pool.run<F>(args[0], generator, ...args);
  };
}
