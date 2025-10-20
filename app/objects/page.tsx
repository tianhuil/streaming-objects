"use client";

import { z } from "zod";
import Link from "next/link";
import { useSyncStateStream, useTrpc } from "@/lib/client/trpc";
import { SyncState } from "@/lib/sync-state";
import { Operation } from "fast-json-patch";
import { useCallback, useRef } from "react";

const objectSchema = z.object({
  count: z.number(),
});

const stateSchema = z.array(objectSchema);

type ObjectState = z.infer<typeof stateSchema>;

/**
 * Hook that manages streaming objects with SyncState
 * Connects to the tRPC streamingObjects endpoint and applies JSON Patch operations
 */
function useStreamingObjects() {
  const syncStateRef = useRef<SyncState<ObjectState>>(
    new SyncState({
      schema: stateSchema,
      initialState: [],
    })
  );

  const queryFn = useCallback(async (client: ReturnType<typeof useTrpc>) => {
    // Create an async generator that applies operations and yields states
    async function* stateGenerator() {
      const operationsIterable = await client.streamingObjects.query();
      yield syncStateRef.current.state;
      for await (const operations of operationsIterable) {
        syncStateRef.current.apply(operations as Operation[]);
        yield syncStateRef.current.state;
      }
    }

    return stateGenerator();
  }, []);

  return useSyncStateStream<ObjectState>({
    queryFn,
  });
}

/**
 * Objects page that demonstrates streaming SyncState with tRPC
 * Displays an array of objects with counts that update in real-time
 */
export default function Objects() {
  const { state, isStreaming, error } = useStreamingObjects();

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-4xl font-bold">Streaming Objects</h1>

        <div className="flex flex-col gap-4 w-full max-w-2xl">
          <div className="p-4 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">
              Dynamic Object Array with SyncState
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Each second, either a random object&apos;s count increments or a
              new object is added. The server sends JSON Patch operations that
              are applied to the client&apos;s SyncState.
            </p>

            {isStreaming && !state && (
              <p className="text-gray-500">Initializing stream...</p>
            )}

            {error && <p className="text-red-600">Error: {error}</p>}

            {state && state.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-sm font-semibold text-gray-700">
                    Total objects: {state.length}
                  </span>
                  {isStreaming && (
                    <span className="text-sm text-green-600">● Streaming</span>
                  )}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {state.map((obj, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center justify-center p-3 border border-gray-700 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <span className="text-xs text-gray-400 mb-1">
                        #{index}
                      </span>
                      <span className="text-2xl font-bold text-blue-400">
                        {obj.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
