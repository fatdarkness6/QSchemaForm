import type {
  FieldConfig,
  FieldDefinition,
  FieldMap,
  FormValues,
  SchemaSource,
  FieldArrayDefinition,
} from "../types/index.js";
import { resolveSchema } from "../adapters/standard-schema/index.js";
import { pathSegments, getPath, setPath } from "../utils/paths.js";
import { cloneValue } from "../utils/values.js";
import { expandArrays, withinPath } from './fieldArrays.js';
import { mergeFieldProps } from './fieldProps.js';

export function normalizeForm<I extends FormValues, O>(
  schema: SchemaSource<I, O> | undefined,
  fields: FieldMap<I> | undefined,
  values: I,
  arrays: readonly FieldArrayDefinition<I>[] = [],
): FieldDefinition<I>[] {
  const inferred = schema
    ? (resolveSchema(schema).describe?.(values) ?? [])
    : [];
  if (!fields && !inferred.length && !arrays.length)
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
      props: mergeFieldProps(previous?.props, config.props),
      path,
    } as FieldDefinition<I>);
  }
  for (const field of expandArrays(values, arrays)) {
    const previous = definitions.get(field.path);
    definitions.set(field.path, { ...previous, ...field, props: mergeFieldProps(previous?.props, field.props) } as FieldDefinition<I>);
  }
  for (const [path, field] of definitions) {
    const array = arrays.find((definition) => withinPath(path, definition.path));
    if (!array) continue;
    const index = pathSegments(path)[pathSegments(array.path).length];
    if (typeof index !== 'number') continue;
    definitions.set(path, {
      ...field, arrayPath: array.path, arrayIndex: index, section: array.section, step: array.step,
      hidden: (context) => Boolean(typeof field.hidden === 'function' ? field.hidden(context) : field.hidden)
        || Boolean(typeof array.hidden === 'function' ? array.hidden(context) : array.hidden),
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
