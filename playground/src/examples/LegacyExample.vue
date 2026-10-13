<script setup lang="ts">
import { ref } from 'vue'
import { QBtn } from 'quasar'
import { FormBuilder } from 'q-schema-form/compat'
import type { FormValues } from 'q-schema-form'
import * as yup from 'yup'

const schema = yup.object({
  title: yup.string().label('Title').required('Title required').meta({ type: 'singleInput' }),
  profile: yup.object({ email: yup.string().label('Email').required('Email required').email().meta({ type: 'email' }) }).label('Contact details').meta({ type: 'input' }),
  notes: yup.string().label('Notes').meta({ type: 'textarea' }),
})
const result = ref('')
function submit(values: FormValues, reset?: () => void) {
  result.value = JSON.stringify(values, null, 2)
  reset?.()
}
</script>

<template>
  <p>The original schema metadata, section layout, and submit/reset callback contract.</p>
  <FormBuilder :schema="schema" :initial-values="{ title: '', profile: { email: '' }, notes: '' }" section-structure :on-submit="submit">
    <QBtn type="submit" color="primary" label="Save and reset" class="q-mt-md" />
  </FormBuilder>
  <pre v-if="result" class="result">{{ result }}</pre>
</template>
