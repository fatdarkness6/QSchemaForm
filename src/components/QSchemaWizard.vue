<script setup lang="ts" generic="Input extends FormValues = FormValues, Output = Input">
import { computed, inject, ref, watch } from 'vue'
import { QBtn } from 'quasar'
import QSchemaForm from './QSchemaForm.vue'
import { normalizeForm, applyDefaults } from '../core/normalizeForm.js'
import { initializeArrays, withinPath } from '../core/fieldArrays.js'
import { cloneValue } from '../utils/values.js'
import { configurationKey } from '../core/configuration.js'
import type { Direction, FieldArrayDefinition, FieldArrayPath, FieldContext, FieldMap, FieldPath, FieldRegistry, FormActions, FormStateAdapter, FormValues, SchemaSource, SectionDefinition, StepDefinition, SubmitContext, Translate, ValidationIssue } from '../types/index.js'

const props = defineProps<{
  steps: readonly StepDefinition[]
  modelValue?: Input
  initialValues?: Input
  schema?: SchemaSource<Input, Output>
  fields?: FieldMap<Input>
  arrays?: readonly FieldArrayDefinition<Input>[]
  sections?: readonly SectionDefinition[]
  registry?: FieldRegistry
  stateAdapter?: FormStateAdapter
  translate?: Translate
  formatValidationMessage?: (issue: ValidationIssue, translate: Translate) => string
  defaultFieldProps?: Record<string, unknown>
  direction?: Direction
  disabled?: boolean
  readonly?: boolean
  loading?: boolean
  validateOn?: 'blur' | 'change' | 'submit'
  submitAction?: (values: Output, context: SubmitContext) => unknown | Promise<unknown>
}>()
const emit = defineEmits<{
  'update:modelValue': [values: Input]
  change: [values: Input]
  'field-change': [event: { path: string; value: unknown; values: Input }]
  submit: [values: Output, context: SubmitContext]
  invalid: [issues: readonly ValidationIssue[]]
  reset: [values: Input]
  error: [error: unknown]
  'step-change': [key: string]
}>()
const configuration = inject(configurationKey, undefined)
const translate: Translate = (key, params) => (props.translate ?? configuration?.translate)?.(key, params) ?? key
const keys = computed(() => {
  const result = props.steps.map((step) => step.key)
  if (!result.length || result.some((key) => !key) || new Set(result).size !== result.length) throw new Error('Wizard steps must have unique, nonempty keys')
  return result
})
const active = ref(keys.value[0]!)
const index = computed(() => keys.value.indexOf(active.value))
const navigating = ref(false)
const submitting = ref(false)
const form = ref<FormActions<Input, Output>>()
const start = initializeArrays(props.modelValue ?? props.initialValues ?? ({} as Input), props.arrays ?? [])
const values = ref<Input>(applyDefaults(start, normalizeForm(props.schema, props.fields, start, props.arrays)))
watch(() => props.modelValue, (next) => { if (next) values.value = cloneValue(next) }, { deep: true })
watch(keys, (next) => { if (!next.includes(active.value)) activate(next[0]!) })
const allFields = computed(() => normalizeForm(props.schema, props.fields, values.value as Input, props.arrays))
function stepFor(step?: string) {
  const key = step ?? keys.value[0]!
  if (!keys.value.includes(key)) throw new Error(`Unknown wizard step "${key}"`)
  return key
}
const wizardFields = computed(() => Object.fromEntries(allFields.value.map((field) => [field.path, {
  ...field, hidden: (context: FieldContext<Input>) => stepFor(field.step) !== active.value || Boolean(typeof field.hidden === 'function' ? field.hidden(context) : field.hidden),
}])) as unknown as FieldMap<Input>)
const wizardArrays = computed(() => (props.arrays ?? []).map((array) => ({ ...array,
  hidden: (context) => stepFor(array.step) !== active.value || Boolean(typeof array.hidden === 'function' ? array.hidden(context) : array.hidden),
})) as FieldArrayDefinition<Input>[])
const formProps = computed(() => {
  const rest = { ...props }
  Reflect.deleteProperty(rest, 'steps')
  return { ...rest, fields: wizardFields.value, arrays: wizardArrays.value, disabled: props.disabled || navigating.value }
})
function activate(key: string) { active.value = key; emit('step-change', key) }
function pathsFor(key: string) {
  return [...allFields.value.filter((field) => stepFor(field.step) === key).map((field) => field.path),
    ...(props.arrays ?? []).filter((array) => stepFor(array.step) === key).map((array) => array.path)]
}
async function goToStep(key: string) {
  const target = keys.value.indexOf(key)
  if (target < 0) throw new Error(`Unknown wizard step "${key}"`)
  if (navigating.value || submitting.value || props.disabled || props.loading) return false
  if (target <= index.value) { activate(key); return true }
  navigating.value = true
  try {
    while (index.value < target) {
      if (!await form.value!.validateFields(pathsFor(active.value))) return false
      activate(keys.value[index.value + 1]!)
    }
    return true
  } finally { navigating.value = false }
}
const nextStep = () => index.value < keys.value.length - 1 ? goToStep(keys.value[index.value + 1]!) : Promise.resolve(false)
function previousStep() {
  if (navigating.value || submitting.value || props.disabled || props.loading || index.value === 0) return false
  activate(keys.value[index.value - 1]!); return true
}
function invalid(issues: readonly ValidationIssue[]) {
  const first = keys.value.find((key) => issues.some((issue) => pathsFor(key).some((path) => withinPath(issue.path.join('.'), path))))
  if (first) activate(first)
  emit('invalid', issues)
}
function update(next: Input) { values.value = next; emit('update:modelValue', next) }
function resetEvent(next: Input) { activate(keys.value[0]!); emit('reset', next) }
const report = (error: unknown) => emit('error', error)
async function submit() {
  if (submitting.value || navigating.value) return
  submitting.value = true
  try { return await form.value!.submit() } finally { submitting.value = false }
}
function nativeSubmit(event: Event) {
  event.preventDefault(); event.stopImmediatePropagation()
  void (index.value === keys.value.length - 1 ? submit() : nextStep()).catch(report)
}
defineExpose({
  nextStep, previousStep, goToStep, submit,
  validate: () => form.value!.validate(),
  validateFields: (paths: readonly string[]) => form.value!.validateFields(paths),
  reset: () => form.value!.reset(),
  setErrors: (errors: Record<string, string | readonly string[]>) => form.value!.setErrors(errors),
  clearErrors: () => form.value!.clearErrors(),
  setFieldValue: (path: FieldPath<Input>, value: unknown) => form.value!.setFieldValue(path, value),
  appendArrayItem: (path: FieldArrayPath<Input>, value?: unknown) => form.value!.appendArrayItem(path, value),
  removeArrayItem: (path: FieldArrayPath<Input>, row: number) => form.value!.removeArrayItem(path, row),
  moveArrayItem: (path: FieldArrayPath<Input>, from: number, to: number) => form.value!.moveArrayItem(path, from, to),
})
</script>

<template>
  <div :dir="direction" @submit.capture="nativeSubmit">
    <ol class="row q-gutter-sm q-pa-none q-mb-lg" style="list-style: none" :aria-label="translate('Form steps')">
      <li v-for="(step, position) in steps" :key="step.key" :aria-current="active === step.key ? 'step' : undefined">
        <span :class="active === step.key ? 'text-primary text-weight-bold' : 'text-grey-7'">{{ position + 1 }}. {{ translate(step.label) }}</span>
      </li>
    </ol>
    <QSchemaForm ref="form" v-bind="formProps" :model-value="values as Input" @update:model-value="update" @change="$emit('change', $event)" @field-change="$emit('field-change', $event)" @submit="(output, context) => $emit('submit', output, context)" @invalid="invalid" @reset="resetEvent" @error="report">
      <template v-for="name in Object.keys($slots).filter((name) => name.startsWith('field:'))" #[name]="scope"><slot :name="name" v-bind="scope" /></template>
      <template #default="scope">
        <slot v-bind="scope" :submit="submit" :step="active" :step-index="index" :next-step="nextStep" :previous-step="previousStep" :go-to-step="goToStep" :navigating="navigating">
          <div class="row q-gutter-sm q-mt-lg">
            <QBtn type="button" outline :label="translate('Previous')" :disable="index === 0 || disabled || loading || navigating || scope.submitting" @click="previousStep" />
            <QBtn v-if="index < steps.length - 1" type="button" color="primary" :label="translate('Next')" :loading="navigating" :disable="disabled || loading || scope.submitting" @click="nextStep().catch(report)" />
            <QBtn v-else type="button" color="primary" :label="translate('Submit')" :loading="scope.submitting" :disable="disabled || loading || navigating" @click="submit().catch(report)" />
          </div>
        </slot>
      </template>
    </QSchemaForm>
  </div>
</template>
