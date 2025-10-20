import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/routers/_app";

/**
 * tRPC React client
 */
export const trpc = createTRPCReact<AppRouter>();
