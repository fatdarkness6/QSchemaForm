import type { ErrorMap, FormValues } from '../types/index.js'
import { pathSegments } from '../utils/paths.js'
import { cloneValue, equalValues } from '../utils/values.js'

function plain(value: unknown): value is FormValues {
  return Boolean(value && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null))
}

/** Reject unsafe keys before changing any form state, including keys in array items. */
export function assertValuePatch(value: unknown, path = ''): asserts value is FormValues {
  if (!path && !plain(value)) throw new Error('Form values must be a plain object')
  if (Array.isArray(value)) { value.forEach((item, index) => assertValuePatch(item, `${path}.${index}`)); return }
  if (!plain(value)) return
  for (const [key, child] of Object.entries(value)) {
    if (!key || /[.[\]]/.test(key)) throw new Error(`Invalid value key "${key}"; pass nested objects instead of field paths`)
    const next = path ? `${path}.${key}` : key
    pathSegments(next)
    assertValuePatch(child, next)
  }
}

export function normalizeServerErrors(errors: unknown): ErrorMap {
  if (!plain(errors)) throw new Error('Server errors must be a plain object of messages')
  const normalized: ErrorMap = {}
  for (const [path, messages] of Object.entries(errors)) {
    const key = pathSegments(path).join('.')
    if (typeof messages !== 'string' && !(Array.isArray(messages) && messages.every((message) => typeof message === 'string'))) throw new Error(`Invalid server error messages for "${path}"`)
    normalized[key] = typeof messages === 'string' ? [messages] : [...messages]
  }
  return normalized
}

/** Deep merge object patches; selections, arrays, Date and File instances are atomic. */
export function mergeValuePatch<T>(current: T, patch: unknown, baseline?: T, keepDirty = false): T {
  if (plain(current) && plain(patch)) {
    const next: FormValues = { ...current }
    for (const [key, value] of Object.entries(patch)) {
      next[key] = mergeValuePatch(current[key], value, plain(baseline) ? baseline[key] : undefined, keepDirty)
    }
    return next as T
  }
  return cloneValue(keepDirty && !equalValues(current, baseline) ? current : patch) as T
}

/** Arrays are atomic: without item identifiers, merging by index would mix records. */
export function dirtyValuePaths(current: unknown, baseline: unknown, path = ''): string[] {
  if (equalValues(current, baseline)) return []
  if (plain(current) && plain(baseline)) return [...new Set([...Object.keys(current), ...Object.keys(baseline)])].flatMap((key) => dirtyValuePaths(current[key], baseline[key], path ? `${path}.${key}` : key))
  return [path]
}
