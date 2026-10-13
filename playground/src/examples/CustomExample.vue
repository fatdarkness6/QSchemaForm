<script setup lang="ts">
import { ref } from 'vue'
import { QBtn } from 'quasar'
import { QSchemaForm, defineFields } from 'q-schema-form'
const form = ref({ phone: '', country: 'uk', city: '' })
const fields = defineFields<typeof form.value>()({
  phone: { type: 'phone', label: 'phone', hint: 'phoneHint', props: { defaultCountry: 'GB' } },
  country: { type: 'select', label: 'Country', options: [{ label: 'United Kingdom', value: 'uk' }, { label: 'Iran', value: 'ir' }] },
  city: {
    type: 'select', label: 'city', dependencies: ['country'],
    async options({ values }, signal) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 300)
        signal.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('Aborted')) }, { once: true })
      })
      return values.country === 'uk' ? ['London', 'Manchester'] : ['Tehran', 'Shiraz']
    },
  },
})
const output = ref('')
</script>

<template>
  <p>A registered phone input and a city select with asynchronous, dependent options.</p>
  <QSchemaForm v-model="form" :fields="fields" @submit="output = JSON.stringify($event, null, 2)">
    <QBtn type="submit" label="Submit" color="primary" class="q-mt-md" />
  </QSchemaForm>
  <pre v-if="output" class="result">{{ output }}</pre>
</template>
