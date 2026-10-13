<script setup lang="ts">
import { ref } from 'vue'
import { QSchemaWizard, defineFields } from 'q-schema-form'
import { z } from 'zod'

const schema = z.object({ email: z.string().email(), name: z.string().min(1, 'Name required'), biography: z.string() })
const form = ref({ email: '', name: '', biography: '' })
const steps = [{ key: 'account', label: 'Account' }, { key: 'profile', label: 'Profile' }, { key: 'about', label: 'About you' }]
const fields = defineFields<typeof form.value>()({
  email: { type: 'input', label: 'Email', step: 'account', props: { type: 'email' } },
  name: { type: 'input', label: 'Full name', step: 'profile' },
  biography: { type: 'textarea', label: 'Biography', step: 'about' },
})
const output = ref('')
</script>

<template>
  <p>Next validates the current step. Previous preserves entered values; Submit validates the complete schema.</p>
  <QSchemaWizard v-model="form" :steps="steps" :schema="schema" :fields="fields" :default-field-props="{ outlined: true }" @submit="output = JSON.stringify($event, null, 2)" />
  <pre v-if="output" class="result">{{ output }}</pre>
</template>
