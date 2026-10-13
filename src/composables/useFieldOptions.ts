import { computed, shallowRef, watch } from 'vue'
import type { FieldContext, FieldDefinition, SelectOption } from '../types/index.js'
import { cloneValue, equalValues } from '../utils/values.js'

export function useFieldOptions<T>(field: () => FieldDefinition<T>, context: () => FieldContext<T>) {
  const options = shallowRef<readonly SelectOption[]>([])
  const loading = shallowRef(false)
  const error = shallowRef<unknown>()
  const inputs = computed<readonly unknown[]>((previous) => {
    const next = [cloneValue(field().options), cloneValue(field().dependencies?.map((path) => context().getValue(path)) ?? context().values)]
    return previous && equalValues(previous, next) ? previous : next
  })
  watch(inputs, async (_next, _previous, cleanup) => {
    const controller = new AbortController()
    cleanup(() => controller.abort())
    error.value = undefined
    const source = field().options
    if (typeof source !== 'function') { options.value = source ?? []; loading.value = false; return }
    options.value = []
    loading.value = true
    try {
      const result = await source(context(), controller.signal)
      if (!controller.signal.aborted) options.value = result
    } catch (cause) {
      if (!controller.signal.aborted) error.value = cause
    } finally { if (!controller.signal.aborted) loading.value = false }
  }, { immediate: true, deep: true })
  return { options, loading, error }
}
