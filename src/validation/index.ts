import type { FieldValidator, FormValues, MaybePromise, FieldContext } from '../types/index.js'
import { equalValues } from '../utils/values.js'

export function required<T = FormValues>(message = 'This field is required'): FieldValidator<T> {
  return (value) => value == null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length) ? message : undefined
}

export function matchesField<T = FormValues>(path: string, message = 'Values must match'): FieldValidator<T> {
  return (value, context) => equalValues(value, context.getValue(path)) ? undefined : message
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function isoDate<T = FormValues>(message = 'Enter a valid date (YYYY-MM-DD)'): FieldValidator<T> {
  return (value) => value == null || value === '' || validDate(value) ? undefined : message
}

export function dateAfter<T = FormValues>(path: string, message = 'Date must follow the start date', allowEqual = true): FieldValidator<T> {
  return (value, context) => {
    const other = context.getValue(path)
    if (!validDate(value) || !validDate(other)) return undefined
    return (allowEqual ? value >= other : value > other) ? undefined : message
  }
}

interface FileValue { name: string; size: number; type: string }
function files(value: unknown): readonly FileValue[] | undefined {
  const values = value == null ? [] : Array.isArray(value) ? value : [value]
  return values.every((file) => file && typeof file === 'object' && typeof file.name === 'string' && typeof file.type === 'string' && Number.isFinite(file.size) && file.size >= 0) ? values : undefined
}

export function fileSize<T = FormValues>(maxBytes: number, message = 'File is too large'): FieldValidator<T> {
  if (!Number.isFinite(maxBytes) || maxBytes < 0) throw new Error('maxBytes must be a nonnegative number')
  return (value) => files(value)?.every((file) => file.size <= maxBytes) ? undefined : message
}

export function fileType<T = FormValues>(allowed: readonly string[], message = 'File type is not allowed'): FieldValidator<T> {
  return (value) => files(value)?.every((file) => allowed.some((type) => {
    const pattern = type.toLowerCase()
    return pattern.startsWith('.') ? file.name.toLowerCase().endsWith(pattern)
      : pattern.endsWith('/*') ? file.type.toLowerCase().startsWith(pattern.slice(0, -1)) : file.type.toLowerCase() === pattern
  })) ? undefined : message
}

export function allOf<T = FormValues>(...validators: readonly FieldValidator<T>[]): FieldValidator<T> {
  return async (value, context) => {
    const messages: string[] = []
    for (const validate of validators) {
      if (context.signal?.aborted) return undefined
      const result = await validate(value, context)
      messages.push(...(typeof result === 'string' ? [result] : result ?? []))
    }
    return messages.length ? messages : undefined
  }
}

export function asyncCheck<T = FormValues>(check: (value: unknown, context: FieldContext<T>) => MaybePromise<boolean>, message = 'This value is not available'): FieldValidator<T> {
  return async (value, context) => value == null || value === '' || await check(value, context) ? undefined : message
}
