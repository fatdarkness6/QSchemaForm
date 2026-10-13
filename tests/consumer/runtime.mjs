import assert from 'node:assert/strict'
import * as core from 'q-schema-form'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { Quasar } from 'quasar'

assert.equal(typeof core.QSchemaForm, 'object')
assert.equal(typeof core.QSchemaWizard, 'object')
assert.equal((await import('q-schema-form/wizard')).QSchemaWizard, core.QSchemaWizard)
assert.equal(core.required()('', { values: {}, getValue: () => undefined }), 'This field is required')
assert.equal(typeof core.createQSchemaForm, 'function')
assert.equal(core.yupAdapter, undefined)
assert.equal(core.zodAdapter, undefined)
assert.equal(core.veeValidateAdapter, undefined)
const context = { req: { headers: {} } }
const app = createSSRApp({ render: () => h(core.QSchemaForm, { modelValue: { name: 'Ada' }, fields: { name: { type: 'input', label: 'Name' } } }) })
app.use(Quasar, {}, context)
const html = await renderToString(app, context)
assert.match(html, /Ada/)
assert.match(html, /Name/)

const advancedContext = { req: { headers: {} } }
const advancedApp = createSSRApp({ render: () => h(core.QSchemaForm, {
  initialValues: { day: '2026-10-13', time: '12:30', role: 'reader', file: null, slider: 20, range: { min: 10, max: 50 }, rating: 3, editor: '<p>Biography</p>' },
  fields: { day: { type: 'date' }, time: { type: 'time' }, role: { type: 'radio', options: ['reader', 'writer'] }, file: { type: 'file' }, slider: { type: 'slider' }, range: { type: 'range' }, rating: { type: 'rating' }, editor: { type: 'editor' } },
}) })
advancedApp.use(Quasar, {}, advancedContext)
const advancedHtml = await renderToString(advancedApp, advancedContext)
assert.match(advancedHtml, /2026-10-13/)
assert.match(advancedHtml, /Biography/)

const wizardContext = { req: { headers: {} } }
const wizardApp = createSSRApp({ render: () => h(core.QSchemaWizard, {
  steps: [{ key: 'account', label: 'Account' }, { key: 'profile', label: 'Profile' }],
  initialValues: { name: 'Ada', contacts: [{ email: '' }] },
  fields: { name: { type: 'input', step: 'account' } },
  arrays: [{ path: 'contacts', label: 'Contacts', step: 'profile', createItem: () => ({ email: '' }), fields: { email: { type: 'input' } } }],
}) })
wizardApp.use(Quasar, {}, wizardContext)
const wizardHtml = await renderToString(wizardApp, wizardContext)
assert.match(wizardHtml, /Ada/)
assert.match(wizardHtml, /Next/)
assert.doesNotMatch(wizardHtml, /data-array="contacts"/)

if (process.argv.includes('--adapters')) {
  const { yupAdapter } = await import('q-schema-form/yup')
  const { zodAdapter } = await import('q-schema-form/zod')
  const { veeValidateAdapter } = await import('q-schema-form/vee-validate')
  const yup = await import('yup')
  const { z } = await import('zod')
  assert.equal((await yupAdapter(yup.object({ name: yup.string().required() })).validate({ name: 'Ada' })).valid, true)
  assert.equal((await zodAdapter(z.object({ name: z.string() })).validate({ name: 'Ada' })).valid, true)
  assert.equal(typeof veeValidateAdapter, 'function')
} else {
  for (const name of ['yup', 'zod', 'vee-validate', ...(process.argv.includes('--phone') ? [] : ['libphonenumber-js'])]) {
    await assert.rejects(import(name), { code: 'ERR_MODULE_NOT_FOUND' })
  }
}
if (process.argv.includes('--phone')) {
  const { QPhoneField, isValidPhoneNumber } = await import('q-schema-form/phone')
  assert.equal(isValidPhoneNumber('+989121234567'), true)
  const phoneContext = { req: { headers: {} } }
  const phoneApp = createSSRApp({ render: () => h(QPhoneField, { modelValue: '+989121234567', defaultCountry: 'IR' }) })
  phoneApp.use(Quasar, {}, phoneContext)
  const phoneHtml = await renderToString(phoneApp, phoneContext)
  assert.match(phoneHtml, /912 123 4567/)
  assert.match(phoneHtml, /Country code/)
}
console.log('Packed consumer imports and server rendering passed.')
