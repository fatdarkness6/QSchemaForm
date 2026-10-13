import { QSchemaWizard, createQSchemaForm, defineFields, required, standardSchemaAdapter } from 'q-schema-form'
import type { FieldArrayDefinition, FieldMap, SchemaAdapter, WizardActions } from 'q-schema-form'
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
