import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { Operation } from "fast-json-patch";
import { JsonPatch } from "./json-patch";

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
  // A.1. Adding an Object Member
  test("RFC 6902 A.1: Adding an Object Member", () => {
    const schema = z.object({
      foo: z.string().optional(),
      baz: z.string().optional(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { foo: "bar" };
    const patch: Operation[] = [{ op: "add", path: "/baz", value: "qux" }];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ foo: "bar", baz: "qux" });
  });

  // A.2. Adding an Array Element
  test("RFC 6902 A.2: Adding an Array Element", () => {
    const schema = z.object({
      foo: z.array(z.string()),
    });
    const patcher = new JsonPatch({ schema });

    const original = { foo: ["bar", "baz"] };
    const patch: Operation[] = [{ op: "add", path: "/foo/1", value: "qux" }];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ foo: ["bar", "qux", "baz"] });
  });

  // A.3. Removing an Object Member
  test("RFC 6902 A.3: Removing an Object Member", () => {
    const schema = z.object({
      baz: z.string().optional(),
      foo: z.string().optional(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { baz: "qux", foo: "bar" };
    const patch: Operation[] = [{ op: "remove", path: "/baz" }];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ foo: "bar" });
  });

  // A.4. Removing an Array Element
  test("RFC 6902 A.4: Removing an Array Element", () => {
    const schema = z.object({
      foo: z.array(z.string()),
    });
    const patcher = new JsonPatch({ schema });

    const original = { foo: ["bar", "qux", "baz"] };
    const patch: Operation[] = [{ op: "remove", path: "/foo/1" }];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ foo: ["bar", "baz"] });
  });

  // A.5. Replacing a Value
  test("RFC 6902 A.5: Replacing a Value", () => {
    const schema = z.object({
      baz: z.string(),
      foo: z.string(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { baz: "qux", foo: "bar" };
    const patch: Operation[] = [{ op: "replace", path: "/baz", value: "boo" }];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ baz: "boo", foo: "bar" });
  });

  // A.6. Moving a Value
  test("RFC 6902 A.6: Moving a Value", () => {
    const schema = z.object({
      foo: z
        .object({
          bar: z.string(),
          waldo: z.string().optional(),
          qux: z.string().optional(),
        })
        .passthrough(),
    });
    const patcher = new JsonPatch({ schema });

    const original = {
      foo: {
        bar: "baz",
        waldo: "fred",
      },
    };
    const patch: Operation[] = [
      { op: "move", from: "/foo/waldo", path: "/foo/qux" },
    ];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({
      foo: {
        bar: "baz",
        qux: "fred",
      },
    });
  });

  // A.7. Moving an Array Element
  test("RFC 6902 A.7: Moving an Array Element", () => {
    const schema = z.object({
      foo: z.array(z.string()),
    });
    const patcher = new JsonPatch({ schema });

    const original = { foo: ["all", "grass", "cows", "eat"] };
    const patch: Operation[] = [{ op: "move", from: "/foo/1", path: "/foo/3" }];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ foo: ["all", "cows", "eat", "grass"] });
  });

  // A.8. Testing a Value: Success
  test("RFC 6902 A.8: Testing a Value - Success", () => {
    const schema = z.object({
      baz: z.string(),
      foo: z.array(z.union([z.string(), z.number()])),
    });
    const patcher = new JsonPatch({ schema });

    const original = {
      baz: "qux",
      foo: ["a", 2, "c"],
    };
    const patch: Operation[] = [
      { op: "test", path: "/baz", value: "qux" },
      { op: "test", path: "/foo/1", value: 2 },
    ];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual(original);
  });

  // A.9. Testing a Value: Error
  test("RFC 6902 A.9: Testing a Value - Error", () => {
    const schema = z.object({
      baz: z.string(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { baz: "qux" };
    const patch: Operation[] = [{ op: "test", path: "/baz", value: "bar" }];

    expect(() => {
      patcher.apply({ original, patch });
    }).toThrow();
  });

  // A.10. Adding a Nested Member Object
  test("RFC 6902 A.10: Adding a Nested Member Object", () => {
    const schema = z.object({
      foo: z.string(),
      child: z
        .object({
          grandchild: z.object({}).passthrough(),
        })
        .optional(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { foo: "bar" };
    const patch: Operation[] = [
      { op: "add", path: "/child", value: { grandchild: {} } },
    ];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({
      foo: "bar",
      child: {
        grandchild: {},
      },
    });
  });

  // A.11. Ignoring Unrecognized Elements
  test("RFC 6902 A.11: Ignoring Unrecognized Elements", () => {
    const schema = z.object({
      foo: z.string(),
      baz: z.string().optional(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { foo: "bar" };
    // The patch has an extra "xyz" field which should be ignored
    const patch: Operation[] = [
      { op: "add", path: "/baz", value: "qux", xyz: 123 } as Operation,
    ];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ foo: "bar", baz: "qux" });
  });

  // A.12. Adding to a Nonexistent Target
  test("RFC 6902 A.12: Adding to a Nonexistent Target - Error", () => {
    const schema = z.object({
      foo: z.string(),
      baz: z
        .object({
          bat: z.string(),
        })
        .optional(),
    });
    const patcher = new JsonPatch({ schema });

    const original = { foo: "bar" };
    const patch: Operation[] = [{ op: "add", path: "/baz/bat", value: "qux" }];

    expect(() => {
      patcher.apply({ original, patch });
    }).toThrow();
  });

  // A.14. ~ Escape Ordering
  test("RFC 6902 A.14: ~ Escape Ordering", () => {
    const schema = z.object({}).passthrough();
    const patcher = new JsonPatch({ schema });

    const original = {
      "/": 9,
      "~1": 10,
    };
    const patch: Operation[] = [{ op: "test", path: "/~01", value: 10 }];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({
      "/": 9,
      "~1": 10,
    });
  });

  // A.15. Comparing Strings and Numbers
  test("RFC 6902 A.15: Comparing Strings and Numbers - Error", () => {
    const schema = z.object({}).passthrough();
    const patcher = new JsonPatch({ schema });

    const original = {
      "/": 9,
      "~1": 10,
    };
    const patch: Operation[] = [{ op: "test", path: "/~01", value: "10" }];

    expect(() => {
      patcher.apply({ original, patch });
    }).toThrow();
  });

  // A.16. Adding an Array Value
  test("RFC 6902 A.16: Adding an Array Value", () => {
    const schema = z.object({
      foo: z.array(z.union([z.string(), z.array(z.string())])),
    });
    const patcher = new JsonPatch({ schema });

    const original = { foo: ["bar"] };
    const patch: Operation[] = [
      { op: "add", path: "/foo/-", value: ["abc", "def"] },
    ];

    const result = patcher.apply({ original, patch });

    expect(result).toEqual({ foo: ["bar", ["abc", "def"]] });
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
