# Streaming Objects

![CI](https://github.com/tianhuil/streaming-objects/actions/workflows/ci.yaml/badge.svg)

A demonstration of **real-time state synchronization** using tRPC streaming
diffs using the [JSON Patch protocol](https://jsonpatch.com/). This project
showcases an efficient pattern for streaming complex state changes from server
to client by transmitting only the deltas rather than the full state. See the
[live demo](https://streaming-objects.vercel.app/).

## Motivation

AI Chat applications need to stream many objects from the server to client with
unique requirements:

- 🎨 **Handle diverse object types** (e.g. messages, thinking, generated images,
  code artifacts)
- 🔄 **Mutate individual objects during a session** (e.g. moving from loading,
  completed, error state)
- 📡 **Stream updates efficiently** in a band-width constrained environment

We leverage [fast-json-patch](https://www.npmjs.com/package/fast-json-patch) to
efficiently send diff changes as CRUD operations between server and client while
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

```typescript
// Create tRPC client with streaming support
const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchStreamLink({
      url: `${getBaseUrl()}/api/trpc`,
    }),
  ],
});

// Consume the stream in a React component
const syncStateRef = useRef(new SyncState({ schema, initialState: [] }));

const queryFn = useCallback(async (client) => {
  async function* stateGenerator() {
    const operationsIterable = await client.streamingObjects.query();
    yield syncStateRef.current.state; // Yield initial state

    for await (const operations of operationsIterable) {
      syncStateRef.current.apply(operations); // Apply JSON Patch
      yield syncStateRef.current.state; // Yield updated state
    }
  }
  return stateGenerator();
}, []);

const { state, isStreaming, error } = useSyncStateStream({ queryFn });
```

The client:

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

### Example: Streaming OpenAI output

⚠️ When streaming text (like an AI model's output), prefer pushing chunks to an
array rather than appending to a string. The Json-Patch standard
([RFC 6902](https://datatracker.ietf.org/doc/html/rfc6902#section-4.1)) does not
allow adding to strings, only replacing them, which cause inefficient diffs to
be generated.

```typescript
const syncState = new SyncState({
  schema: z.object({
    assistantResponse: z.string().array(), // Use an array here, not a string
  }),
  initialState: { assistantResponse: [] as string[] },
});

for await (const chunk of await openai.chat.completions.create({
  stream: true /* ... */,
})) {
  const chunkContent = chunk.choices[0].delta.content;
  const operations = syncState.mutateAndDiff((state) => ({
    // Append chunks as separate strings
    assistantResponse: [...state.assistantResponse, chunkContent],
  }));
  yield operations;
}
```

Diffs when appending to a string:

```jsonl
[[[{"op":"replace","path":"/assistantResponse","value":"I"}]]]
[[[{"op":"replace","path":"/assistantResponse","value":"I am"}]]]
[[[{"op":"replace","path":"/assistantResponse","value":"I am a"}]]]
[[[{"op":"replace","path":"/assistantResponse","value":"I am a help"}]]]
[[[{"op":"replace","path":"/assistantResponse","value":"I am a helpful"}]]]
[[[{"op":"replace","path":"/assistantResponse","value":"I am a helpful as"}]]]
[[[{"op":"replace","path":"/assistantResponse","value":"I am a helpful assist"}]]]
[[[{"op":"replace","path":"/assistantResponse","value":"I am a helpful assistant"}]]]
```

Diffs when pushing to an array:

```jsonl
[[[{"op":"add","path":"/assistantResponse/0","value":"I "}]]]
[[[{"op":"add","path":"/assistantResponse/1","value":"am "}]]]
[[[{"op":"add","path":"/assistantResponse/2","value":"a "}]]]
[[[{"op":"add","path":"/assistantResponse/3","value":"help"}]]]
[[[{"op":"add","path":"/assistantResponse/4","value":"ful"}]]]
[[[{"op":"add","path":"/assistantResponse/5","value":" as"}]]]
[[[{"op":"add","path":"/assistantResponse/6","value":"sist"}]]]
[[[{"op":"add","path":"/assistantResponse/7","value":"ant"}]]]
```

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
