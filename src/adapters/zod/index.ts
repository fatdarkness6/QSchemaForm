import * as z from "zod/v4/core";
import type { FieldDefinition, SchemaAdapter } from "../../types/index.js";
import { getPath } from "../../utils/paths.js";

/** Zod 4 validation with conservative input-side inference. Supply fields for unions/custom types. */
export function zodAdapter<S extends z.$ZodType>(
  schema: S,
): SchemaAdapter<z.input<S>, z.output<S>> {
  return {
    async validate(values) {
      const result = await z.safeParseAsync(schema, values);
      return result.success
        ? { valid: true, value: result.data }
        : {
            valid: false,
            issues: result.error.issues.map((issue) => ({
              message: issue.message,
              path: issue.path.map((key) => {
                if (typeof key === "symbol")
                  throw new Error("Symbol field paths are not supported");
                return key;
              }),
            })),
          };
    },
    describe(values) {
      const fields: FieldDefinition<z.input<S>>[] = [];
      const visit = (node: z.$ZodType, path: string, depth = 0) => {
        if (depth > 32) return;
        const def = (node as z.$ZodTypes)._zod.def;
        if ("innerType" in def) {
          visit(def.innerType, path, depth + 1);
          return;
        }
        if (def.type === "pipe") {
          visit(def.in, path, depth + 1);
          return;
        }
        if (def.type === "object") {
          for (const [key, child] of Object.entries(def.shape))
            visit(child, path ? `${path}.${key}` : key, depth + 1);
          return;
        }
        if (def.type === "array") {
          const rows = getPath(values, path);
          if (Array.isArray(rows))
            rows.forEach((_row, index) =>
              visit(def.element, `${path}.${index}`, depth + 1),
            );
          return;
        }
        if (!path) return;
        const common = { path, label: path.split(".").at(-1) };
        if (def.type === "string") fields.push({ ...common, type: "input" });
        else if (def.type === "number")
          fields.push({ ...common, type: "number" });
        else if (def.type === "boolean")
          fields.push({ ...common, type: "checkbox" });
        else if (def.type === "enum")
          fields.push({
            ...common,
            type: "select",
            options: z.util.getEnumValues(def.entries),
          });
        // Other types are intentionally left to explicit UI configuration.
      };
      visit(schema, "");
      return fields;
    },
  };
}
