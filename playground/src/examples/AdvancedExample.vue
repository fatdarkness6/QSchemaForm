<script setup lang="ts">
import { ref } from 'vue'
import { QBtn } from 'quasar'
import { QSchemaForm, defineFields, allOf, required, matchesField, isoDate, dateAfter, fileSize, fileType, asyncCheck } from 'q-schema-form'

const form = ref({ username: '', password: '', confirm: '', start: '', end: '', time: '', role: 'reader', attachment: null as File | null, volume: 30, budget: { min: 20, max: 70 }, rating: 3, biography: '' })
const fields = defineFields<typeof form.value>()({
  username: { type: 'input', label: 'Username', hint: 'Demo: “admin” and “taken” are unavailable', validate: allOf(required(), asyncCheck(async (value, { signal }) => {
    // Replace this demonstration with your API request and pass its AbortSignal.
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 400)
      signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('Aborted')) }, { once: true })
    })
    return !['admin', 'taken'].includes(String(value).toLowerCase())
  }, 'This username is unavailable')) },
  password: { type: 'input', label: 'Password', props: { type: 'password' }, validate: required() },
  confirm: { type: 'input', label: 'Confirm password', props: { type: 'password' }, validate: allOf(required(), matchesField('password', 'Passwords must match')) },
  start: { type: 'date', label: 'Start date', class: 'col-12 col-sm-6', validate: allOf(required(), isoDate()) },
  end: { type: 'date', label: 'End date', class: 'col-12 col-sm-6', validate: allOf(required(), isoDate(), dateAfter('start')) },
  time: { type: 'time', label: 'Meeting time', props: { format24h: true } },
  role: { type: 'radio', label: 'Role', options: [{ label: 'Reader', value: 'reader' }, { label: 'Writer', value: 'writer' }], props: { inline: true } },
  attachment: { type: 'file', label: 'Attachment', hint: 'PDF or image, up to 2 MB', props: { accept: '.pdf,image/*', clearable: true }, validate: allOf(fileSize(2 * 1024 * 1024), fileType(['.pdf', 'image/*'])) },
  volume: { type: 'slider', label: 'Volume', props: { min: 0, max: 100, valueLabel: true } },
  budget: { type: 'range', label: 'Budget range', props: { min: 0, max: 100, valueLabel: true } },
  rating: { type: 'rating', label: 'Rating', props: { max: 5, size: '2em', color: 'amber' } },
  biography: { type: 'editor', label: 'Biography', props: { minHeight: '8rem' } },
})
const output = ref('')
const show = (values: typeof form.value) => { output.value = JSON.stringify(values, (_key, value) => value instanceof File ? { name: value.name, size: value.size, type: value.type } : value, 2) }
</script>

<template>
  <p>Date/time pickers, radio buttons, files, sliders, range, rating and rich text. Validation includes matching passwords, date comparisons, file limits and a simulated server check.</p>
  <QSchemaForm v-model="form" :fields="fields" :default-field-props="{ outlined: true }" @submit="show">
    <template #default="{ reset, submitting }">
      <div class="row q-gutter-sm q-mt-md"><QBtn type="submit" color="primary" label="Validate" :loading="submitting" /><QBtn type="button" outline label="Reset" @click="reset" /></div>
    </template>
  </QSchemaForm>
  <pre v-if="output" class="result">{{ output }}</pre>
</template>
