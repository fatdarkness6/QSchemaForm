<script
  setup
  lang="ts"
  generic="Input extends FormValues = FormValues, Output = Input"
>
import { computed, inject, ref, watch } from "vue";
import type { ComputedRef } from "vue";
import { QForm, QExpansionItem } from "quasar";
import type {
  Direction,
  FieldDefinition,
  FieldArrayDefinition,
  FieldArrayPath,
  FieldMap,
  FieldPath,
  FieldRegistry,
  FormStateAdapter,
  FormValues,
  SchemaSource,
  SectionDefinition,
  SubmitContext,
  Translate,
  ValidationIssue,
} from "../types/index.js";
import { configurationKey } from "../core/configuration.js";
import { createFieldRegistry } from "../core/fieldRegistry.js";
import { normalizeForm, applyDefaults } from "../core/normalizeForm.js";
import { useFormEngine } from "../core/formEngine.js";
import { getPath } from "../utils/paths.js";
import QSchemaField from "./QSchemaField.vue";
import QSchemaArray from "./QSchemaArray.vue";
import {
  arrayItems,
  initializeArrays,
  withinPath,
} from "../core/fieldArrays.js";

const props = defineProps<{
  modelValue?: Input;
  initialValues?: Input;
  schema?: SchemaSource<Input, Output>;
  fields?: FieldMap<Input>;
  arrays?: readonly FieldArrayDefinition<Input>[];
  sections?: readonly SectionDefinition[];
  registry?: FieldRegistry;
  stateAdapter?: FormStateAdapter;
  translate?: Translate;
  formatValidationMessage?: (
    issue: ValidationIssue,
    translate: Translate,
  ) => string;
  defaultFieldProps?: Record<string, unknown>;
  direction?: Direction;
  disabled?: boolean;
  readonly?: boolean;
  loading?: boolean;
  validateOn?: "blur" | "change" | "submit";
  submitAction?: (
    values: Output,
    context: SubmitContext<Input>,
  ) => unknown | Promise<unknown>;
}>();
const emit = defineEmits<{
  "update:modelValue": [values: Input];
  change: [values: Input];
  "field-change": [event: { path: string; value: unknown; values: Input }];
  submit: [values: Output, context: SubmitContext<Input>];
  invalid: [issues: readonly ValidationIssue[]];
  reset: [values: Input];
  error: [error: unknown];
}>();
const config = inject(configurationKey, undefined);
const registry = props.registry ?? config?.registry ?? createFieldRegistry();
const translate: Translate = (key, params) =>
  (props.translate ?? config?.translate)?.(key, params) ?? key;
const message = (issue: ValidationIssue) =>
  (props.formatValidationMessage ?? config?.formatValidationMessage)?.(
    issue,
    translate,
  ) ??
  (issue.messageKey
    ? translate(issue.messageKey, issue.params)
    : issue.message);
const starting = initializeArrays(
  props.modelValue ?? props.initialValues ?? ({} as Input),
  props.arrays ?? [],
);
const initialValues = applyDefaults(
  starting,
  normalizeForm(props.schema, props.fields, starting, props.arrays),
);
const fields: ComputedRef<FieldDefinition<Input>[]> = computed(() =>
  normalizeForm(props.schema, props.fields, engine.values.value, props.arrays),
);
const engine = useFormEngine<Input, Output>({
  initialValues,
  model: () => props.modelValue,
  schema: () => props.schema,
  fields: () => fields.value,
  arrays: () => props.arrays ?? [],
  stateAdapter: props.stateAdapter,
  message,
  update(values, path, value) {
    emit("update:modelValue", values);
    emit("change", values);
    if (path) emit("field-change", { path, value, values });
  },
  valid: (values, context) => emit("submit", values, context),
  invalid: (issues) => emit("invalid", issues),
  reset: (values) => emit("reset", values),
  submitAction: () => props.submitAction,
  disabled: () => Boolean(props.disabled || props.loading),
});
const busy = computed(() => props.loading || engine.submitting.value);
const blocked = computed(() => props.disabled || busy.value);
const defaults = computed(() => ({
  ...config?.defaultFieldProps,
  ...props.defaultFieldProps,
}));
const visible = computed(() =>
  fields.value.filter((field) =>
    typeof field.hidden === "function"
      ? !field.hidden({
          values: engine.values.value,
          getValue: (path) => getPath(engine.values.value, path),
        })
      : !field.hidden,
  ),
);
const visibleArrays = computed(() =>
  (props.arrays ?? []).filter(
    (array) =>
      !(typeof array.hidden === "function"
        ? array.hidden({
            values: engine.values.value,
            getValue: (path) => getPath(engine.values.value, path),
          })
        : array.hidden),
  ),
);
const flatFields = computed(() =>
  visible.value.filter((field) => !field.arrayPath),
);
const groups = computed(() => {
  const sections = props.sections ?? [];
  const keys = new Set(sections.map((section) => section.key));
  return [
    {
      section: undefined,
      fields: flatFields.value.filter(
        (field) => !field.section || !keys.has(field.section),
      ),
      arrays: visibleArrays.value.filter(
        (array) => !array.section || !keys.has(array.section),
      ),
    },
    ...sections.map((section) => ({
      section,
      fields: flatFields.value.filter((field) => field.section === section.key),
      arrays: visibleArrays.value.filter(
        (array) => array.section === section.key,
      ),
    })),
  ].filter((group) => group.fields.length || group.arrays.length);
});
const open = ref<Record<string, boolean>>(
  Object.fromEntries(
    (props.sections ?? []).map((section, index) => [
      section.key,
      section.defaultOpened ?? index === 0,
    ]),
  ),
);
watch(
  engine.state.errors,
  (errors) => {
    for (const field of fields.value)
      if (field.section && errors[field.path]?.length)
        open.value[field.section] = true;
    for (const array of props.arrays ?? [])
      if (array.section && errors[array.path]?.length)
        open.value[array.section] = true;
  },
  { deep: true },
);
const fieldProps = (field: FieldDefinition<Input>) => ({
  field,
  registry,
  translate,
  values: engine.values.value,
  error: engine.state.errors.value[field.path]?.[0],
  disabled: blocked.value,
  readonly: props.readonly,
  direction: props.direction,
  defaultProps: defaults.value,
});
const report = (error: unknown) => emit("error", error);
const validate = () => engine.validate();
const submit = () => engine.submit();
const change = (path: string, value: unknown) => {
  const revalidate = Boolean(engine.state.errors.value[path]?.length);
  engine.setFieldValue(path, value);
  if (
    props.validateOn === "change" ||
    (props.validateOn !== "submit" && revalidate)
  )
    void engine.validateField(path).catch(report);
};
const blur = (path: string) => {
  engine.state.setTouched(path);
  if ((props.validateOn ?? "blur") === "blur")
    void engine.validateField(path).catch(report);
};
const arrayProps = (definition: FieldArrayDefinition<Input>) => ({
  definition,
  rows: arrayItems(engine.values.value, definition.path).map(
    (_item, index) => ({
      key: engine.arrayKey(definition.path, index),
      index,
      fields: visible.value.filter(
        (field) =>
          field.arrayPath === definition.path && field.arrayIndex === index,
      ),
    }),
  ),
  values: engine.values.value,
  errors: engine.state.errors.value,
  registry,
  translate,
  disabled: blocked.value,
  readonly: props.readonly,
  direction: props.direction,
  defaultProps: defaults.value,
});
const afterArrayChange = (path: string, operation: () => boolean) => {
  const revalidate = Object.keys(engine.state.errors.value).some((key) =>
    withinPath(key, path),
  );
  const changed = operation();
  if (
    changed &&
    (props.validateOn === "change" ||
      (props.validateOn !== "submit" && revalidate))
  )
    void engine.validateFields([path]).catch(report);
  return changed;
};
const appendArrayItem = (path: FieldArrayPath<Input>, value?: unknown) =>
  afterArrayChange(path, () => engine.appendArrayItem(path, value));
const removeArrayItem = (path: FieldArrayPath<Input>, index: number) =>
  afterArrayChange(path, () => engine.removeArrayItem(path, index));
const moveArrayItem = (path: FieldArrayPath<Input>, from: number, to: number) =>
  afterArrayChange(path, () => engine.moveArrayItem(path, from, to));
// Slot callbacks can be used directly as button event handlers or with values.
const resetFromSlot = (next?: Input | Event) => engine.reset(
  typeof Event !== 'undefined' && next instanceof Event ? undefined : next as Input | undefined,
);
const slotState = computed(() => ({
  values: engine.values.value,
  errors: engine.state.errors.value,
  touched: engine.state.touched.value,
  dirty: engine.state.dirty.value,
  submitting: engine.submitting.value,
  validating: engine.validating.value,
  loadingValues: engine.loadingValues.value,
  loadError: engine.loadError.value,
  reset: resetFromSlot,
  submit,
  setValues: engine.setValues,
  loadValues: engine.loadValues,
  cancelLoad: engine.cancelLoad,
  applyServerResponse: engine.applyServerResponse,
  setFieldValue: (path: FieldPath<Input>, value: unknown) => engine.setFieldValue(path, value),
  validateFields: engine.validateFields,
  appendArrayItem,
  removeArrayItem,
  moveArrayItem,
}));
defineExpose({
  get loadingValues() { return engine.loadingValues.value },
  validate,
  submit,
  reset: engine.reset,
  setErrors: engine.setErrors,
  clearErrors: engine.clearErrors,
  setValues: engine.setValues,
  loadValues: engine.loadValues,
  cancelLoad: engine.cancelLoad,
  applyServerResponse: engine.applyServerResponse,
  validateFields: engine.validateFields,
  appendArrayItem,
  removeArrayItem,
  moveArrayItem,
  setFieldValue: (path: FieldPath<Input>, value: unknown) =>
    engine.setFieldValue(path, value),
});
</script>

<template>
  <QForm
    :aria-busy="Boolean(busy || engine.loadingValues.value)"
    novalidate
    @submit="submit().catch(report)"
    @reset="() => engine.reset()"
  >
    <div
      v-if="engine.state.errors.value['']?.length"
      role="alert"
      class="text-negative q-mb-md"
    >
      {{ engine.state.errors.value[""]?.join(" ") }}
    </div>
    <template
      v-for="(group, index) in groups"
      :key="group.section?.key ?? index"
    >
      <QExpansionItem
        v-if="group.section"
        v-model="open[group.section.key]"
        :label="translate(group.section.label)"
        :icon="group.section.icon"
        expand-separator
      >
        <div class="row q-col-gutter-sm q-py-md">
          <QSchemaField
            v-for="field in group.fields"
            :key="field.path"
            v-bind="fieldProps(field)"
            @change="change"
            @blur="blur"
            @error="report"
          >
            <template v-if="$slots[`field:${field.path}`]" #default="scope">
              <slot :name="`field:${field.path}`" v-bind="scope" />
            </template>
          </QSchemaField>
          <QSchemaArray
            v-for="array in group.arrays"
            :key="array.path"
            v-bind="arrayProps(array)"
            @change="change"
            @blur="blur"
            @error="report"
            @append="(path) => appendArrayItem(path as FieldArrayPath<Input>)"
            @remove="
              (path, index) =>
                removeArrayItem(path as FieldArrayPath<Input>, index)
            "
            @move="
              (path, from, to) =>
                moveArrayItem(path as FieldArrayPath<Input>, from, to)
            "
          >
            <template
              v-for="name in Object.keys($slots).filter((name) =>
                name.startsWith('field:'),
              )"
              #[name]="scope"
              ><slot :name="name" v-bind="scope"
            /></template>
          </QSchemaArray>
        </div>
      </QExpansionItem>
      <div v-else class="row q-col-gutter-sm">
        <QSchemaField
          v-for="field in group.fields"
          :key="field.path"
          v-bind="fieldProps(field)"
          @change="change"
          @blur="blur"
          @error="report"
        >
          <template v-if="$slots[`field:${field.path}`]" #default="scope">
            <slot :name="`field:${field.path}`" v-bind="scope" />
          </template>
        </QSchemaField>
        <QSchemaArray
          v-for="array in group.arrays"
          :key="array.path"
          v-bind="arrayProps(array)"
          @change="change"
          @blur="blur"
          @error="report"
          @append="(path) => appendArrayItem(path as FieldArrayPath<Input>)"
          @remove="
            (path, index) =>
              removeArrayItem(path as FieldArrayPath<Input>, index)
          "
          @move="
            (path, from, to) =>
              moveArrayItem(path as FieldArrayPath<Input>, from, to)
          "
        >
          <template
            v-for="name in Object.keys($slots).filter((name) =>
              name.startsWith('field:'),
            )"
            #[name]="scope"
            ><slot :name="name" v-bind="scope"
          /></template>
        </QSchemaArray>
      </div>
    </template>
    <slot v-bind="slotState" />
  </QForm>
</template>
