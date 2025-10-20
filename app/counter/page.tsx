"use client";

import { useState, useEffect } from "react";
import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import type { AppRouter } from "@/server/routers/_app";
import Link from "next/link";

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
 * Counter page that demonstrates streaming with tRPC
 */
export default function Counter() {
  const [streamingCount, setStreamingCount] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

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
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-4xl font-bold">Infinite Counter Stream</h1>

        <div className="flex flex-col gap-4 w-full max-w-md">
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
