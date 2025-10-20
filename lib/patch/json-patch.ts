import { applyPatch, compare, Operation } from "fast-json-patch";
import { z, ZodSchema } from "zod";

/**
 * Schema for validating a JSON Patch Operation according to RFC 6902.
 * Each operation must have an "op" field and a "path" field.
 * Depending on the operation type, additional fields may be required.
 */
const OperationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add"),
    path: z.string(),
    value: z.unknown(),
  }),
  z.object({
    op: z.literal("remove"),
    path: z.string(),
  }),
  z.object({
    op: z.literal("replace"),
    path: z.string(),
    value: z.unknown(),
  }),
  z.object({
    op: z.literal("move"),
    path: z.string(),
    from: z.string(),
  }),
  z.object({
    op: z.literal("copy"),
    path: z.string(),
    from: z.string(),
  }),
  z.object({
    op: z.literal("test"),
    path: z.string(),
    value: z.unknown(),
  }),
]);

/**
 * Schema for validating an array of JSON Patch operations.
 */
const ZOperation = z.array(OperationSchema);
type ZOperation = z.infer<typeof ZOperation>;

/**
 * Parameters for constructing a JsonPatch instance.
 */
interface JsonPatchParam<T> {
  schema: ZodSchema<T>;
}

/**
 * Parameters for the diff method.
 */
interface DiffParam<T> {
  original: T;
  updated: T;
}

/**
 * Parameters for the apply method.
 */
interface ApplyParam<T> {
  original: T;
  patch: Operation[];
}

/**
 * A class for working with JSON Patch operations (RFC 6902) with Zod schema validation.
 * This class provides methods to diff objects, apply patches, and validate patch operations.
 *
 * @template T - The type of objects this patch handler works with.
 */
export class JsonPatch<T> {
  private readonly schema: ZodSchema<T>;

  /**
   * Creates a new JsonPatch instance.
   *
   * @param param - Configuration object containing the Zod schema for validation.
   */
  constructor({ schema }: JsonPatchParam<T>) {
    this.schema = schema;
  }

  /**
   * Generates a JSON Patch (RFC 6902) representing the differences between two objects.
   * Both objects are validated against the schema before generating the patch.
   *
   * @param param - Object containing the original and updated objects to compare.
   * @returns An array of JSON Patch operations describing the differences.
   * @throws {z.ZodError} If either object fails schema validation.
   */
  diff({ original, updated }: DiffParam<T>): Operation[] {
    // Validate both objects against the schema
    this.schema.parse(original);
    this.schema.parse(updated);

    // Generate and return the patch
    return compare(original as object, updated as object);
  }

  /**
   * Applies a JSON Patch to an object and returns the result.
   * Validates the original object before applying the patch and the result after applying it.
   * This method does not mutate the original object.
   *
   * @param param - Object containing the original object and the patch to apply.
   * @returns A new object with the patch applied.
   * @throws {z.ZodError} If the original or resulting object fails schema validation.
   * @throws {Error} If the patch application fails (e.g., invalid path).
   */
  apply({ original, patch }: ApplyParam<T>): T {
    // Validate the original object against the schema
    this.schema.parse(original);

    // Create a deep copy to avoid mutating the original
    const copy = structuredClone(original);

    // Apply the patch
    // Parameters: document, patch, validateOperation, mutateDocument, banPrototypeModifications
    // mutateDocument=true means we modify the copy in place
    const result = applyPatch(copy as object, patch, true, true, true);

    // Check if there were any errors during patch application
    if (
      result.some((r) => r !== null && typeof r === "object" && "name" in r)
    ) {
      throw new Error(`Patch application failed`);
    }

    // Get the modified document from the result
    const { newDocument } = result;

    // Validate the result against the schema
    const validated = this.schema.parse(newDocument);

    return validated;
  }

  /**
   * Validates that a given value is a valid JSON Patch document according to RFC 6902.
   * This is a static method that doesn't depend on the schema of the JsonPatch instance.
   *
   * @param patch - The value to validate as a JSON Patch document.
   * @returns The validated patch if it's valid.
   * @throws {z.ZodError} If the patch is not valid according to RFC 6902.
   */
  static validatePatch(patch: unknown): Operation[] {
    return ZOperation.parse(patch);
  }
}
