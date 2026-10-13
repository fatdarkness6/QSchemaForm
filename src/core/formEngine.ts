import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { ErrorMap, FieldDefinition, FormStateAdapter, FormValues, SchemaSource, SubmitContext, ValidationIssue, ValidationResult } from '../types/index.js'
import { useFormState } from '../composables/useFormState.js'
import { resolveSchema } from '../adapters/standard-schema/index.js'
import { cloneValue, equalValues } from '../utils/values.js'
import { getPath, pathSegments, setPath } from '../utils/paths.js'

interface EngineOptions<I extends FormValues, O> {
  initialValues: I
  model: () => I | undefined
  schema: () => SchemaSource<I, O> | undefined
  fields: () => readonly FieldDefinition<I>[]
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
  const invalidate = () => { revision++; validationId++; validating.value = false }
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
    state.reset()
    options.update(cloneValue(values.value))
    options.reset(cloneValue(values.value))
  }
  const context: SubmitContext = { reset, setErrors }
  async function runValidation(fieldPath?: string): Promise<ValidationResult<O>> {
    const id = ++validationId
    const atRevision = revision
    validating.value = true
    const snapshot = cloneValue(values.value)
    try {
      const schema = options.schema()
      const result: ValidationResult<O> = schema ? await resolveSchema(schema).validate(snapshot) : { valid: true, value: snapshot as unknown as O }
      const issues: ValidationIssue[] = result.valid ? [] : [...result.issues]
      const fieldContext = { values: snapshot, getValue: (path: string) => getPath(snapshot, path) }
      for (const field of options.fields()) {
        if (fieldPath !== undefined && field.path !== fieldPath) continue
        const messages = await field.validate?.(getPath(snapshot, field.path), fieldContext)
        for (const message of typeof messages === 'string' ? [messages] : messages ?? []) issues.push({ path: pathSegments(field.path), message })
      }
      const final: ValidationResult<O> = issues.length ? { valid: false, issues } : result
      if (id === validationId && atRevision === revision && !disposed) {
        // Schema validation keeps cross-field context; interaction only updates this field's errors.
        const errors: ErrorMap = fieldPath === undefined ? {} : { ...state.errors.value }
        if (fieldPath !== undefined) delete errors[fieldPath]
        for (const issue of issues) {
          const path = pathSegments(issue.path.join('.')).join('.')
          if (fieldPath !== undefined && path !== fieldPath) continue
          errors[path] = [...(errors[path] ?? []), options.message(issue)]
        }
        state.setErrors(errors)
      }
      return final
    } finally { if (id === validationId) validating.value = false }
  }
  const validate = () => runValidation()
  const validateField = (path: string) => runValidation(pathSegments(path).join('.'))
  const setFieldValue = (path: string, value: unknown) => {
    invalidate()
    state.replaceValues(setPath(values.value, path, value))
    options.update(cloneValue(values.value), path, value)
  }
  async function submit() {
    if (submitting.value || options.disabled()) return
    submitting.value = true
    const atRevision = revision
    try {
      for (const field of options.fields()) state.setTouched(field.path)
      const result = await validate()
      if (atRevision !== revision || disposed) return
      if (result.valid) {
        await options.submitAction()?.(result.value, context)
        if (!disposed) options.valid(result.value, context)
      } else options.invalid(result.issues)
      return result
    } finally { submitting.value = false }
  }
  return { state, values, submitting, validating, setFieldValue, validate, validateField, submit, reset, setErrors, clearErrors }
}
