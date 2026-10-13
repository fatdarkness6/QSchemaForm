const unsafe = new Set(['__proto__', 'prototype', 'constructor'])

/** Accept dotted paths and numeric brackets. Literal dots/brackets in keys are unsupported. */
export function pathSegments(path: string): (string | number)[] {
  if (!path) return []
  const normalized = path.replace(/\[(\d+)\]/g, '.$1')
  const segments = normalized.split('.')
  if (segments.some((key) => !key || unsafe.has(key) || key.includes('[') || key.includes(']'))) {
    throw new Error(`Invalid field path: ${path}`)
  }
  return segments.map((key) => /^\d+$/.test(key) ? Number(key) : key)
}

export function getPath(value: unknown, path: string): unknown {
  return pathSegments(path).reduce<unknown>((current, key) =>
    current && typeof current === 'object' && Object.hasOwn(current, key) ? Reflect.get(current, key) : undefined, value)
}

export function setPath<T extends object>(values: T, path: string, value: unknown): T {
  const parts = pathSegments(path)
  if (!parts.length) throw new Error('A field path must not be empty')
  const copy = (current: unknown, index: number): object => {
    const key = parts[index]!
    const result: Record<string | number, unknown> | unknown[] = Array.isArray(current)
      ? [...current] : current && typeof current === 'object' ? { ...current } : typeof key === 'number' ? [] : {}
    const next = index === parts.length - 1 ? value : copy(current && typeof current === 'object' ? Reflect.get(current, key) : undefined, index + 1)
    Reflect.set(result, key, next)
    return result
  }
  return copy(values, 0) as T
}
