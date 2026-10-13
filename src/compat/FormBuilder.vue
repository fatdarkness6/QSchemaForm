<script setup lang="ts" generic="Initial extends FormValues = FormValues">
import { computed, ref } from "vue";
import type { AnyObjectSchema } from "yup";
import type {
  Direction,
  FieldConfig,
  FieldMap,
  FormValues,
  SectionDefinition,
} from "../types/index.js";
import { yupAdapter } from "../adapters/yup/index.js";
import { veeValidateAdapter } from "../adapters/vee-validate/index.js";
import QSchemaForm from "../components/QSchemaForm.vue";

/** Migration entry point retaining the original prop-based submission contract. */
const props = defineProps<{
  schema: AnyObjectSchema;
  initialValues?: Initial;
  sectionStructure?: boolean;
  onSubmit: (
    values: FormValues,
    resetForm?: () => void,
  ) => unknown | Promise<unknown>;
  customClass?: string;
  inputProps?: Record<string, unknown>;
  direction?: Direction;
}>();
const values = ref<FormValues>(props.initialValues ?? {});
const adapter = computed(() => yupAdapter(props.schema));
const sections = computed<SectionDefinition[]>(() =>
  props.sectionStructure
    ? Object.entries(props.schema.describe({ value: values.value }).fields).map(
        ([key, field], index) => ({
          key,
          label: "label" in field ? (field.label ?? key) : key,
          icon:
            "meta" in field && typeof field.meta?.icon === "string"
              ? field.meta.icon
              : undefined,
          defaultOpened: index === 0,
        }),
      )
    : [],
);
const fields = computed<FieldMap>(() => {
  const inferred = adapter.value.describe?.(values.value) ?? [];
  const description = props.schema.describe({ value: values.value });
  return Object.fromEntries(
    inferred.map((field) => {
      const sectionKey = field.path.split(".")[0]!;
      const section = description.fields[sectionKey];
      const sectionMeta =
        section && "meta" in section ? section.meta : undefined;
      const type = sectionMeta?.type;
      const config: FieldConfig = {
        ...field,
        props: { filled: true, ...props.inputProps, ...field.props },
        ...(props.sectionStructure
          ? {
              section: sectionKey,
              hidden: !["input", "textarea", "singleInput"].includes(
                String(type),
              ),
              class: field.path.includes(".")
                ? "col-12 col-sm-6 styled-input"
                : "col-12 styled-input",
            }
          : {}),
      } as FieldConfig;
      return [field.path, config];
    }),
  );
});
</script>

<template>
  <QSchemaForm
    v-model="values"
    :schema="adapter"
    :fields="fields"
    :sections="sections"
    :state-adapter="veeValidateAdapter"
    :direction="direction"
    :class="customClass"
    :submit-action="(result, context) => props.onSubmit(result, context.reset)"
  >
    <template #default="state"><slot v-bind="state" /></template>
  </QSchemaForm>
</template>
