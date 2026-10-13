import { flushPromises, mount } from '@vue/test-utils'
import { QCheckbox, QEditor, QFile, QOptionGroup, QRange, QRating, QSelect, QSlider, QToggle, Quasar } from 'quasar'
import { defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import QSchemaForm from '../../src/components/QSchemaForm.vue'
import { veeValidateAdapter } from '../../src/adapters/vee-validate'
import { createFieldRegistry } from '../../src/core/fieldRegistry'
import type { FieldArrayDefinition, FormActions, FormValues, ServerResponse, SubmitContext } from '../../src/types'

const global = { plugins: [Quasar] }
const settle = async () => { await flushPromises(); await nextTick() }
const actions = (wrapper: { vm: unknown }) => wrapper.vm as FormActions
const slots = { default: (scope: Record<string, unknown>) => h('output', JSON.stringify({
  values: scope.values, errors: scope.errors, touched: scope.touched, dirty: scope.dirty,
  loadingValues: scope.loadingValues, loadError: scope.loadError instanceof Error ? scope.loadError.message : scope.loadError,
})) }
const snapshot = (wrapper: { get: (selector: string) => { text: () => string } }) => JSON.parse(wrapper.get('output').text())
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail })
  return { promise, resolve, reject }
}

describe.each([['native', undefined], ['vee-validate', veeValidateAdapter]] as const)('server values with %s state', (_name, stateAdapter) => {
  it('accepts reset values from slots while remaining safe as a button event handler', async () => {
    let reset!: (next?: FormValues | Event) => void
    const wrapper = mount(QSchemaForm, { global, props: { stateAdapter, initialValues: { name: 'Initial' }, fields: { name: { type: 'input' } } },
      slots: { default: (scope: { reset: typeof reset }) => { reset = scope.reset; return h('button', { type: 'button', onClick: scope.reset }, 'Reset') } },
    })
    reset({ name: 'New baseline' })
    actions(wrapper).setFieldValue('name', 'Edited')
    await wrapper.get('button').trigger('click')
    await settle()
    expect(wrapper.get<HTMLInputElement>('input').element.value).toBe('New baseline')
    await wrapper.get('form').trigger('reset')
    await settle()
    expect(wrapper.get<HTMLInputElement>('input').element.value).toBe('New baseline')
    wrapper.unmount()
  })
  it('merges nested patches, replaces arrays and only changes the reset baseline when requested', async () => {
    const validate = vi.fn()
    const wrapper = mount(QSchemaForm, { global, slots, props: { stateAdapter,
      initialValues: { profile: { name: 'Original', city: 'Paris' }, tags: ['a', 'b'], active: true },
      fields: { 'profile.name': { validate }, 'profile.city': { type: 'input' }, active: { type: 'checkbox' } },
    } })
    const api = actions(wrapper)
    api.setValues({ profile: { city: 'Tehran' }, tags: ['c'], active: false })
    await settle()
    expect(snapshot(wrapper).values).toEqual({ profile: { name: 'Original', city: 'Tehran' }, tags: ['c'], active: false })
    expect(snapshot(wrapper).dirty).toBe(true)
    expect(validate).not.toHaveBeenCalled()
    api.reset()
    await settle()
    expect(snapshot(wrapper).values).toEqual({ profile: { name: 'Original', city: 'Paris' }, tags: ['a', 'b'], active: true })

    api.setValues({ profile: { city: 'London' } }, { asInitial: true })
    await settle()
    expect(snapshot(wrapper).dirty).toBe(false)
    api.setFieldValue('profile.city', 'Edited')
    api.reset()
    await settle()
    expect(snapshot(wrapper).values.profile.city).toBe('London')
    api.reset({ profile: { name: 'Replacement', city: 'Rome' }, tags: [], active: false })
    api.setFieldValue('profile.name', 'Local edit')
    api.reset()
    await settle()
    expect(snapshot(wrapper).values).toEqual({ profile: { name: 'Replacement', city: 'Rome' }, tags: [], active: false })
    expect(snapshot(wrapper).dirty).toBe(false)
    wrapper.unmount()
  })

  it('keeps edits made while data loads, fills untouched fields and resets to the server data', async () => {
    const request = deferred<FormValues>()
    const save = vi.fn()
    let signal!: AbortSignal
    const wrapper = mount(QSchemaForm, { global, slots, props: { stateAdapter, submitAction: save,
      initialValues: { profile: { name: '', city: '' }, active: false },
      fields: { 'profile.name': { type: 'input' }, 'profile.city': { type: 'input' }, active: { type: 'checkbox' } },
    } })
    const api = actions(wrapper)
    const loading = api.loadValues((context) => {
      signal = context.signal
      expect(context.values).toEqual({ profile: { name: '', city: '' }, active: false })
      return request.promise
    })
    await settle()
    expect(snapshot(wrapper).loadingValues).toBe(true)
    expect(wrapper.get<HTMLInputElement>('input[name="profile.name"]').attributes('disabled')).toBeUndefined()
    await wrapper.get<HTMLInputElement>('input[name="profile.name"]').setValue('My edit')
    expect(await api.submit()).toBeUndefined()
    expect(save).not.toHaveBeenCalled()
    request.resolve({ profile: { name: 'Server name', city: 'Tehran' }, active: true })
    expect(await loading).toBe(true)
    await settle()
    expect(signal.aborted).toBe(false)
    expect(snapshot(wrapper)).toMatchObject({ values: { profile: { name: 'My edit', city: 'Tehran' }, active: true }, loadingValues: false, dirty: true })
    expect(wrapper.get<HTMLInputElement>('input[name="profile.city"]').element.value).toBe('Tehran')
    api.reset()
    await settle()
    expect(snapshot(wrapper)).toMatchObject({ values: { profile: { name: 'Server name', city: 'Tehran' }, active: true }, dirty: false })
    await api.submit()
    expect(save).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('uses the latest load and ignores a superseded response even when it arrives last', async () => {
    const first = deferred<FormValues>()
    const second = deferred<FormValues>()
    const signals: AbortSignal[] = []
    const wrapper = mount(QSchemaForm, { global, slots, props: { stateAdapter, initialValues: { name: '' }, fields: { name: { type: 'input' } } } })
    const api = actions(wrapper)
    const oldLoad = api.loadValues(({ signal }) => { signals.push(signal); return first.promise })
    const newLoad = api.loadValues(({ signal }) => { signals.push(signal); return second.promise })
    expect(signals[0]!.aborted).toBe(true)
    second.resolve({ name: 'Newest' })
    expect(await newLoad).toBe(true)
    first.resolve({ name: 'Stale' })
    expect(await oldLoad).toBe(false)
    await settle()
    expect(snapshot(wrapper)).toMatchObject({ values: { name: 'Newest' }, dirty: false, loadingValues: false })
    api.setFieldValue('name', 'Local')
    api.reset()
    await settle()
    expect(snapshot(wrapper).values.name).toBe('Newest')
    wrapper.unmount()
  })

  it('keeps the original baseline for edited fields missing from a partial response', async () => {
    const wrapper = mount(QSchemaForm, { global, slots, props: { stateAdapter,
      initialValues: { profile: { name: 'Original', city: 'Paris' } }, fields: { 'profile.name': { type: 'input' }, 'profile.city': { type: 'input' } },
    } })
    const api = actions(wrapper)
    api.setFieldValue('profile.name', 'Local edit')
    expect(await api.loadValues(() => ({ profile: { city: 'London' } }))).toBe(true)
    await settle()
    expect(snapshot(wrapper)).toMatchObject({ values: { profile: { name: 'Local edit', city: 'London' } }, dirty: true })
    api.reset()
    await settle()
    expect(snapshot(wrapper)).toMatchObject({ values: { profile: { name: 'Original', city: 'London' } }, dirty: false })
    api.setFieldValue('profile.name', 'Another edit')
    api.setFieldValue('profile.name', 'Original')
    api.setValues({ profile: { name: 'Server name' } }, { keepDirtyValues: true })
    await settle()
    expect(snapshot(wrapper).values.profile.name).toBe('Server name')
    wrapper.unmount()
  })

  it.each(['cancel', 'reset', 'unmount'] as const)('aborts on %s and does not apply a late response', async (operation) => {
    const request = deferred<FormValues>()
    let signal!: AbortSignal
    const wrapper = mount(QSchemaForm, { global, slots, props: { stateAdapter, initialValues: { name: 'Initial' }, fields: { name: { type: 'input' } } } })
    const api = actions(wrapper)
    const loading = api.loadValues((context) => { signal = context.signal; return request.promise })
    if (operation === 'cancel') api.cancelLoad()
    else if (operation === 'reset') api.reset({ name: 'Reset baseline' })
    else wrapper.unmount()
    expect(signal.aborted).toBe(true)
    const emittedCount = wrapper.emitted('update:modelValue')?.length ?? 0
    request.resolve({ name: 'Too late' })
    expect(await loading).toBe(false)
    await settle()
    expect(wrapper.emitted('update:modelValue')?.length ?? 0).toBe(emittedCount)
    if (operation !== 'unmount') {
      expect(snapshot(wrapper)).toMatchObject({ values: { name: operation === 'reset' ? 'Reset baseline' : 'Initial' }, loadingValues: false })
      wrapper.unmount()
    }
  })

  it('exposes an unexpected load error and recovers on a subsequent successful request', async () => {
    const wrapper = mount(QSchemaForm, { global, slots, props: { stateAdapter, initialValues: { name: '' }, fields: { name: { type: 'input' } } } })
    const failure = new Error('Service unavailable')
    await expect(actions(wrapper).loadValues(() => Promise.reject(failure))).rejects.toBe(failure)
    await settle()
    expect(snapshot(wrapper)).toMatchObject({ values: { name: '' }, loadingValues: false, loadError: 'Service unavailable' })
    expect(await actions(wrapper).loadValues(() => ({ name: 'Recovered' }))).toBe(true)
    await settle()
    expect(snapshot(wrapper).values.name).toBe('Recovered')
    expect(snapshot(wrapper).loadError).toBeFalsy()
    wrapper.unmount()
  })

  it('maps server values and field/form errors through both the form API and submit context', async () => {
    let context!: SubmitContext
    const wrapper = mount(QSchemaForm, { global, slots, props: { stateAdapter,
      initialValues: { email: 'ada@example.com', profile: { city: '' } },
      fields: { email: { type: 'input' }, 'profile.city': { type: 'input' } },
      submitAction: (_values, submission) => {
        context = submission
        submission.applyServerResponse({ values: { profile: { city: 'London' } }, errors: { email: ['Already registered'], '': 'Please review your details' } })
      },
    } })
    await actions(wrapper).submit()
    await settle()
    expect(context.applyServerResponse).toBeTypeOf('function')
    expect(snapshot(wrapper)).toMatchObject({ values: { email: 'ada@example.com', profile: { city: 'London' } }, errors: { email: ['Already registered'], '': ['Please review your details'] } })
    expect(wrapper.get('[role="alert"]').text()).toContain('Please review your details')
    expect(wrapper.text()).toContain('Already registered')
    actions(wrapper).applyServerResponse({ values: { email: 'fixed@example.com' }, errors: { 'profile.city': 'Choose another city' } })
    await settle()
    expect(snapshot(wrapper)).toMatchObject({ values: { email: 'fixed@example.com', profile: { city: 'London' } }, errors: { 'profile.city': ['Choose another city'] } })
    actions(wrapper).reset()
    await settle()
    expect(snapshot(wrapper).errors).toEqual({})
    wrapper.unmount()
  })

  it.each([
    '{"name":"Changed","__proto__":{"polluted":true}}',
    '{"name":"Changed","profile":{"constructor":{"polluted":true}}}',
  ])('rejects unsafe response keys before changing values or errors (%s)', async (json) => {
    const wrapper = mount(QSchemaForm, { global, slots, props: { stateAdapter,
      initialValues: { name: 'Original', profile: { city: 'Paris' } }, fields: { name: { type: 'input' }, 'profile.city': { type: 'input' } },
    } })
    const api = actions(wrapper)
    api.setErrors({ name: 'Existing error' })
    expect(() => api.setValues(JSON.parse(json))).toThrow(/Invalid field path/)
    expect(() => api.applyServerResponse({ values: JSON.parse(json), errors: { name: 'Replacement error' } })).toThrow(/Invalid field path/)
    await settle()
    expect(snapshot(wrapper)).toMatchObject({ values: { name: 'Original', profile: { city: 'Paris' } }, errors: { name: ['Existing error'] }, dirty: false })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect({}).not.toHaveProperty('polluted')
    wrapper.unmount()
  })

  it.each([{ errors: null }, { errors: 'Invalid error record' }, { errors: { name: null } }, { errors: { name: [1] } }])('rejects malformed server errors atomically ($errors)', async ({ errors }) => {
    const wrapper = mount(QSchemaForm, { global, slots, props: { stateAdapter,
      initialValues: { name: 'Original' }, fields: { name: { type: 'input' } },
    } })
    const api = actions(wrapper)
    api.setErrors({ name: 'Existing error' })
    const response = { values: { name: 'Changed' }, errors } as unknown as ServerResponse
    expect(() => api.applyServerResponse(response)).toThrow()
    await settle()
    expect(snapshot(wrapper)).toMatchObject({ values: { name: 'Original' }, errors: { name: ['Existing error'] }, dirty: false })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })

  it('ignores a stale submit response while allowing sequential mutations from the current submit context', async () => {
    const request = deferred<void>()
    let first = true
    const wrapper = mount(QSchemaForm, { global, slots, props: { stateAdapter,
      initialValues: { name: 'Original', note: '' }, fields: { name: { type: 'input' }, note: { type: 'input' } },
      submitAction: async (_values, context) => {
        if (first) {
          first = false
          await request.promise
          context.setValues({ name: 'Stale value' })
          context.applyServerResponse({ values: { note: 'Stale note' }, errors: { name: 'Stale response' } })
          context.setErrors({ '': 'Stale general error' })
          context.reset({ name: 'Stale baseline', note: '' })
          return
        }
        context.setValues({ name: 'Normalized name' })
        context.applyServerResponse({ values: { note: 'Saved note' }, errors: { name: 'Server response' } })
        context.setErrors({ name: 'Review normalized value' })
      },
    } })
    const api = actions(wrapper)
    const submission = api.submit()
    await settle()
    api.setFieldValue('name', 'Newer local value')
    request.resolve()
    await submission
    await settle()
    expect(snapshot(wrapper)).toMatchObject({ values: { name: 'Newer local value', note: '' }, errors: {} })
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.emitted('reset')).toBeUndefined()

    await api.submit()
    await settle()
    expect(snapshot(wrapper)).toMatchObject({ values: { name: 'Normalized name', note: 'Saved note' }, errors: { name: ['Review normalized value'] } })
    expect(wrapper.emitted('submit')).toHaveLength(1)
    wrapper.unmount()
  })

  it('protects a dirty array as a whole and clears indexed state and row identities when replacing it', async () => {
    const arrays: FieldArrayDefinition<FormValues>[] = [{ path: 'contacts', label: 'Contacts', createItem: () => ({ email: '' }), fields: { email: { type: 'input' } } }]
    const wrapper = mount(QSchemaForm, { global, slots, props: { stateAdapter, validateOn: 'submit',
      initialValues: { contacts: [{ email: 'Old A' }, { email: 'Old B' }], note: '' }, arrays, fields: { note: { type: 'input' } },
    } })
    const api = actions(wrapper)
    const originalRow = wrapper.get('[data-row="0"]').element
    await wrapper.get<HTMLInputElement>('input[name="contacts.0.email"]').setValue('Edited A')
    await wrapper.get<HTMLInputElement>('input[name="contacts.0.email"]').trigger('focusin')
    await wrapper.get<HTMLInputElement>('input[name="contacts.0.email"]').trigger('focusout')
    await new Promise((resolve) => setTimeout(resolve, 5))
    api.setErrors({ 'contacts[0].email': 'Old error', note: 'Unrelated' })
    api.setValues({ contacts: [{ email: 'Server A' }], note: 'Remote note' }, { keepDirtyValues: true })
    await settle()
    expect(snapshot(wrapper).values).toEqual({ contacts: [{ email: 'Edited A' }, { email: 'Old B' }], note: 'Remote note' })
    expect(wrapper.get('[data-row="0"]').element).toBe(originalRow)
    expect(snapshot(wrapper).errors['contacts.0.email']).toEqual(['Old error'])
    expect(snapshot(wrapper).touched['contacts.0.email']).toBe(true)

    api.setValues({ contacts: [{ email: 'Server A' }, { email: 'Server B' }] })
    await settle()
    expect(snapshot(wrapper).values.contacts).toEqual([{ email: 'Server A' }, { email: 'Server B' }])
    expect(wrapper.get('[data-row="0"]').element).not.toBe(originalRow)
    expect(snapshot(wrapper).errors).toEqual({ note: ['Unrelated'] })
    expect(snapshot(wrapper).touched).toEqual({})
    wrapper.unmount()
  })
})

describe('shared dynamic values across field controls', () => {
  beforeEach(() => { Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) }) })
  it('updates built-in and registered custom controls through the same values API', async () => {
    const registry = createFieldRegistry()
    const Custom = defineComponent({ props: { modelValue: { type: String, default: '' } }, setup: (props) => () => h('div', { 'data-custom': '' }, props.modelValue) })
    registry.registerField('textarea', Custom)
    const wrapper = mount(QSchemaForm, { global, props: { registry,
      initialValues: { count: 0, active: false, alerts: false, day: '', time: '', role: '', radio: '', file: null, slider: 0, range: { min: 0, max: 10 }, stars: 0, html: '', custom: '' },
      fields: { count: { type: 'number' }, active: { type: 'checkbox' }, alerts: { type: 'toggle' }, day: { type: 'date' }, time: { type: 'time' },
        role: { type: 'select', options: ['admin', 'user'] }, radio: { type: 'radio', options: ['admin', 'user'] }, file: { type: 'file' }, slider: { type: 'slider' }, range: { type: 'range' }, stars: { type: 'rating' }, html: { type: 'editor' }, custom: { type: 'textarea' } },
    } })
    const file = new File(['PDF'], 'cv.pdf', { type: 'application/pdf' })
    actions(wrapper).setValues({ count: 42, active: true, alerts: true, day: '2026-10-13', time: '12:30', role: 'admin', radio: 'user', file,
      slider: 55, range: { min: 3, max: 7 }, stars: 4, html: '<p>From server</p>', custom: 'Custom server value' })
    await settle()
    expect(wrapper.get<HTMLInputElement>('input[name="count"]').element.value).toBe('42')
    expect(wrapper.get<HTMLInputElement>('input[name="day"]').element.value).toBe('2026-10-13')
    expect(wrapper.get<HTMLInputElement>('input[name="time"]').element.value).toBe('12:30')
    for (const [component, value] of [[QCheckbox, true], [QToggle, true], [QSelect, 'admin'], [QOptionGroup, 'user'], [QFile, file], [QSlider, 55], [QRange, { min: 3, max: 7 }], [QRating, 4], [QEditor, '<p>From server</p>']] as const)
      expect(wrapper.getComponent(component).props('modelValue')).toEqual(value)
    expect(wrapper.get('[data-custom]').text()).toBe('Custom server value')
    wrapper.unmount()
  })
})
