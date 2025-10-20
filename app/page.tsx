"use client";

import { trpc } from "@/lib/trpc";
import { useState } from "react";

/**
 * Home page that demonstrates tRPC endpoints
 */
export default function Home() {
  const [a, setA] = useState(5);
  const [b, setB] = useState(10);

  const helloQuery = trpc.hello.useQuery();
  const addQuery = trpc.add.useQuery({ a, b });

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
        </div>
      </main>
    </div>
  );
}
