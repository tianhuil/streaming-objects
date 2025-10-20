import { describe, expect, test } from "bun:test";
import { z, ZodSchema } from "zod";
import { Operation } from "fast-json-patch";
import { JsonPatch } from "./json-patch";

interface TestDiffParam<T> {
  schema: ZodSchema<T>;
  original: T;
  updated: T;
}

/**
 * Helper function to generate a diff between two objects.
 * Returns the patch that can be asserted against.
 */
function testDiff<T>({
  schema,
  original,
  updated,
}: TestDiffParam<T>): Operation[] {
  const patcher = new JsonPatch({ schema });
  return patcher.diff({ original, updated });
}

describe("JsonPatch.diff", () => {
  test("should generate empty patch for identical objects", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const patcher = new JsonPatch({ schema });

    const obj1 = { name: "John", age: 30 };
    const obj2 = { name: "John", age: 30 };

    const patch = patcher.diff({ original: obj1, updated: obj2 });

    expect(patch).toEqual([]);
  });

  test("should generate replace operation for changed primitive value", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const patcher = new JsonPatch({ schema });

    const obj1 = { name: "John", age: 30 };
    const obj2 = { name: "John", age: 31 };

    const patch = patcher.diff({ original: obj1, updated: obj2 });

    expect(patch).toEqual([{ op: "replace", path: "/age", value: 31 }]);
  });

  test("should generate add operation for new property", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
    });
    const patcher = new JsonPatch({ schema });

    const obj1 = { name: "John" };
    const obj2 = { name: "John", age: 30 };

    const patch = patcher.diff({ original: obj1, updated: obj2 });

    expect(patch).toEqual([{ op: "add", path: "/age", value: 30 }]);
  });

  test("should generate remove operation for deleted property", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
    });
    const patcher = new JsonPatch({ schema });

    const obj1 = { name: "John", age: 30 };
    const obj2 = { name: "John" };

    const patch = patcher.diff({ original: obj1, updated: obj2 });

    expect(patch).toEqual([{ op: "remove", path: "/age" }]);
  });

  test("should handle nested object changes", () => {
    const schema = z.object({
      name: z.string(),
      address: z.object({
        street: z.string(),
        city: z.string(),
      }),
    });
    const patcher = new JsonPatch({ schema });

    const obj1 = {
      name: "John",
      address: { street: "123 Main St", city: "NYC" },
    };
    const obj2 = {
      name: "John",
      address: { street: "456 Oak Ave", city: "NYC" },
    };

    const patch = patcher.diff({ original: obj1, updated: obj2 });

    expect(patch).toEqual([
      { op: "replace", path: "/address/street", value: "456 Oak Ave" },
    ]);
  });

  test("should handle array modifications", () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });
    const patcher = new JsonPatch({ schema });

    const obj1 = { tags: ["a", "b", "c"] };
    const obj2 = { tags: ["a", "b", "c", "d"] };

    const patch = patcher.diff({ original: obj1, updated: obj2 });

    expect(patch).toEqual([{ op: "add", path: "/tags/3", value: "d" }]);
  });

  test("should handle array element replacement", () => {
    const schema = z.object({
      numbers: z.array(z.number()),
    });
    const patcher = new JsonPatch({ schema });

    const obj1 = { numbers: [1, 2, 3] };
    const obj2 = { numbers: [1, 5, 3] };

    const patch = patcher.diff({ original: obj1, updated: obj2 });

    expect(patch).toEqual([{ op: "replace", path: "/numbers/1", value: 5 }]);
  });

  test("should handle array element removal", () => {
    const schema = z.object({
      items: z.array(z.string()),
    });
    const patcher = new JsonPatch({ schema });

    const obj1 = { items: ["a", "b", "c"] };
    const obj2 = { items: ["a", "c"] };

    const patch = patcher.diff({ original: obj1, updated: obj2 });

    // fast-json-patch may generate different but equivalent operations
    // The important thing is that applying the patch produces the correct result
    expect(patch.length).toBeGreaterThan(0);
    const result = patcher.apply({ original: obj1, patch });
    expect(result).toEqual(obj2);
  });

  test("should handle multiple changes in single diff", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      email: z.string().optional(),
    });
    const patcher = new JsonPatch({ schema });

    const obj1 = { name: "John", age: 30 };
    const obj2 = { name: "Jane", age: 30, email: "jane@example.com" };

    const patch = patcher.diff({ original: obj1, updated: obj2 });

    expect(patch).toContainEqual({
      op: "replace",
      path: "/name",
      value: "Jane",
    });
    expect(patch).toContainEqual({
      op: "add",
      path: "/email",
      value: "jane@example.com",
    });
  });

  test("should throw error when original object fails validation", () => {
    expect(() =>
      testDiff({
        schema: z.object({ name: z.string(), age: z.number() }),
        original: { name: "John", age: "thirty" } as never,
        updated: { name: "John", age: 30 },
      })
    ).toThrow();
  });

  test("should throw error when updated object fails validation", () => {
    expect(() =>
      testDiff({
        schema: z.object({ name: z.string(), age: z.number() }),
        original: { name: "John", age: 30 },
        updated: { name: "John", age: "thirty" } as never,
      })
    ).toThrow();
  });

  // Additional diff test cases
  const additionalDiffTests: Array<{
    name: string;
    schema: ZodSchema<unknown>;
    original: unknown;
    updated: unknown;
    expected: Operation[];
  }> = [
    {
      name: "should handle complex nested structures",
      schema: z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
            settings: z.object({
              theme: z.string(),
            }),
          }),
        }),
      }),
      original: {
        user: {
          profile: {
            name: "John",
            settings: { theme: "dark" },
          },
        },
      },
      updated: {
        user: {
          profile: {
            name: "John",
            settings: { theme: "light" },
          },
        },
      },
      expected: [
        { op: "replace", path: "/user/profile/settings/theme", value: "light" },
      ],
    },
    {
      name: "should handle boolean values",
      schema: z.object({
        active: z.boolean(),
      }),
      original: { active: true },
      updated: { active: false },
      expected: [{ op: "replace", path: "/active", value: false }],
    },
    {
      name: "should handle null values",
      schema: z.object({
        data: z.string().nullable(),
      }),
      original: { data: "value" },
      updated: { data: null },
      expected: [{ op: "replace", path: "/data", value: null }],
    },
    {
      name: "should handle date strings",
      schema: z.object({
        createdAt: z.string(),
      }),
      original: { createdAt: "2023-01-01" },
      updated: { createdAt: "2023-01-02" },
      expected: [{ op: "replace", path: "/createdAt", value: "2023-01-02" }],
    },
  ];

  additionalDiffTests.forEach(
    ({ name, schema, original, updated, expected }) => {
      test(name, () => {
        const patch = testDiff({ schema, original, updated });
        expect(patch).toEqual(expected);
      });
    }
  );

  test("should handle empty arrays", () => {
    const schema = z.object({
      items: z.array(z.string()),
    });
    const patcher = new JsonPatch({ schema });

    const obj1 = { items: ["a", "b"] };
    const obj2 = { items: [] };

    const patch = patcher.diff({ original: obj1, updated: obj2 });

    expect(patch.length).toBeGreaterThan(0);
  });
});
