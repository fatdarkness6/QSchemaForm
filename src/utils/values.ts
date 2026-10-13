/** Clone plain form data, retaining Date instances and immutable non-plain values. */
export function cloneValue<T>(value: T): T {
  if (value instanceof Date) return new Date(value.getTime()) as T
  if (Array.isArray(value)) return value.map(cloneValue) as T
  if (value && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneValue(child)])) as T
  }
  return value
}

export function equalValues(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime()
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false
  if (Array.isArray(left) !== Array.isArray(right)) return false
  if (Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)) return false
  if (!Array.isArray(left) && Object.getPrototypeOf(left) !== Object.prototype && Object.getPrototypeOf(left) !== null) return false
  const keys = Object.keys(left)
  return keys.length === Object.keys(right).length && keys.every((key) =>
    Object.hasOwn(right, key) && equalValues(Reflect.get(left, key), Reflect.get(right, key)))
}
