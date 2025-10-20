import { z } from "zod";
import { publicProcedure, router } from "../trpc";

/**
 * Main application router that combines all sub-routers
 */
export const appRouter = router({
  /**
   * Simple hello endpoint that returns a greeting message
   */
  hello: publicProcedure.query(() => {
    return {
      greeting: "Hello from tRPC!",
    };
  }),

  /**
   * Add endpoint that takes two numbers and returns their sum
   * Uses Zod validation to ensure inputs are valid numbers
   */
  add: publicProcedure
    .input(
      z.object({
        a: z.number(),
        b: z.number(),
      })
    )
    .query(({ input }) => {
      return {
        result: input.a + input.b,
      };
    }),
});

export type AppRouter = typeof appRouter;
