import { Operation } from "fast-json-patch";
import { ZodType } from "zod";
import { JsonPatch } from "./json-patch";

/**
 * Parameters for constructing a SyncState instance.
 */
interface SyncStateParam<T extends object | object[]> {
  schema: ZodType<T>;
  initialState: T;
}

/**
 * A stateful wrapper around JsonPatch that manages an internal state object.
 * Provides methods to mutate state with automatic diff generation and to apply patches.
 *
 * @template T - The type of the state object. Must be an object or array of objects.
 */
export class SyncState<T extends object | object[]> {
  private readonly jsonPatch: JsonPatch<T>;
  private _state: T;

  /**
   * Creates a new SyncState instance.
   *
   * @param param - Configuration object containing the Zod schema and initial state.
   * @throws {z.ZodError} If the initial state fails schema validation.
   */
  constructor({ schema, initialState }: SyncStateParam<T>) {
    this.jsonPatch = new JsonPatch({ schema });
    // Validate and store initial state
    this._state = schema.parse(initialState);
  }

  /**
   * Applies a mutation function to the state and returns the JSON Patch operations
   * that represent the changes. The internal state is updated to the new state.
   *
   * @param mutator - A function that receives a copy of the current state and returns the new state.
   * @returns An array of JSON Patch operations describing the changes.
   * @throws {z.ZodError} If the new state fails schema validation.
   */
  mutateAndDiff(mutator: (state: T) => T): Operation[] {
    const original = this._state;
    const updated = mutator(structuredClone(this._state));
    const operations = this.jsonPatch.diff({ original, updated });
    this._state = updated;
    return operations;
  }

  /**
   * Applies JSON Patch operations to the current state.
   *
   * @param operations - An array of JSON Patch operations to apply.
   * @throws {z.ZodError} If the resulting state fails schema validation.
   * @throws {PatchError} If the patch application fails.
   */
  apply(operations: Operation[]): void {
    this._state = this.jsonPatch.apply({
      original: this._state,
      patch: operations,
    });
  }

  /**
   * Returns a deep copy of the current state.
   */
  get state(): T {
    return structuredClone(this._state);
  }
}
