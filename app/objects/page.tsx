"use client";

import { useState, useEffect, useRef } from "react";
import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import type { AppRouter } from "@/server/routers/_app";
import { SyncState } from "@/lib/sync-state";
import { z } from "zod";
import Link from "next/link";
import { Operation } from "fast-json-patch";

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

const objectSchema = z.object({
  count: z.number(),
});

const stateSchema = z.array(objectSchema);

type ObjectState = z.infer<typeof stateSchema>;

/**
 * Objects page that demonstrates streaming SyncState with tRPC
 * Displays an array of objects with counts that update in real-time
 */
export default function Objects() {
  const [state, setState] = useState<ObjectState>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncStateRef = useRef<SyncState<ObjectState>>(
    new SyncState({
      schema: stateSchema,
      initialState: [],
    })
  );

  useEffect(() => {
    let isCancelled = false;
    setIsStreaming(true);

    const vanillaClient = createTRPCClient<AppRouter>({
      links: [
        httpBatchStreamLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
    });

    const startStreaming = async () => {
      try {
        const iterable = await vanillaClient.streamingObjects.query();
        for await (const operations of iterable) {
          if (isCancelled) break;

          // Apply operations to local sync state
          syncStateRef.current.apply(operations as Operation[]);
          setState(syncStateRef.current.state);
        }
      } catch (err) {
        console.error("Streaming error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!isCancelled) {
          setIsStreaming(false);
        }
      }
    };

    startStreaming();

    return () => {
      isCancelled = true;
    };
  }, []);

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

            {isStreaming && state.length === 0 && (
              <p className="text-gray-500">Initializing stream...</p>
            )}

            {error && <p className="text-red-600">Error: {error}</p>}

            {state.length > 0 && (
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
                      className="flex flex-col items-center justify-center p-3 border rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <span className="text-xs text-gray-500 mb-1">
                        #{index}
                      </span>
                      <span className="text-2xl font-bold text-blue-600">
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
