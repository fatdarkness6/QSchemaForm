<script setup lang="ts">
import { ref } from 'vue'
import { QBtn } from 'quasar'
import { QSchemaForm } from 'q-schema-form'
import type { FieldArrayDefinition } from 'q-schema-form'
import { z } from 'zod'

const schema = z.object({ contacts: z.array(z.object({ name: z.string().min(1, 'Name required'), email: z.string().email('Enter a valid email') })).min(1).max(4) })
const form = ref<z.input<typeof schema>>({ contacts: [{ name: '', email: '' }] })
const arrays: FieldArrayDefinition<typeof form.value>[] = [{
  path: 'contacts', label: 'Contacts', minItems: 1, maxItems: 4,
  createItem: () => ({ name: '', email: '' }),
  fields: { name: { type: 'input', label: 'Name', class: 'col-12 col-sm-6' }, email: { type: 'input', label: 'Email', props: { type: 'email' }, class: 'col-12 col-sm-6' } },
}]
const output = ref('')
</script>

<template>
  <p>Add up to four contacts. Move or remove rows; their values and validation state follow the item.</p>
  <QSchemaForm v-model="form" :schema="schema" :arrays="arrays" :default-field-props="{ outlined: true }" @submit="output = JSON.stringify($event, null, 2)">
    <template #default="{ reset }"><div class="row q-gutter-sm q-mt-md"><QBtn type="submit" color="primary" label="Save contacts" /><QBtn type="button" outline label="Reset" @click="reset" /></div></template>
  </QSchemaForm>
  <pre class="result">{{ output || JSON.stringify(form, null, 2) }}</pre>
</template>
