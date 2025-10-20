"use client";

import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
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
 * Home page that demonstrates tRPC endpoints
 */
export default function Home() {
  const [a, setA] = useState(5);
  const [b, setB] = useState(10);
  const [streamingCount, setStreamingCount] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const helloQuery = trpc.hello.useQuery();
  const addQuery = trpc.add.useQuery({ a, b });

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
        const iterable = await vanillaClient.infiniteCounter.query();
        for await (const value of iterable) {
          if (isCancelled) break;
          setStreamingCount(value);
        }
      } catch (error) {
        console.error("Streaming error:", error);
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
        <h1 className="text-4xl font-bold">tRPC Demo</h1>

        <div className="flex flex-col gap-4 w-full max-w-md">
          <div className="p-4 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">Hello Endpoint</h2>
            {helloQuery.isLoading && <p>Loading...</p>}
            {helloQuery.error && <p>Error: {helloQuery.error.message}</p>}
            {helloQuery.data && (
              <p className="text-lg">{helloQuery.data.greeting}</p>
            )}
          </div>

          <div className="p-4 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Add Endpoint</h2>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 items-center">
                <label className="w-12">A:</label>
                <input
                  type="number"
                  value={a}
                  onChange={(e) => setA(Number(e.target.value))}
                  className="border rounded px-3 py-2 flex-1"
                />
              </div>
              <div className="flex gap-4 items-center">
                <label className="w-12">B:</label>
                <input
                  type="number"
                  value={b}
                  onChange={(e) => setB(Number(e.target.value))}
                  className="border rounded px-3 py-2 flex-1"
                />
              </div>
              {addQuery.isLoading && <p>Loading...</p>}
              {addQuery.error && <p>Error: {addQuery.error.message}</p>}
              {addQuery.data && (
                <p className="text-lg font-semibold">
                  Result: {a} + {b} = {addQuery.data.result}
                </p>
              )}
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">
              Infinite Counter Stream
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              This endpoint streams a number every second using an async
              generator
            </p>
            {isStreaming && streamingCount === null && (
              <p>Initializing stream...</p>
            )}
            {streamingCount !== null && (
              <div className="flex items-center gap-4">
                <p className="text-6xl font-bold text-blue-600">
                  {streamingCount}
                </p>
                <span className="text-sm text-gray-500">Streaming...</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
