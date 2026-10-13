import type { FieldArrayDefinition, FieldConfig, FieldDefinition, FormValues } from '../types/index.js'
import { getPath, pathSegments, setPath } from '../utils/paths.js'

export function arrayItems(values: FormValues, path: string): readonly unknown[] {
  const value = getPath(values, path)
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new Error(`Field array "${path}" must contain an array`)
  return value
}

export function initializeArrays<I extends FormValues>(values: I, arrays: readonly FieldArrayDefinition<I>[]): I {
  const seen = new Set<string>()
  return arrays.reduce((result, definition) => {
    const path = pathSegments(definition.path).join('.')
    if (!path || seen.has(path)) throw new Error(`Duplicate or empty array path: ${path}`)
    if (path !== definition.path) throw new Error('Array definitions must use canonical dot paths')
    if ([...seen].some((other) => withinPath(path, other) || withinPath(other, path))) throw new Error('Nested repeatable groups are not supported')
    for (const relative of Object.keys(definition.fields)) if (!relative || !pathSegments(relative).length) throw new Error('Array field paths must not be empty')
    seen.add(path)
    const min = definition.minItems ?? 0
    const max = definition.maxItems ?? Infinity
    if (!Number.isInteger(min) || min < 0 || (max !== Infinity && (!Number.isInteger(max) || max < min))) throw new Error(`Invalid item limits for "${path}"`)
    arrayItems(result, path)
    return getPath(result, path) === undefined ? setPath(result, path, []) : result
  }, values)
}

export function expandArrays<I extends FormValues>(values: I, arrays: readonly FieldArrayDefinition<I>[]): FieldDefinition<I>[] {
  return arrays.flatMap((definition) => arrayItems(values, definition.path).flatMap((_item, index) =>
    (Object.entries(definition.fields) as [string, FieldConfig<I> | undefined][]).flatMap(([relativePath, config]) => config ? [{
      ...config, path: `${definition.path}.${index}.${relativePath}`,
      label: config.label ?? relativePath, section: definition.section, step: definition.step,
      arrayPath: definition.path, arrayIndex: index,
      hidden: (context) => Boolean(typeof definition.hidden === 'function' ? definition.hidden(context) : definition.hidden)
        || Boolean(typeof config.hidden === 'function' ? config.hidden(context) : config.hidden),
    } as FieldDefinition<I>] : [])))
}

export function withinPath(path: string, parent: string): boolean {
  return path === parent || path.startsWith(`${parent}.`)
}

/** Remap indexed errors/touched paths while preserving unrelated form metadata. */
export function remapArrayState<T>(state: Record<string, T>, path: string, mapIndex: (index: number) => number | undefined): Record<string, T> {
  const prefix = pathSegments(path)
  const result: Record<string, T> = {}
  for (const [key, value] of Object.entries(state)) {
    const parts = pathSegments(key)
    if (parts.length <= prefix.length || !prefix.every((part, index) => parts[index] === part) || typeof parts[prefix.length] !== 'number') result[key] = value
    else {
      const next = mapIndex(parts[prefix.length] as number)
      if (next !== undefined) { parts[prefix.length] = next; result[parts.join('.')] = value }
    }
  }
  return result
}
