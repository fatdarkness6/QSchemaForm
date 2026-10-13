import { ValidationError } from "yup";
import type { AnyObjectSchema, InferType, SchemaFieldDescription } from "yup";
import type {
  FieldDefinition,
  FieldConfig,
  FormValues,
  SchemaAdapter,
} from "../../types/index.js";
import { getPath, pathSegments } from "../../utils/paths.js";

/** Reads Yup's public description API, resolving conditions against current values. */
export function describeYup(
  schema: AnyObjectSchema,
  values: FormValues,
): FieldDefinition[] {
  const result: FieldDefinition[] = [];
  const visit = (description: SchemaFieldDescription, path: string) => {
    if (!("meta" in description)) return;
    if ("fields" in description) {
      for (const [key, child] of Object.entries(description.fields))
        visit(child, path ? `${path}.${key}` : key);
      return;
    }
    if ("innerType" in description && description.innerType) {
      const rows = getPath(values, path);
      const inner = description.innerType;
      if (Array.isArray(rows) && !Array.isArray(inner))
        rows.forEach((_row, index) => visit(inner, `${path}.${index}`));
      return;
    }
    if (!path || description.type === "lazy") return;
    const meta: Record<string, unknown> = description.meta ?? {};
    const htmlType =
      typeof meta.type === "string" &&
      ["text", "email", "password", "tel", "url", "search"].includes(meta.type)
        ? meta.type
        : undefined;
    const type =
      htmlType || meta.type === "singleInput"
        ? "input"
        : (meta.type ??
          (description.type === "boolean"
            ? "checkbox"
            : description.type === "number"
              ? "number"
              : "input"));
    const props =
      typeof meta.props === "object" && meta.props ? meta.props : {};
    // Metadata is an intentional extension boundary; runtime registry lookup checks the type.
    result.push({
      ...meta,
      type,
      label: description.label ?? path.split(".").at(-1),
      ...("default" in description
        ? { defaultValue: description.default }
        : {}),
      props: { ...props, ...(htmlType ? { type: htmlType } : {}) },
      path,
    } as FieldDefinition);
  };
  visit(schema.describe({ value: values }), "");
  return result;
}

/** Yup validation, transforms, defaults, async tests and metadata-based field inference. */
export function yupAdapter<S extends AnyObjectSchema>(
  schema: S,
): SchemaAdapter<InferType<S>, InferType<S>> {
  return {
    describe: (values) =>
      describeYup(schema, values) as (FieldConfig<InferType<S>> & {
        path: string;
      })[],
    async validate(values) {
      try {
        return {
          valid: true,
          value: (await schema.validate(values, {
            abortEarly: false,
          })) as InferType<S>,
        };
      } catch (error) {
        if (!ValidationError.isError(error)) throw error;
        return {
          valid: false,
          issues: (error.inner.length ? error.inner : [error]).map((issue) => {
            const raw: unknown = issue.message;
            const localized =
              raw && typeof raw === "object"
                ? (raw as { key?: unknown; values?: unknown })
                : undefined;
            return {
              path: pathSegments(issue.path ?? ""),
              message:
                typeof raw === "string"
                  ? raw
                  : typeof localized?.key === "string"
                    ? localized.key
                    : "Invalid value",
              ...(typeof localized?.key === "string"
                ? { messageKey: localized.key }
                : {}),
              ...(localized?.values && typeof localized.values === "object"
                ? { params: localized.values as Record<string, unknown> }
                : {}),
            };
          }),
        };
      }
    },
  };
}
