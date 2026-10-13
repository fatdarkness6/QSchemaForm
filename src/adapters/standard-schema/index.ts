import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { SchemaAdapter, SchemaSource } from "../../types/index.js";

/** Adapts compatible validators without importing their implementation. */
export function standardSchemaAdapter<I, O>(
  schema: StandardSchemaV1<I, O>,
): SchemaAdapter<I, O> {
  return {
    async validate(values) {
      const result = await schema["~standard"].validate(values);
      if (!result.issues) return { valid: true, value: result.value };
      return {
        valid: false,
        issues: result.issues.map((issue) => ({
          message: issue.message,
          path: (issue.path ?? []).map((segment) => {
            const key = typeof segment === "object" ? segment.key : segment;
            if (typeof key === "symbol")
              throw new Error("Symbol field paths are not supported");
            return key;
          }),
        })),
      };
    },
  };
}

export function resolveSchema<I, O>(
  schema: SchemaSource<I, O>,
): SchemaAdapter<I, O> {
  return "~standard" in schema ? standardSchemaAdapter(schema) : schema;
}
