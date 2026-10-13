import { mount, flushPromises } from '@vue/test-utils'
import { Quasar } from 'quasar'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import QSchemaWizard from '../../src/components/QSchemaWizard.vue'
import { required, asyncCheck } from '../../src/validation'
import { veeValidateAdapter } from '../../src/adapters/vee-validate'
import type { FieldMap, FormValues, WizardActions } from '../../src/types'

const settle = async () => { await flushPromises(); await nextTick() }
const actions = (wrapper: { vm: unknown }) => wrapper.vm as WizardActions
const steps = [{ key: 'account', label: 'Account' }, { key: 'profile', label: 'Profile' }]
const fields: FieldMap<FormValues> = { email: { type: 'input', step: 'account', validate: required('Email required') }, name: { type: 'input', step: 'profile', validate: required('Name required') } }
describe('wizard', () => {
  it.each([undefined, veeValidateAdapter])('guards forward navigation, retains values on back and resets the original snapshot (%s)', async (stateAdapter) => {
    const wrapper = mount(QSchemaWizard, { global: { plugins: [Quasar] }, props: { steps, fields, initialValues: { email: '', name: '' }, stateAdapter } })
    expect(wrapper.find('input[name="name"]').exists()).toBe(false)
    expect(await actions(wrapper).nextStep()).toBe(false)
    expect(wrapper.text()).toContain('Email required')
    expect(wrapper.text()).not.toContain('Name required')
    actions(wrapper).setFieldValue('email', 'ada@example.com')
    expect(await actions(wrapper).nextStep()).toBe(true)
    await settle()
    await wrapper.get('input[name="name"]').setValue('Ada')
    expect(actions(wrapper).previousStep()).toBe(true)
    await settle()
    expect(wrapper.get<HTMLInputElement>('input[name="email"]').element.value).toBe('ada@example.com')
    await actions(wrapper).nextStep()
    await settle()
    expect(wrapper.get<HTMLInputElement>('input[name="name"]').element.value).toBe('Ada')
    expect((await actions(wrapper).submit())?.valid).toBe(true)
    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({ email: 'ada@example.com', name: 'Ada' })
    actions(wrapper).reset()
    await settle()
    expect(wrapper.get('[aria-current="step"]').text()).toContain('Account')
    expect(wrapper.get('input').element.value).toBe('')
  })
  it('validates every step at submission and reveals the earliest invalid step', async () => {
    const save = vi.fn()
    const wrapper = mount(QSchemaWizard, { global: { plugins: [Quasar] }, props: { steps, fields,
      initialValues: { email: 'ada@example.com', name: 'Ada' }, schema: z.object({ email: z.string().email(), name: z.string().min(1) }), submitAction: save,
    } })
    expect(await actions(wrapper).nextStep()).toBe(true)
    actions(wrapper).setFieldValue('email', 'bad')
    expect((await actions(wrapper).submit())?.valid).toBe(false)
    await settle()
    expect(wrapper.get('[aria-current="step"]').text()).toContain('Account')
    expect(save).not.toHaveBeenCalled()
    expect(wrapper.emitted('invalid')).toHaveLength(1)
  })
  it('treats Enter on an earlier step as Next, without saving', async () => {
    const save = vi.fn()
    const wrapper = mount(QSchemaWizard, { global: { plugins: [Quasar] }, props: { steps, fields, initialValues: { email: 'ada', name: 'Ada' }, submitAction: save } })
    await wrapper.get('form').trigger('submit')
    await settle()
    expect(wrapper.get('[aria-current="step"]').text()).toContain('Profile')
    expect(save).not.toHaveBeenCalled()
  })
  it('cancels a superseded server check and blocks duplicate navigation', async () => {
    let finish!: (valid: boolean) => void
    let signal: AbortSignal | undefined
    const wrapper = mount(QSchemaWizard, { global: { plugins: [Quasar] }, props: { steps, initialValues: { email: 'taken', name: '' }, fields: {
      ...fields, email: { type: 'input', step: 'account', validate: asyncCheck((_value, context) => { signal = context.signal; return new Promise((resolve) => { finish = resolve }) }, 'Taken') },
    } } })
    const pending = actions(wrapper).nextStep()
    await settle()
    expect(await actions(wrapper).nextStep()).toBe(false)
    actions(wrapper).setFieldValue('email', 'changed')
    expect(signal?.aborted).toBe(true)
    finish(false)
    expect(await pending).toBe(false)
    expect(wrapper.text()).not.toContain('Taken')
  })
})
