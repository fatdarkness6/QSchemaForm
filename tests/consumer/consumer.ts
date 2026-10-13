import { QSchemaWizard, createQSchemaForm, defineFields, required, standardSchemaAdapter } from 'q-schema-form'
import type { FieldArrayDefinition, FieldMap, FormActions, SchemaAdapter, WizardActions } from 'q-schema-form'
import { QSchemaWizard as WizardEntry } from 'q-schema-form/wizard'

const fields = defineFields<{ name: string }>()({ name: { type: 'input', props: { dense: true } } })
const checked: FieldMap<{ name: string }> = fields
const adapter: SchemaAdapter<{ name: string }> = standardSchemaAdapter({
  '~standard': { version: 1, vendor: 'consumer', validate: (value) => ({ value: value as { name: string } }) },
})
createQSchemaForm({ translate: (key) => key })
void checked
void adapter
const arrays: FieldArrayDefinition<{ contacts: { email: string }[] }>[] = [{ path: 'contacts', label: 'Contacts', createItem: () => ({ email: '' }), fields: { email: { type: 'input', validate: required() } } }]
const wizard: WizardActions<{ contacts: { email: string }[] }> | undefined = undefined
void arrays
void wizard
void QSchemaWizard
void WizardEntry

const reactiveFields = defineFields<{ active: boolean; age: number; biography: string }>()({
  age: { type: 'number', props: ({ values }) => ({ min: values.active ? 18 : 0 }) },
  biography: { type: 'textarea', props: ({ values }) => ({ rows: values.active ? 4 : 2 }) },
})
function dynamicConsumer(form: FormActions<{ profile: { age: number }; active: boolean }>) {
  form.setValues({ profile: { age: 30 } }, { keepDirtyValues: true })
  void form.loadValues(({ signal }) => { void signal; return { active: true } })
  form.applyServerResponse({ errors: { 'profile.age': 'Invalid age' } })
  // @ts-expect-error Patches retain the model's property types.
  form.setValues({ profile: { age: 'wrong' } })
}
void reactiveFields
void dynamicConsumer
