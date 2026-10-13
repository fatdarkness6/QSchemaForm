import { computed, shallowRef } from 'vue'
import type { ErrorMap, FormStateAdapter } from '../types/index.js'
import { cloneValue, equalValues } from '../utils/values.js'

export const useFormState: FormStateAdapter = (initialValues) => {
  const initial = shallowRef(cloneValue(initialValues))
  const values = shallowRef(cloneValue(initialValues))
  const errors = shallowRef<ErrorMap>({})
  const touched = shallowRef<Record<string, boolean>>({})
  return {
    values, errors, touched,
    dirty: computed(() => !equalValues(values.value, initial.value)),
    replaceValues: (next) => { values.value = cloneValue(next) },
    setErrors: (next) => { errors.value = { ...next } },
    setTouched: (path) => { touched.value = { ...touched.value, [path]: true } },
    replaceTouched: (next) => { touched.value = { ...next } },
    reset(next) {
      if (next) initial.value = cloneValue(next)
      values.value = cloneValue(initial.value)
      errors.value = {}
      touched.value = {}
    },
  }
}
