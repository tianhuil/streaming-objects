# Streaming Objects

![CI](https://github.com/tianhuil/streaming-objects/actions/workflows/ci.yaml/badge.svg)

A demonstration of **real-time state synchronization** using tRPC streaming
diffs using the [JSON Patch protocol](https://jsonpatch.com/). This project
showcases an efficient pattern for streaming complex state changes from server
to client by transmitting only the deltas rather than the full state. See the
[live demo](https://streaming-objects.vercel.app/).

## Motivation

AI Chat applications need to stream many objects from the server and be able to

- 🎨 **Handle diverse object types** (e.g. messages, thinking, generated images,
  code artifacts)
- 🔄 **Mutate individual objects during a session** (e.g. moving from loading,
  completed, error state).
- 📡 **Stream updates efficiently** in a band-width constrained environment

We leverage [fast-json-patch](https://www.npmjs.com/package/fast-json-patch) to
efficiently send diffs to mirror CRUD operations between server and client while
leveraging [zod](https://zod.dev/) and [trpc](https://trpc.io/) to provide both
compile-time and run-time type-safety.

## Overview

This project demonstrates a powerful pattern for realtime state synchronization
that is

- ⚡ **bandwidth-efficient** (only deltas are transmitted)
- 🛡️ **type-safe** (end-to-end TypeScript), and
- 📈 **scalable** (streaming reduces memory overhead compared to buffering full
  responses).

This architecture is as follows:

1. **Server-side state management**: The server maintains authoritative state
   using `SyncState`, a stateful wrapper that generates diff operations when the
   state mutates.

2. **Streaming with tRPC**: Using tRPC's async generator support and
   `httpBatchStreamLink`, the server streams JSON Patch operations to the client
   in real-time.

3. **Client-side state application**: The client maintains its own `SyncState`
   instance and applies incoming JSON Patch operations, keeping its local state
   in sync with the server.

## Key Components

### SyncState (`lib/sync-state/`)

A stateful JSON Patch manager that:

- Wraps an internal state object validated with Zod schemas
- Generates JSON Patch operations when state mutates via `mutateAndDiff()`
- Applies JSON Patch operations to update state via `apply()`
- Provides type-safe access to the current state

```typescript
const syncState = new SyncState({
  schema: z.array(z.object({ count: z.number() })),
  initialState: [],
});

// Generate operations from a mutation
const operations = syncState.mutateAndDiff((state) => {
  return [...state, { count: 1 }];
});

// Apply operations received from elsewhere
syncState.apply(operations);
```

### tRPC Streaming

The project uses tRPC's async generator support for streaming:

**Server** (`server/routers/_app.ts`):

```typescript
streamingObjects: publicProcedure.query(async function* () {
  const syncState = new SyncState({ schema, initialState: [] });

  while (true) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const operations = syncState.mutateAndDiff((state) => {
      // Mutate state logic
      return newState;
    });
    yield operations; // Stream JSON Patch operations
  }
}),
```

**Client** (`lib/client/trpc.ts`):

- Uses `httpBatchStreamLink` to enable streaming support
- Provides `useSyncStateStream` hook for consuming async iterables in React
- Manages connection lifecycle, error handling, and cleanup

### Example: Streaming Objects

The `/objects` page demonstrates the full pattern:

- Server randomly increments object counts or adds new objects every second
- Each mutation generates JSON Patch operations
- Operations stream to the client via tRPC
- Client applies operations to its local `SyncState`
- UI reactively updates to show the synchronized state

## Getting Started

Install dependencies:

```bash
bun install
```

Run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) and navigate to the
examples:

- `/counter` - Simple streaming counter
- `/objects` - Complex state synchronization with JSON Patch
