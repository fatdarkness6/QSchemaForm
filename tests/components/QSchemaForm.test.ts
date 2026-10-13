import { mount, flushPromises } from '@vue/test-utils'
import { Quasar, QInput, QSelect, QCheckbox, QToggle, QExpansionItem } from 'quasar'
import { defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import QSchemaForm from '../../src/components/QSchemaForm.vue'
import { createQSchemaForm } from '../../src/core/plugin'
import { createFieldRegistry } from '../../src/core/fieldRegistry'
import { zodAdapter } from '../../src/adapters/zod'
import { veeValidateAdapter } from '../../src/adapters/vee-validate'
import type { FormActions, FormValues } from '../../src/types'

const global = { plugins: [Quasar] }
const settle = async () => { await flushPromises(); await nextTick() }
const actions = (wrapper: { vm: unknown }) => wrapper.vm as FormActions

describe('QSchemaForm public behavior', () => {
  it('renders built-in controls and emits numeric, boolean and nested edits', async () => {
    const wrapper = mount(QSchemaForm, { global, props: {
      modelValue: { profile: { name: 'Ada' }, age: 30, role: 'user', active: true, notifications: false, bio: '' },
      fields: {
        'profile.name': { type: 'input', label: 'Name' }, age: { type: 'number' },
        role: { type: 'select', options: [{ label: 'User', value: 'user' }] },
        active: { type: 'checkbox' }, notifications: { type: 'toggle' }, bio: { type: 'textarea' },
      },
    } })
    expect(wrapper.findAllComponents(QInput)).toHaveLength(3)
    expect(wrapper.findComponent(QSelect).exists()).toBe(true)
    expect(wrapper.findComponent(QCheckbox).exists()).toBe(true)
    expect(wrapper.findComponent(QToggle).exists()).toBe(true)
    await wrapper.get<HTMLInputElement>('input[name="age"]').setValue('42')
    expect(wrapper.emitted('field-change')?.at(-1)?.[0]).toMatchObject({ path: 'age', value: 42 })
    await wrapper.get('input[name="profile.name"]').setValue('Grace')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toMatchObject({ profile: { name: 'Grace' }, age: 42 })
  })

  it('synchronizes parent updates and emits updates once without mutating props', async () => {
    const model = ref({ name: 'Ada' })
    const changes = vi.fn()
    const host = mount(defineComponent({ setup: () => () => h(QSchemaForm, {
      modelValue: model.value, fields: { name: { type: 'input' } },
      'onUpdate:modelValue': (value: FormValues) => { changes(); model.value = value as { name: string } },
    }) }), { global })
    await host.get('input').setValue('Grace')
    expect(model.value.name).toBe('Grace')
    expect(changes).toHaveBeenCalledTimes(1)
    model.value = { name: 'Lin' }
    await settle()
    expect(host.get('input').element.value).toBe('Lin')
    expect(changes).toHaveBeenCalledTimes(1)
  })

  it('displays errors, prevents invalid submit, submits transformed output and resets', async () => {
    const wrapper = mount(QSchemaForm<{ name: string }>, { global, props: {
      modelValue: { name: '' }, schema: zodAdapter(z.object({ name: z.string().min(1, 'Name required').transform((name) => name.trim()) })),
    } })
    await actions(wrapper).submit()
    expect(wrapper.emitted('submit')).toBeUndefined()
    await settle()
    expect(wrapper.text()).toContain('Name required')
    await wrapper.get('input').setValue(' Ada ')
    await actions(wrapper).submit()
    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({ name: 'Ada' })
    expect(wrapper.get('input').element.value).toBe(' Ada ')
    actions(wrapper).reset()
    await settle()
    expect(wrapper.get('input').element.value).toBe('')
    expect(wrapper.text()).not.toContain('Name required')
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })

  it.each([undefined, veeValidateAdapter])('shows only the blurred field error until submit with state adapter %s', async (stateAdapter) => {
    const wrapper = mount(QSchemaForm<{ email: string; name: string; profile: { city: string } }>, { global, props: {
      modelValue: { email: '', name: '', profile: { city: '' } },
      schema: zodAdapter(z.object({
        email: z.string().email('Email invalid'), name: z.string().min(1, 'Name required'),
        profile: z.object({ city: z.string().min(1, 'City required') }),
      })),
      fields: { 'profile.city': { section: 'profile' } },
      sections: [{ key: 'profile', label: 'Profile', defaultOpened: false }], stateAdapter,
    }, slots: { default: (scope: { errors: unknown }) => h('output', JSON.stringify(scope.errors)) } })
    const errors = () => JSON.parse(wrapper.get('output').text())
    const blur = async (path: string) => {
      const input = wrapper.findAllComponents(QInput).find((input) => input.props('name') === path)!
      input.vm.$emit('blur')
      await settle()
    }

    await blur('email')
    expect(errors()).toEqual({ email: ['Email invalid'] })
    expect(wrapper.getComponent(QExpansionItem).props('modelValue')).toBe(false)
    await blur('name')
    expect(errors()).toEqual({ email: ['Email invalid'], name: ['Name required'] })
    await wrapper.get('input[name="email"]').setValue('ada@example.com')
    await settle()
    expect(errors()).toEqual({ name: ['Name required'] })
    expect(wrapper.getComponent(QExpansionItem).props('modelValue')).toBe(false)

    await actions(wrapper).submit()
    await settle()
    expect(errors()).toEqual({ name: ['Name required'], 'profile.city': ['City required'] })
    expect(wrapper.getComponent(QExpansionItem).props('modelValue')).toBe(true)
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('scopes change validation while preserving cross-field rules and unrelated errors', async () => {
    const otherValidator = vi.fn(() => 'Custom other error')
    const confirmationValidator = vi.fn(() => undefined)
    const wrapper = mount(QSchemaForm<{ password: string; confirmation: string; other: string }>, { global, props: {
      modelValue: { password: 'secret', confirmation: '', other: '' }, validateOn: 'change',
      schema: zodAdapter(z.object({ password: z.string(), confirmation: z.string(), other: z.string().min(1, 'Other required') })
        .refine((values) => values.password === values.confirmation, { path: ['confirmation'], message: 'Passwords must match' })),
      fields: { confirmation: { validate: confirmationValidator }, other: { validate: otherValidator } },
    }, slots: { default: (scope: { errors: unknown }) => h('output', JSON.stringify(scope.errors)) } })
    const errors = () => JSON.parse(wrapper.get('output').text())
    await wrapper.get('input[name="confirmation"]').setValue('wrong')
    await settle()
    expect(errors()).toEqual({ confirmation: ['Passwords must match'] })
    expect(confirmationValidator).toHaveBeenCalledTimes(1)
    expect(otherValidator).not.toHaveBeenCalled()

    actions(wrapper).setErrors({ confirmation: ['First', 'Second'], other: ['Existing error'], '': ['Server error'] })
    await wrapper.get('input[name="confirmation"]').setValue('secret')
    await settle()
    expect(errors()).toEqual({ other: ['Existing error'], '': ['Server error'] })

    await actions(wrapper).validate()
    await settle()
    expect(errors()).toEqual({ other: ['Other required', 'Custom other error'] })
    expect(otherValidator).toHaveBeenCalledTimes(1)
  })

  it('localizes fields through configuration and supports scoped custom registration', async () => {
    const forms = createQSchemaForm({ translate: (key) => ({ name: 'نام' })[key] ?? key, defaultFieldProps: { outlined: true } })
    const custom = defineComponent({ props: { modelValue: { type: String, default: '' }, label: { type: String, default: '' } }, emits: ['update:modelValue'], setup: (props, { emit }) => () => h('button', { type: 'button', onClick: () => emit('update:modelValue', 'custom') }, props.label) })
    forms.registerField('input', custom)
    const wrapper = mount(QSchemaForm, { global: { plugins: [Quasar, forms] }, props: { modelValue: { name: '' }, fields: { name: { type: 'input' } } } })
    expect(wrapper.text()).toBe('نام')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual({ name: 'custom' })
    expect(createFieldRegistry().resolve('input')).not.toBe(custom)
  })

  it('awaits submission work, disables controls, prevents duplicate submits and restores state', async () => {
    let finish!: () => void
    const submitAction = vi.fn(() => new Promise<void>((resolve) => { finish = resolve }))
    const wrapper = mount(QSchemaForm, { global, props: { modelValue: { name: 'Ada' }, fields: { name: { type: 'input' } }, submitAction } })
    const pending = actions(wrapper).submit()
    await settle()
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
    await actions(wrapper).submit()
    expect(submitAction).toHaveBeenCalledTimes(1)
    finish()
    await pending
    await settle()
    expect(wrapper.get('input').attributes('disabled')).toBeUndefined()
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('discards async errors for a changed model and prevents stale submissions', async () => {
    let finish!: (value: { valid: false; issues: { path: string[]; message: string }[] }) => void
    const wrapper = mount(QSchemaForm, { global, props: {
      modelValue: { name: 'old' }, fields: { name: { type: 'input' } },
      schema: { validate: () => new Promise((resolve) => { finish = resolve }) },
    } })
    const pending = actions(wrapper).submit()
    await wrapper.setProps({ modelValue: { name: 'new' } })
    finish({ valid: false, issues: [{ path: ['name'], message: 'Stale error' }] })
    await pending
    await settle()
    expect(wrapper.text()).not.toContain('Stale error')
    expect(wrapper.emitted('invalid')).toBeUndefined()
  })

  it.each([undefined, veeValidateAdapter])('exposes errors, touched/dirty state and reset with state adapter %s', async (stateAdapter) => {
    const wrapper = mount(QSchemaForm, { global, props: {
      modelValue: { profile: { name: 'Ada' } }, fields: { 'profile.name': { type: 'input' } }, stateAdapter, validateOn: 'submit',
    }, slots: { default: (scope: { dirty: boolean; touched: Record<string, boolean> }) => h('output', `${scope.dirty}:${Boolean(scope.touched['profile.name'])}`) } })
    await wrapper.get('input').setValue('Grace')
    await wrapper.get('input').trigger('focusin')
    await wrapper.get('input').trigger('focusout')
    await new Promise((resolve) => setTimeout(resolve, 5))
    await settle()
    expect(wrapper.get('output').text()).toBe('true:true')
    actions(wrapper).setErrors({ 'profile.name': 'Server error' })
    await settle()
    expect(wrapper.text()).toContain('Server error')
    actions(wrapper).reset()
    await settle()
    expect(wrapper.get('input').element.value).toBe('Ada')
    expect(wrapper.get('output').text()).toBe('false:false')
    expect(wrapper.text()).not.toContain('Server error')
  })

  it.each(['native', 'vee'] as const)('retains multiple server errors on edit and clears untouched errors on reset (%s)', async (kind) => {
    const wrapper = mount(QSchemaForm, { global, props: {
      modelValue: { name: 'Ada' }, fields: { name: { type: 'input' } },
      stateAdapter: kind === 'vee' ? veeValidateAdapter : undefined, validateOn: 'submit',
    }, slots: { default: (scope: { errors: unknown }) => h('output', JSON.stringify(scope.errors)) } })
    actions(wrapper).setErrors({ name: ['First', 'Second'], '': 'Server error' })
    actions(wrapper).setFieldValue('name', 'Grace')
    await settle()
    expect(JSON.parse(wrapper.get('output').text())).toEqual({ name: ['First', 'Second'], '': ['Server error'] })
    actions(wrapper).reset()
    await settle()
    expect(JSON.parse(wrapper.get('output').text())).toEqual({})
  })
})
