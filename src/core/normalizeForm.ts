import type {
  FieldConfig,
  FieldDefinition,
  FieldMap,
  FormValues,
  SchemaSource,
} from "../types/index.js";
import { resolveSchema } from "../adapters/standard-schema/index.js";
import { pathSegments, getPath, setPath } from "../utils/paths.js";
import { cloneValue } from "../utils/values.js";

export function normalizeForm<I extends FormValues, O>(
  schema: SchemaSource<I, O> | undefined,
  fields: FieldMap<I> | undefined,
  values: I,
): FieldDefinition<I>[] {
  const inferred = schema
    ? (resolveSchema(schema).describe?.(values) ?? [])
    : [];
  if (!fields && !inferred.length)
    throw new Error(
      "Provide fields, or a schema adapter that can describe fields.",
    );
  const definitions = new Map(inferred.map((field) => [field.path, field]));
  for (const [path, config] of Object.entries(fields ?? {}) as [
    string,
    FieldConfig<I> | undefined,
  ][]) {
    if (!config) continue;
    const previous = definitions.get(path);
    definitions.set(path, {
      ...previous,
      ...config,
      props: { ...previous?.props, ...config.props },
      path,
    } as FieldDefinition<I>);
  }
  return [...definitions.values()].map((field) => {
    if (!field.path) throw new Error("A field path must not be empty");
    pathSegments(field.path);
    return {
      ...field,
      type: field.type ?? "input",
      label: field.label ?? field.path,
    } as FieldDefinition<I>;
  });
}

export function applyDefaults<I extends FormValues>(
  values: I,
  fields: readonly FieldDefinition<I>[],
): I {
  return fields.reduce(
    (result, field) =>
      getPath(result, field.path) === undefined &&
      field.defaultValue !== undefined
        ? setPath(result, field.path, cloneValue(field.defaultValue))
        : result,
    cloneValue(values),
  );
}
