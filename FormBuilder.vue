<template>
  <q-form @submit="submit">
    <div :class="props.customClass">
      <template
        v-if="sectionStructure"
        v-for="(section, sIndex) in fields"
        :key="sIndex"
      >
        <q-expansion-item
          :label="section.value.label"
          v-model="openSections[section.key]"
          :icon="section?.value?.meta?.icon"
          expand-separator
          :default-opened="Number(sIndex) === 0"
        >
          <!-- Dynamic Inputs -->
          <div
            class="row q-col-gutter-sm q-mt-sm q-pb-md"
            v-if="section?.value?.meta?.type === 'input'"
          >
            <q-input
              v-for="field in section.value.fields"
              :key="field.key"
              :model-value="String(getValue(field.key) ?? '')"
              @update:model-value="setValue(field.key, $event)"
              :label="field.label"
              :type="field?.meta?.type || 'text'"
              :error="!!errors[field.key]"
              :error-message="errors[field.key]"
              filled
              v-bind="inputProps"
              class="col-12 col-sm-6 styled-input"
              :dir="inputDir(field)"
              :style="{
                direction: inputDir(field),
              }"
            />
          </div>

          <!-- Dynamic Textareas -->
          <div
            class="q-mt-sm q-pb-md"
            v-else-if="section?.value.meta?.type === 'textarea'"
          >
            <q-input
              :model-value="String(getValue(section.key) ?? '')"
              @update:model-value="setValue(section.key, $event)"
              :error="!!errors[section.key]"
              :error-message="errors[section.key]"
              type="textarea"
              filled
              rows="3"
              v-bind="inputProps"
              class="styled-input"
              :dir="section?.value.meta?.direction || direction || 'ltr'"
            />
          </div>
          <div
            class="q-mt-sm q-pb-md"
            v-else-if="section?.value.meta?.type === 'singleInput'"
          >
            <q-input
              :key="section.key"
              :model-value="String(getValue(section.key) ?? '')"
              @update:model-value="setValue(section.key, $event)"
              :label="section?.value.label"
              :error="!!errors[section.key]"
              :error-message="errors[section.key]"
              filled
              v-bind="inputProps"
              class="col-12 styled-input"
              :dir="section?.value.meta.direction || direction || 'ltr'"
            />
          </div>
        </q-expansion-item>
      </template>

      <template v-else v-for="(field, key) in fields" :key="key">
        <q-input
          v-if="['text', 'email', 'password', 'number'].includes(field.type)"
          :model-value="values[key]"
          @update:model-value="setFieldValue(key, $event)"
          :label="field.label"
          :type="field.type"
          filled
          :error="!!errors[key]"
          :error-message="errors[key]"
          :class="field.class"
          v-bind="inputProps"
          :dir="inputDir(field)"
          :style="{
            direction: inputDir(field),
          }"
        />

        <q-input
          v-else-if="field.type === 'textarea'"
          :model-value="values[key]"
          @update:model-value="setFieldValue(key, $event)"
          :label="field.label"
          type="textarea"
          filled
          rows="3"
          :error="!!errors[key]"
          :error-message="errors[key]"
          :class="['styled-input', field.class]"
          :dir="inputDir(field)"
          :style="{
            direction: inputDir(field),
          }"
        />
      </template>
      <slot name="default"></slot>
    </div>
  </q-form>
</template>

<script setup lang="ts">
import { useForm } from "vee-validate";

const props = defineProps<{
  schema: any;
  initialValues?: Record<string, any>;
  sectionStructure?: boolean;
  onSubmit: (values: any, resetForm?: () => void) => void;
  customClass?: string;
  inputProps?: Record<string, any>;
  direction?: string;
}>();

const { handleSubmit, errors, values, setFieldValue, defineField, resetForm } =
  useForm({
    validationSchema: props.schema,
    initialValues: props.initialValues || {},
    validateOnMount: false,
  });

const openSections = reactive<Record<string, boolean>>({});

const inputDir = (field: any) =>
  field?.meta?.direction || props.direction || "ltr";

const fields = computed(() => {
  const desc = props.schema.describe().fields as Record<string, any>;
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(desc)) {
    const meta = (value as any).meta || {};
    defineField(key);
    result[key] = {
      label: value.label || key,
      type: meta.type || "text",
      ...meta,
    };
  }
  return props.sectionStructure ? sectionStructureFn(desc) : result;
});

function sectionStructureFn(desc: any) {
  const data: any[] = [];
  for (const [sectionKey, sectionValue] of Object.entries(desc)) {
    const fields =
      (sectionValue as any).fields || (sectionValue as any).innerType?.fields;
    const meta = (sectionValue as any).meta || {};
    const label = (sectionValue as any).label;

    const sectionFields = [];
    if (fields) {
      for (const [fieldKey, fieldValue] of Object.entries(fields) as [
        string,
        any,
      ][]) {
        const fullPath = `${sectionKey}.${fieldKey}`;
        defineField(fullPath);
        sectionFields.push({
          key: fullPath,
          label: fieldValue.label || fieldKey,
          meta: fieldValue?.meta,
        });
      }
    }

    data.push({
      key: sectionKey,
      value: {
        label,
        fields: sectionFields,
        meta,
      },
    });
  }

  return data;
}

function getValue(path: string) {
  return path.split(".").reduce((obj, key) => obj?.[key], values);
}
function setValue(path: string, val: any) {
  setFieldValue(path, val);
}

const submit = handleSubmit((vals) => {
  props.onSubmit(vals, resetForm);
});

watch(
  () => errors.value,
  (newErrors = {}) => {
    if (!props.sectionStructure) return;
    if (!Array.isArray(fields.value)) return;

    for (const section of fields.value) {
      const hasSubFields =
        Array.isArray(section.value.fields) && section.value.fields.length > 0;

      let hasError = false;

      if (hasSubFields) {
        hasError = section.value.fields.some((f: any) => !!newErrors[f.key]);
      } else {
        hasError = !!newErrors[section.key];
      }
      if (hasError) {
        openSections[section.key] = true;
      }
    }
  },
  { deep: true, immediate: true },
);
</script>
