import { describe, expect, test } from "bun:test";
import { z, ZodSchema } from "zod";
import { Operation } from "fast-json-patch";
import { JsonPatch } from "./json-patch";

interface TestApplyParam<T> {
  schema: ZodSchema<T>;
  original: T;
  patch: Operation[];
}

/**
 * Helper function to apply a patch to an object.
 * Returns the result that can be asserted against.
 */
function testApply<T>({ schema, original, patch }: TestApplyParam<T>): T {
  const patcher = new JsonPatch({ schema });
  return patcher.apply({ original, patch });
}

describe("JsonPatch.apply", () => {
  // Basic functionality tests
  test("should apply add operation for new property", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { name: "John" };
    const patch: Operation[] = [{ op: "add", path: "/age", value: 30 }];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ name: "John", age: 30 });
  });

  test("should apply remove operation", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { name: "John", age: 30 };
    const patch: Operation[] = [{ op: "remove", path: "/age" }];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ name: "John" });
  });

  test("should apply replace operation", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { name: "John", age: 30 };
    const patch: Operation[] = [{ op: "replace", path: "/age", value: 31 }];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ name: "John", age: 31 });
  });

  test("should not mutate original object", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { name: "John", age: 30 };
    const patch: Operation[] = [{ op: "replace", path: "/age", value: 31 }];

    patcher.apply({ original, patch });

    expect(original).toEqual({ name: "John", age: 30 });
  });

  test("should validate original object before applying patch", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { name: "John", age: "thirty" }; // Invalid
    const patch: Operation[] = [{ op: "replace", path: "/age", value: 31 }];

    expect(() => {
      patcher.apply({ original: original as never, patch });
    }).toThrow();
  });

  test("should validate result object after applying patch", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { name: "John", age: 30 };
    // This patch would make age invalid
    const patch: Operation[] = [
      { op: "replace", path: "/age", value: "thirty" },
    ];

    expect(() => {
      patcher.apply({ original, patch });
    }).toThrow();
  });

  test("should apply multiple operations in sequence", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      email: z.string().optional(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { name: "John", age: 30 };
    const patch: Operation[] = [
      { op: "replace", path: "/name", value: "Jane" },
      { op: "replace", path: "/age", value: 25 },
      { op: "add", path: "/email", value: "jane@example.com" },
    ];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({
      name: "Jane",
      age: 25,
      email: "jane@example.com",
    });
  });

  test("should handle nested object operations", () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        age: z.number(),
      }),
    });
    const patcher = new JsonPatch({ schema });

    const original = { user: { name: "John", age: 30 } };
    const patch: Operation[] = [
      { op: "replace", path: "/user/age", value: 31 },
    ];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ user: { name: "John", age: 31 } });
  });

  test("should handle array element addition", () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });
    const patcher = new JsonPatch({ schema });

    const original = { tags: ["a", "b"] };
    const patch: Operation[] = [{ op: "add", path: "/tags/2", value: "c" }];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ tags: ["a", "b", "c"] });
  });

  test("should handle array element removal", () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });
    const patcher = new JsonPatch({ schema });

    const original = { tags: ["a", "b", "c"] };
    const patch: Operation[] = [{ op: "remove", path: "/tags/1" }];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ tags: ["a", "c"] });
  });

  test("should throw error for invalid path", () => {
    const schema = z.object({
      name: z.string(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { name: "John" };
    const patch: Operation[] = [
      { op: "replace", path: "/nonexistent", value: "value" },
    ];

    expect(() => {
      patcher.apply({ original, patch });
    }).toThrow();
  });

  // RFC 6902 Appendix A Test Cases
  // https://datatracker.ietf.org/doc/html/rfc6902#appendix-A
  const rfcTestCases: Array<{
    name: string;
    schema: ZodSchema<unknown>;
    original: unknown;
    patch: Operation[];
    expected: unknown;
  }> = [
    {
      name: "A.1: Adding an Object Member",
      schema: z.object({
        foo: z.string().optional(),
        baz: z.string().optional(),
      }),
      original: { foo: "bar" },
      patch: [{ op: "add", path: "/baz", value: "qux" }],
      expected: { foo: "bar", baz: "qux" },
    },
    {
      name: "A.2: Adding an Array Element",
      schema: z.object({
        foo: z.array(z.string()),
      }),
      original: { foo: ["bar", "baz"] },
      patch: [{ op: "add", path: "/foo/1", value: "qux" }],
      expected: { foo: ["bar", "qux", "baz"] },
    },
    {
      name: "A.3: Removing an Object Member",
      schema: z.object({
        baz: z.string().optional(),
        foo: z.string().optional(),
      }),
      original: { baz: "qux", foo: "bar" },
      patch: [{ op: "remove", path: "/baz" }],
      expected: { foo: "bar" },
    },
    {
      name: "A.4: Removing an Array Element",
      schema: z.object({
        foo: z.array(z.string()),
      }),
      original: { foo: ["bar", "qux", "baz"] },
      patch: [{ op: "remove", path: "/foo/1" }],
      expected: { foo: ["bar", "baz"] },
    },
    {
      name: "A.5: Replacing a Value",
      schema: z.object({
        baz: z.string(),
        foo: z.string(),
      }),
      original: { baz: "qux", foo: "bar" },
      patch: [{ op: "replace", path: "/baz", value: "boo" }],
      expected: { baz: "boo", foo: "bar" },
    },
    {
      name: "A.6: Moving a Value",
      schema: z.object({
        foo: z
          .object({
            bar: z.string(),
            waldo: z.string().optional(),
            qux: z.string().optional(),
          })
          .passthrough(),
      }),
      original: {
        foo: {
          bar: "baz",
          waldo: "fred",
        },
      },
      patch: [{ op: "move", from: "/foo/waldo", path: "/foo/qux" }],
      expected: {
        foo: {
          bar: "baz",
          qux: "fred",
        },
      },
    },
    {
      name: "A.7: Moving an Array Element",
      schema: z.object({
        foo: z.array(z.string()),
      }),
      original: { foo: ["all", "grass", "cows", "eat"] },
      patch: [{ op: "move", from: "/foo/1", path: "/foo/3" }],
      expected: { foo: ["all", "cows", "eat", "grass"] },
    },
    {
      name: "A.8: Testing a Value - Success",
      schema: z.object({
        baz: z.string(),
        foo: z.array(z.union([z.string(), z.number()])),
      }),
      original: {
        baz: "qux",
        foo: ["a", 2, "c"],
      },
      patch: [
        { op: "test", path: "/baz", value: "qux" },
        { op: "test", path: "/foo/1", value: 2 },
      ],
      expected: {
        baz: "qux",
        foo: ["a", 2, "c"],
      },
    },
    {
      name: "A.10: Adding a Nested Member Object",
      schema: z.object({
        foo: z.string(),
        child: z
          .object({
            grandchild: z.object({}).passthrough(),
          })
          .optional(),
      }),
      original: { foo: "bar" },
      patch: [{ op: "add", path: "/child", value: { grandchild: {} } }],
      expected: {
        foo: "bar",
        child: {
          grandchild: {},
        },
      },
    },
    {
      name: "A.11: Ignoring Unrecognized Elements",
      schema: z.object({
        foo: z.string(),
        baz: z.string().optional(),
      }),
      original: { foo: "bar" },
      patch: [{ op: "add", path: "/baz", value: "qux", xyz: 123 } as Operation],
      expected: { foo: "bar", baz: "qux" },
    },
    {
      name: "A.14: ~ Escape Ordering",
      schema: z.object({}).passthrough(),
      original: {
        "/": 9,
        "~1": 10,
      },
      patch: [{ op: "test", path: "/~01", value: 10 }],
      expected: {
        "/": 9,
        "~1": 10,
      },
    },
    {
      name: "A.16: Adding an Array Value",
      schema: z.object({
        foo: z.array(z.union([z.string(), z.array(z.string())])),
      }),
      original: { foo: ["bar"] },
      patch: [{ op: "add", path: "/foo/-", value: ["abc", "def"] }],
      expected: { foo: ["bar", ["abc", "def"]] },
    },
  ];

  rfcTestCases.forEach(({ name, schema, original, patch, expected }) => {
    test(`RFC 6902 ${name}`, () => {
      const result = testApply({ schema, original, patch });
      expect(result).toEqual(expected);
    });
  });

  // RFC 6902 error cases
  test("RFC 6902 A.9: Testing a Value - Error", () => {
    expect(() =>
      testApply({
        schema: z.object({ baz: z.string() }),
        original: { baz: "qux" },
        patch: [{ op: "test", path: "/baz", value: "bar" }],
      })
    ).toThrow();
  });

  test("RFC 6902 A.12: Adding to a Nonexistent Target - Error", () => {
    expect(() =>
      testApply({
        schema: z.object({
          foo: z.string(),
          baz: z.object({ bat: z.string() }).optional(),
        }),
        original: { foo: "bar" },
        patch: [{ op: "add", path: "/baz/bat", value: "qux" }],
      })
    ).toThrow();
  });

  test("RFC 6902 A.15: Comparing Strings and Numbers - Error", () => {
    expect(() =>
      testApply({
        schema: z.object({}).passthrough(),
        original: { "/": 9, "~1": 10 },
        patch: [{ op: "test", path: "/~01", value: "10" }],
      })
    ).toThrow();
  });

  // Additional edge cases
  test("should handle copy operation", () => {
    const schema = z.object({
      foo: z.string(),
      bar: z.string().optional(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { foo: "value" };
    const patch: Operation[] = [{ op: "copy", from: "/foo", path: "/bar" }];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ foo: "value", bar: "value" });
  });

  test("should handle empty patch array", () => {
    const schema = z.object({
      name: z.string(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { name: "John" };
    const patch: Operation[] = [];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual(original);
  });

  test("should handle null values in patch", () => {
    const schema = z.object({
      value: z.string().nullable(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { value: "something" };
    const patch: Operation[] = [{ op: "replace", path: "/value", value: null }];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ value: null });
  });

  test("should handle boolean values in patch", () => {
    const schema = z.object({
      active: z.boolean(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { active: false };
    const patch: Operation[] = [
      { op: "replace", path: "/active", value: true },
    ];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ active: true });
  });

  test("should handle array append with - notation", () => {
    const schema = z.object({
      items: z.array(z.string()),
    });
    const patcher = new JsonPatch({ schema });

    const original = { items: ["a", "b"] };
    const patch: Operation[] = [{ op: "add", path: "/items/-", value: "c" }];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ items: ["a", "b", "c"] });
  });
});

describe("JsonPatch.apply error handling", () => {
  test("should throw PatchError for invalid path (not brittle name check)", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { name: "John", age: 30 };
    const patch: Operation[] = [
      { op: "replace", path: "/nonexistent", value: "value" },
    ];

    expect(() => {
      patcher.apply({ original, patch });
    }).toThrow(/path that does not exist/);
  });

  test("should handle objects with 'name' property without false positives", () => {
    const schema = z.object({
      name: z.string(),
      description: z.string().optional(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { name: "John" };
    const patch: Operation[] = [
      { op: "add", path: "/description", value: "A person" },
    ];

    // This should succeed, even though object has 'name' property
    const result = patcher.apply({ original, patch });
    expect(result).toEqual({ name: "John", description: "A person" });
  });

  test("should throw PatchError for test operation failure", () => {
    const schema = z.object({
      value: z.number(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { value: 10 };
    const patch: Operation[] = [{ op: "test", path: "/value", value: 20 }];

    expect(() => {
      patcher.apply({ original, patch });
    }).toThrow(/Test operation failed/);
  });

  test("should throw PatchError for invalid array index", () => {
    const schema = z.object({
      items: z.array(z.string()),
    });
    const patcher = new JsonPatch({ schema });

    const original = { items: ["a", "b"] };
    const patch: Operation[] = [
      { op: "replace", path: "/items/10", value: "x" },
    ];

    expect(() => {
      patcher.apply({ original, patch });
    }).toThrow(/path that does not exist/);
  });
});
