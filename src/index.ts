/** Package version. Validator integrations are exposed through separate subpaths. */
export const version = "0.2.0";
export { default as QSchemaForm } from "./components/QSchemaForm.vue";
export { default as QSchemaWizard } from './components/QSchemaWizard.vue';
export { createQSchemaForm } from "./core/plugin.js";
export { createFieldRegistry } from "./core/fieldRegistry.js";
export { standardSchemaAdapter } from "./adapters/standard-schema/index.js";
export { useFormState } from "./composables/useFormState.js";
export type * from "./types/index.js";
export { required, matchesField, isoDate, dateAfter, fileSize, fileType, allOf, asyncCheck } from './validation/index.js'

import type { FieldMap, FieldPath } from "./types/index.js";
/** Preserve field literals while checking paths and component props against a model. */
export function defineFields<T>() {
  return <F extends FieldMap<T>>(
    fields: F & Record<Exclude<keyof F, FieldPath<T>>, never>,
  ): F => fields;
}
