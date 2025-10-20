import { useMemo } from "react";
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
