import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { SyncState } from "@/lib/sync-state";

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

  /**
   * Infinite counter generator that yields a number every second
   * This demonstrates async generator streaming with tRPC
   */
  infiniteCounter: publicProcedure.query(async function* () {
    let count = 0;
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      yield count++;
    }
  }),

  /**
   * Streaming objects endpoint that yields JSON Patch operations
   * State is an array of objects with count properties
   * Each iteration either increments an existing object or adds a new one
   */
  streamingObjects: publicProcedure.query(async function* () {
    const objectSchema = z.object({
      count: z.number(),
    });

    const stateSchema = z.array(objectSchema);

    const syncState = new SyncState({
      schema: stateSchema,
      initialState: [],
    });

    // Yield initial state as first operation
    yield {
      operations: [],
      state: syncState.state,
    };

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const operations = syncState.mutateAndDiff((state) => {
        const n = state.length;
        const totalProbability = n + 1;
        const randomChoice = Math.floor(Math.random() * totalProbability);

        if (randomChoice < n) {
          // Increment one of the existing objects
          const newState = [...state];
          newState[randomChoice] = { count: state[randomChoice].count + 1 };
          return newState;
        } else {
          // Add a new object with count 1
          return [...state, { count: 1 }];
        }
      });

      yield {
        operations,
        state: syncState.state,
      };
    }
  }),
});

export type AppRouter = typeof appRouter;
