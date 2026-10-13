import { createQSchemaForm, defineFields, standardSchemaAdapter } from 'q-schema-form'
import type { FieldMap, SchemaAdapter } from 'q-schema-form'

const fields = defineFields<{ name: string }>()({ name: { type: 'input', props: { dense: true } } })
const checked: FieldMap<{ name: string }> = fields
const adapter: SchemaAdapter<{ name: string }> = standardSchemaAdapter({
  '~standard': { version: 1, vendor: 'consumer', validate: (value) => ({ value: value as { name: string } }) },
})
createQSchemaForm({ translate: (key) => key })
void checked
void adapter
