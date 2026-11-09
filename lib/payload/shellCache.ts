import { isPayloadAPIError } from "./errors.ts";

export interface ShellCacheOptions<T> {
  load: () => Promise<T>;
  revisionOf: (value: T) => string | null;
  /** How long a loaded value is served without asking the CMS again. */
  freshMs: number;
  /** How long a visitor waits for new data before getting the last valid value. */
  waitMs: number;
  /** Pause after a failure, so an outage does not delay every page by waitMs. */
  retryAfterFailureMs: number;
  now?: () => number;
  onRefreshFailure?: (failure: ShellRefreshFailure) => void;
}

export interface ShellRefreshFailure {
  errorType: string;
  httpStatus: number | null;
  hasLastValid: boolean;
  ageMs: number | null;
}

export interface ShellCacheStatus {
  hasData: boolean;
  revision: string | null;
  ageMs: number | null;
  refreshing: boolean;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  lastDegradedAt: string | null;
}

export function describeShellError(
  error: unknown,
): Pick<ShellRefreshFailure, "errorType" | "httpStatus"> {
  if (isPayloadAPIError(error)) {
    return { errorType: error.kind, httpStatus: error.status ?? null };
  }
  return {
    errorType: error instanceof Error ? error.name : "unknown",
    httpStatus: null,
  };
}

/**
 * Keeps the last valid storefront shell and refreshes it from the CMS.
 *
 * A successful refresh is visible to the visitor who triggered it, as long as
 * it finishes within waitMs. A slow or failed refresh never empties the menu:
 * the last valid value is served, and null only happens when nothing valid has
 * ever been loaded (the caller must treat that page as degraded).
 */
export function createShellCache<T>(options: ShellCacheOptions<T>) {
  const now = options.now ?? Date.now;
  let entry: { value: T; loadedAt: number } | null = null;
  let inFlight: Promise<T> | null = null;
  let lastFailure: { at: number; errorType: string } | null = null;
  let lastDegradedAt: number | null = null;

  function ageOf(at: number): number | null {
    return entry ? at - entry.loadedAt : null;
  }

  function refresh(): Promise<T> {
    if (inFlight) return inFlight;
    inFlight = options.load().then((value) => {
      entry = { value, loadedAt: now() };
      lastFailure = null;
      return value;
    }, (error: unknown) => {
      const at = now();
      const described = describeShellError(error);
      lastFailure = { at, errorType: described.errorType };
      options.onRefreshFailure?.({
        ...described,
        hasLastValid: entry !== null,
        ageMs: ageOf(at),
      });
      throw error;
    }).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  async function settlesWithin(
    pending: Promise<unknown>,
    ms: number,
  ): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        pending,
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, ms);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  function lastValid(): { value: T; stale: boolean } | null {
    if (entry) return { value: entry.value, stale: true };
    lastDegradedAt = now();
    return null;
  }

  return {
    async read(): Promise<{ value: T; stale: boolean } | null> {
      const at = now();
      if (entry && at - entry.loadedAt < options.freshMs) {
        return { value: entry.value, stale: false };
      }
      if (lastFailure && at - lastFailure.at < options.retryAfterFailureMs) {
        return lastValid();
      }

      const pending = refresh();
      try {
        if (!entry) return { value: await pending, stale: false };
        const previous = entry;
        await settlesWithin(pending, options.waitMs);
        const current = entry as { value: T; loadedAt: number };
        return { value: current.value, stale: current === previous };
      } catch {
        return lastValid();
      }
    },

    /** True when a page rendered at or after `at` had no valid data to show. */
    degradedSince(at: number): boolean {
      return lastDegradedAt !== null && lastDegradedAt >= at;
    },

    status(): ShellCacheStatus {
      const iso = (value: number | null | undefined) =>
        value === null || value === undefined
          ? null
          : new Date(value).toISOString();
      return {
        hasData: entry !== null,
        revision: entry ? options.revisionOf(entry.value) : null,
        ageMs: ageOf(now()),
        refreshing: inFlight !== null,
        lastSuccessAt: iso(entry?.loadedAt),
        lastFailureAt: iso(lastFailure?.at),
        lastError: lastFailure?.errorType ?? null,
        lastDegradedAt: iso(lastDegradedAt),
      };
    },
  };
}
