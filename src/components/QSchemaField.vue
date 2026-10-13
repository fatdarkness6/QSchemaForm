<script setup lang="ts" generic="T extends FormValues">
import { computed, watch } from 'vue'
import type { FieldBindings, FieldContext, FieldDefinition, FieldRegistry, FormValues, Translate, Direction } from '../types/index.js'
import { getPath } from '../utils/paths.js'
import { useFieldOptions } from '../composables/useFieldOptions.js'
import { resolveFieldProps } from '../core/fieldProps.js'

const props = defineProps<{
  field: FieldDefinition<T>
  values: T
  registry: FieldRegistry
  translate: Translate
  error?: string
  disabled?: boolean
  readonly?: boolean
  direction?: Direction
  defaultProps?: Record<string, unknown>
}>()
const emit = defineEmits<{
  change: [path: string, value: unknown]
  blur: [path: string]
  error: [error: unknown]
}>()
const context = computed(() => ({ values: props.values, getValue: (path: string) => getPath(props.values, path) }))
const condition = (value: boolean | ((context: FieldContext<T>) => boolean) | undefined) => typeof value === 'function' ? value(context.value) : value
const component = computed(() => {
  const component = props.registry.resolve(props.field.type ?? 'input')
  if (!component) throw new Error(`Unknown field type "${props.field.type}". Register its component first.`)
  return component
})
const options = useFieldOptions(() => props.field, () => context.value)
watch(options.error, (error) => { if (error) emit('error', error) })
const componentProps = computed(() => ({ ...props.defaultProps, ...resolveFieldProps(props.field.props, context.value) }))
const bindings = computed<FieldBindings>(() => ({
  ...(props.field.type === 'select' ? { emitValue: true, mapOptions: true } : {}),
  ...componentProps.value,
  name: props.field.path,
  modelValue: getPath(props.values, props.field.path),
  label: props.translate(props.field.label ?? props.field.path),
  ...(props.field.placeholder ? { placeholder: props.translate(props.field.placeholder) } : {}),
  ...(props.field.hint ? { hint: props.translate(props.field.hint) } : {}),
  ...(['select', 'radio'].includes(props.field.type ?? '') ? {
    options: options.options.value.map((option) => typeof option === 'object' ? { ...option, label: props.translate(option.label) } : props.field.type === 'radio' ? { label: String(option), value: option } : option),
  } : {}),
  ...(props.field.type === 'select' && componentProps.value.useInput && typeof props.field.options === 'function' ? { onFilter: options.filter } : {}),
  error: Boolean(props.error || options.error.value),
  errorMessage: props.error ?? (options.error.value ? props.translate('Unable to load options') : undefined),
  loading: options.loading.value || Boolean(componentProps.value.loading),
  disable: props.disabled || condition(props.field.disabled) || Boolean(componentProps.value.disable),
  readonly: props.readonly || condition(props.field.readonly) || Boolean(componentProps.value.readonly),
  dir: props.field.direction ?? props.direction ?? 'ltr',
  'aria-invalid': Boolean(props.error || options.error.value),
}))
</script>

<template>
  <div :class="field.class ?? 'col-12'" :data-field="field.path">
    <slot :field="field" :bindings="bindings" :set-value="(value: unknown) => emit('change', field.path, value)" :blur="() => emit('blur', field.path)" :reload-options="options.reload">
      <component :is="component" v-bind="bindings" @update:model-value="emit('change', field.path, $event)" @blur="emit('blur', field.path)" />
    </slot>
  </div>
</template>
