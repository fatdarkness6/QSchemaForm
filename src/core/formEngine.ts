import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { ErrorMap, FieldArrayDefinition, FieldDefinition, FormStateAdapter, FormValues, SchemaSource, SubmitContext, ValidationIssue, ValidationResult } from '../types/index.js'
import { useFormState } from '../composables/useFormState.js'
import { resolveSchema } from '../adapters/standard-schema/index.js'
import { cloneValue, equalValues } from '../utils/values.js'
import { getPath, pathSegments, setPath } from '../utils/paths.js'
import { arrayItems, remapArrayState, withinPath } from './fieldArrays.js'

interface EngineOptions<I extends FormValues, O> {
  initialValues: I
  model: () => I | undefined
  schema: () => SchemaSource<I, O> | undefined
  fields: () => readonly FieldDefinition<I>[]
  arrays?: () => readonly FieldArrayDefinition<I>[]
  stateAdapter?: FormStateAdapter
  message: (issue: ValidationIssue) => string
  update: (values: I, path?: string, value?: unknown) => void
  valid: (values: O, context: SubmitContext) => void
  invalid: (issues: readonly ValidationIssue[]) => void
  reset: (values: I) => void
  submitAction: () => ((values: O, context: SubmitContext) => unknown | Promise<unknown>) | undefined
  disabled: () => boolean
}

export function useFormEngine<I extends FormValues, O>(options: EngineOptions<I, O>) {
  const state = (options.stateAdapter ?? useFormState)(options.initialValues)
  const values = computed(() => state.values.value as I)
  const submitting = ref(false)
  const validating = ref(false)
  let revision = 0
  let validationId = 0
  let disposed = false
  let validationController: AbortController | undefined
  const rowKeys = new Map<string, string[]>()
  let rowId = 0
  const invalidate = () => { revision++; validationId++; validationController?.abort(); validating.value = false }
  onBeforeUnmount(() => { disposed = true; invalidate() })
  watch(options.model, (next) => {
    if (next && !equalValues(next, state.values.value)) { invalidate(); state.replaceValues(next) }
  }, { deep: true, flush: 'sync' })
  watch(options.schema, invalidate, { flush: 'sync' })

  const clearErrors = () => state.setErrors({})
  const setErrors = (errors: Record<string, string | readonly string[]>) => {
    state.setErrors(Object.fromEntries(Object.entries(errors).map(([path, message]) => [pathSegments(path).join('.'), typeof message === 'string' ? [message] : message])))
  }
  const reset = () => {
    invalidate()
    rowKeys.clear()
    state.reset()
    options.update(cloneValue(values.value))
    options.reset(cloneValue(values.value))
  }
  const context: SubmitContext = { reset, setErrors }
  async function runValidation(scope?: { paths: readonly string[]; descendants: boolean }): Promise<ValidationResult<O>> {
    validationController?.abort()
    const controller = new AbortController()
    validationController = controller
    const id = ++validationId
    const atRevision = revision
    validating.value = true
    const snapshot = cloneValue(values.value)
    try {
      const schema = options.schema()
      const result: ValidationResult<O> = schema ? await resolveSchema(schema).validate(snapshot) : { valid: true, value: snapshot as unknown as O }
      const issues: ValidationIssue[] = result.valid ? [] : [...result.issues]
      const includes = (path: string) => !scope || scope.paths.some((parent) => scope.descendants ? withinPath(path, parent) : path === parent)
      const fieldContext = { values: snapshot, getValue: (path: string) => getPath(snapshot, path), signal: controller.signal }
      for (const array of options.arrays?.() ?? []) {
        if (!includes(array.path)) continue
        const count = arrayItems(snapshot, array.path).length
        if (count < (array.minItems ?? 0)) issues.push({ path: pathSegments(array.path), message: `At least ${array.minItems} items are required` })
        if (count > (array.maxItems ?? Infinity)) issues.push({ path: pathSegments(array.path), message: `At most ${array.maxItems} items are allowed` })
      }
      for (const field of options.fields()) {
        if (controller.signal.aborted) return { valid: false, issues: [] }
        if (!includes(field.path)) continue
        const messages = await field.validate?.(getPath(snapshot, field.path), fieldContext)
        for (const message of typeof messages === 'string' ? [messages] : messages ?? []) issues.push({ path: pathSegments(field.path), message })
      }
      const final: ValidationResult<O> = issues.length ? { valid: false, issues } : result
      if (id === validationId && atRevision === revision && !disposed) {
        // Schema validation keeps cross-field context; interaction only updates this field's errors.
        const errors: ErrorMap = scope === undefined ? {} : { ...state.errors.value }
        if (scope) for (const path of Object.keys(errors)) if (includes(path)) delete errors[path]
        for (const issue of issues) {
          const path = pathSegments(issue.path.join('.')).join('.')
          if (!includes(path)) continue
          errors[path] = [...(errors[path] ?? []), options.message(issue)]
        }
        state.setErrors(errors)
      }
      return final
    } catch (error) {
      if (controller.signal.aborted || disposed) return { valid: false, issues: [] }
      throw error
    } finally { if (id === validationId) validating.value = false }
  }
  const validate = () => runValidation()
  const validateField = (path: string) => runValidation({ paths: [pathSegments(path).join('.')], descendants: false })
  const validateFields = async (paths: readonly string[]) => {
    const normalized = paths.map((path) => pathSegments(path).join('.'))
    const atRevision = revision
    const pending = runValidation({ paths: normalized, descendants: true })
    const id = validationId
    const result = await pending
    return id === validationId && atRevision === revision && !disposed && (result.valid || result.issues.every((issue) => !normalized.some((path) => withinPath(issue.path.join('.'), path))))
  }
  const setFieldValue = (path: string, value: unknown) => {
    invalidate()
    state.replaceValues(setPath(values.value, path, value))
    options.update(cloneValue(values.value), path, value)
  }
  const arrayKey = (path: string, index: number) => {
    const length = arrayItems(values.value, path).length
    let keys = rowKeys.get(path)
    if (!keys || keys.length !== length) { keys = Array.from({ length }, () => `row-${++rowId}`); rowKeys.set(path, keys) }
    return keys[index]!
  }
  const appendArrayItem = (path: string, value?: unknown) => {
    const current = arrayItems(values.value, path)
    const definition = options.arrays?.().find((array) => array.path === path)
    if (current.length >= (definition?.maxItems ?? Infinity)) return false
    if (value === undefined && !definition) throw new Error('Configure createItem or provide an item value')
    const keys = current.map((_item, index) => arrayKey(path, index))
    rowKeys.set(path, [...keys, `row-${++rowId}`])
    setFieldValue(path, [...current, cloneValue(value === undefined ? definition!.createItem() : value)])
    return true
  }
  const reorderArray = (path: string, next: readonly unknown[], indices: readonly number[]) => {
    const current = arrayItems(values.value, path)
    const keys = current.map((_item, index) => arrayKey(path, index))
    const errors = remapArrayState(state.errors.value, path, (index) => { const next = indices.indexOf(index); return next < 0 ? undefined : next })
    const touched = remapArrayState(state.touched.value, path, (index) => { const next = indices.indexOf(index); return next < 0 ? undefined : next })
    rowKeys.set(path, indices.map((index) => keys[index]!))
    setFieldValue(path, [...next])
    state.setErrors(errors)
    state.replaceTouched(touched)
    return true
  }
  const removeArrayItem = (path: string, index: number) => {
    const current = arrayItems(values.value, path)
    const min = options.arrays?.().find((array) => array.path === path)?.minItems ?? 0
    if (!Number.isInteger(index) || index < 0 || index >= current.length || current.length <= min) return false
    const indices = current.map((_item, i) => i).filter((i) => i !== index)
    return reorderArray(path, indices.map((i) => current[i]), indices)
  }
  const moveArrayItem = (path: string, from: number, to: number) => {
    const current = arrayItems(values.value, path)
    if (![from, to].every((index) => Number.isInteger(index) && index >= 0 && index < current.length) || from === to) return false
    const indices = current.map((_item, i) => i)
    indices.splice(to, 0, indices.splice(from, 1)[0]!)
    return reorderArray(path, indices.map((i) => current[i]), indices)
  }
  async function submit() {
    if (submitting.value || options.disabled()) return
    submitting.value = true
    const atRevision = revision
    try {
      for (const field of options.fields()) state.setTouched(field.path)
      const pending = validate()
      const id = validationId
      const result = await pending
      if (atRevision !== revision || id !== validationId || disposed) return
      if (result.valid) {
        await options.submitAction()?.(result.value, context)
        if (!disposed) options.valid(result.value, context)
      } else options.invalid(result.issues)
      return result
    } finally { submitting.value = false }
  }
  return { state, values, submitting, validating, setFieldValue, validate, validateField, validateFields, submit, reset, setErrors, clearErrors, arrayKey, appendArrayItem, removeArrayItem, moveArrayItem }
}
