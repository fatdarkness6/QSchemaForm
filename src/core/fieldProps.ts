import type { FieldContext, FieldDefinition } from '../types/index.js'

type PropsSource<T> = FieldDefinition<T>['props']

/** Resolve every control's props against the current form values. */
export function resolveFieldProps<T>(source: PropsSource<T>, context: FieldContext<T>): Record<string, unknown> {
  return { ...(typeof source === 'function' ? source(context) : source) }
}

/** Keep schema defaults when explicit props are computed at render time. */
export function mergeFieldProps<T>(base: PropsSource<T>, overrides: PropsSource<T>): PropsSource<T> {
  if (!base) return overrides
  if (!overrides) return base
  if (typeof base === 'function' || typeof overrides === 'function') {
    return ((context: FieldContext<T>) => ({ ...resolveFieldProps(base, context), ...resolveFieldProps(overrides, context) })) as PropsSource<T>
  }
  return { ...base, ...overrides } as PropsSource<T>
}
