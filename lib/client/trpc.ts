import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import type { AppRouter } from "@/server/routers/_app";

/**
 * Gets the base URL for tRPC requests
 */
function getBaseUrl() {
  if (typeof window !== "undefined") {
    return "";
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * Hook that creates and returns a vanilla tRPC client for streaming
 */
export function useTrpc() {
  const client = useMemo(
    () =>
      createTRPCClient<AppRouter>({
        links: [
          httpBatchStreamLink({
            url: `${getBaseUrl()}/api/trpc`,
          }),
        ],
      }),
    []
  );

  return client;
}

/**
 * Parameters for the useSyncStateStream hook
 */
interface UseSyncStateStreamParam<T> {
  queryFn: (client: ReturnType<typeof useTrpc>) => Promise<AsyncIterable<T>>;
}

/**
 * Return type for the useSyncStateStream hook
 */
interface UseSyncStateStreamReturn<T> {
  state: T | null;
  isStreaming: boolean;
  error: string | null;
}

/**
 * Generic hook for streaming data
 * Handles the boilerplate of managing state, errors, and consuming async iterables
 * The queryFn is responsible for any data transformation (e.g., applying SyncState operations)
 */
export function useSyncStateStream<T>({
  queryFn,
}: UseSyncStateStreamParam<T>): UseSyncStateStreamReturn<T> {
  const [state, setState] = useState<T | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trpcClient = useTrpc();
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced state update to prevent excessive re-renders
  const debouncedSetState = useCallback((value: T) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      setState(value);
    }, 16); // ~60fps
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    setIsStreaming(true);
    setError(null);

    const startStreaming = async () => {
      try {
        const iterable = await queryFn(trpcClient);
        for await (const value of iterable) {
          if (abortController.signal.aborted) break;
          debouncedSetState(value);
        }
      } catch (err) {
        if (abortController.signal.aborted) {
          // Ignore errors from aborted requests
          return;
        }
        console.error("Streaming error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!abortController.signal.aborted) {
          setIsStreaming(false);
        }
      }
    };

    startStreaming();

    return () => {
      abortController.abort();
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [trpcClient, queryFn, debouncedSetState]);

  return { state, isStreaming, error };
}
