// deno-lint-ignore-file no-explicit-any

/**
 * A group that ensures only one execution of a function per key.
 * Multiple calls with the same key will wait for the first execution to complete
 * and share the same result.
 *
 * @template K - The type of the key used to identify function executions
 */
export class SingleFlightGroup<K> {
  private readonly pool = new Map<K, PromiseLike<unknown>>();

  /**
   * Executes a function, ensuring only one execution per key.
   * If a function is already running for the given key, this method will wait
   * for that execution to complete and return the same result.
   *
   * @template F - The function type to execute
   * @param key - The key to identify this function execution
   * @param generator - The function to execute
   * @param args - Arguments to pass to the function
   * @returns A promise that resolves to the result of the function execution
   *
   * @example
   * ```typescript
   * const group = new SingleFlightGroup<string>();
   *
   * // Multiple calls with the same key will share the same result
   * const result1 = group.run("fetch-user", fetchUser, "user123");
   * const result2 = group.run("fetch-user", fetchUser, "user123");
   * // Both promises will resolve to the same value
   * ```
   */
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

  /**
   * Waits for any pending execution with the given key to complete.
   * If no execution is pending for the key, this method returns immediately.
   *
   * @param key - The key to wait for
   * @returns A promise that resolves when the pending execution completes
   *
   * @example
   * ```typescript
   * const group = new SingleFlightGroup<string>();
   *
   * // Start an execution
   * const promise = group.run("fetch-user", fetchUser, "user123");
   *
   * // Wait for it to complete (without getting the result)
   * await group.wait("fetch-user");
   * ```
   */
  async wait(key: K): Promise<void> {
    const pending = this.pool.get(key);
    if (pending !== undefined) {
      await pending;
    }
  }
}

/**
 * Creates a single-flight function that ensures only one execution per key.
 * This is a convenience function that creates a SingleFlightGroup internally.
 *
 * **Note:** The first argument of the wrapped function will be used as the key
 * for deduplication.
 *
 * @template F - The function type to wrap
 * @param generator - The function to make single-flight
 * @returns A new function that ensures only one execution per key
 *
 * @example
 * ```typescript
 * const fetchUserSingleFlight = singleFlight(async (userId: string) => {
 *   // This function will only execute once per userId
 *   return await fetch(`/api/users/${userId}`);
 * });
 *
 * // Multiple calls with the same userId will share the same result
 * const user1 = fetchUserSingleFlight("user123");
 * const user2 = fetchUserSingleFlight("user123");
 * // Both promises resolve to the same user data
 * ```
 */
export function singleFlight<F extends (key?: any) => PromiseLike<any>>(
  generator: F,
): (...args: Parameters<F>) => Promise<Awaited<ReturnType<F>>> {
  const pool = new SingleFlightGroup<Parameters<F>[0]>();
  return (...args: Parameters<F>) => {
    return pool.run<F>(args[0], generator, ...args);
  };
}
