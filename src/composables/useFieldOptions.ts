import { computed, onScopeDispose, shallowRef, watch } from 'vue'
import type { FieldContext, FieldDefinition, SelectOption } from '../types/index.js'
import { getPath } from '../utils/paths.js'
import { cloneValue, equalValues } from '../utils/values.js'

type FilterDone = (update: () => void) => void

export function useFieldOptions<T>(field: () => FieldDefinition<T>, context: () => FieldContext<T>) {
  const options = shallowRef<readonly SelectOption[]>([])
  const loading = shallowRef(false)
  const error = shallowRef<unknown>()
  const query = shallowRef('')
  let controller: AbortController | undefined
  let revision = 0
  let disposed = false
  let pendingFilter: { done: FilterDone; abort: () => void } | undefined
  const inputs = computed<readonly unknown[]>((previous) => {
    const next = [cloneValue(field().options), cloneValue(field().dependencies?.map((path) => context().getValue(path)) ?? context().values)]
    return previous && equalValues(previous, next) ? previous : next
  })

  function finishFilter(success: boolean) {
    const pending = pendingFilter
    pendingFilter = undefined
    if (success) pending?.done(() => {})
    else pending?.abort()
  }

  async function reload(): Promise<boolean> {
    controller?.abort()
    const current = new AbortController()
    controller = current
    const request = ++revision
    const isCurrent = () => !disposed && !current.signal.aborted && request === revision
    error.value = undefined
    const source = field().options
    if (typeof source !== 'function') {
      options.value = source ?? []
      loading.value = false
      finishFilter(true)
      return true
    }
    options.value = []
    loading.value = true
    // A request sees one consistent snapshot, even if a loader awaits before reading it.
    const values = cloneValue(context().values)
    const requestContext = { ...context(), values, getValue: (path: string) => getPath(values, path), query: query.value, signal: current.signal }
    try {
      const result = await source(requestContext, current.signal)
      if (!isCurrent()) return false
      options.value = result
      finishFilter(true)
      return true
    } catch (cause) {
      if (isCurrent()) {
        error.value = cause
        finishFilter(false)
      }
      return false
    } finally {
      if (isCurrent()) loading.value = false
    }
  }

  function filter(value: string, done: FilterDone, abort: () => void): void {
    finishFilter(false)
    pendingFilter = { done, abort }
    query.value = value
    // Reload the same query too: reopening the dropdown can recover a failed request.
    void reload()
  }

  watch(inputs, () => { void reload() }, { immediate: true, deep: true, flush: 'sync' })
  onScopeDispose(() => { disposed = true; revision++; controller?.abort(); finishFilter(false) })
  return { options, loading, error, query, filter, reload }
}
