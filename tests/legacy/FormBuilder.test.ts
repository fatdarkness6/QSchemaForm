import { mount, flushPromises } from '@vue/test-utils'
import { Quasar, QForm, QInput, QExpansionItem } from 'quasar'
import { describe, expect, it, vi } from 'vitest'
import * as yup from 'yup'
// The original file is deliberately kept outside the strict library compilation.
import FormBuilder from '../../FormBuilder.vue?legacy'

const global = { plugins: [Quasar], components: { QForm, QInput, QExpansionItem } }
const settle = async () => { await new Promise((resolve) => setTimeout(resolve, 30)); await flushPromises() }

describe('original FormBuilder behavioral reference', () => {
  it('renders schema labels, input types, initial values and the default slot', async () => {
    const wrapper = mount(FormBuilder, {
      global,
      props: {
        schema: yup.object({
          email: yup.string().label('Email').meta({ type: 'email' }),
          biography: yup.string().label('Biography').meta({ type: 'textarea' }),
        }),
        initialValues: { email: 'old@example.com', biography: 'Hello' },
        onSubmit: vi.fn(),
        direction: 'rtl',
        customClass: 'my-form',
      },
      slots: { default: '<button type="submit">Save</button>' },
    })
    await settle()
    expect(wrapper.find<HTMLInputElement>('input[type="email"]').element.value).toBe('old@example.com')
    expect(wrapper.find('textarea').element.value).toBe('Hello')
    expect(wrapper.text()).toContain('Email')
    expect(wrapper.find('.my-form').exists()).toBe(true)
    expect(wrapper.find('input').attributes('dir')).toBe('rtl')
    expect(wrapper.find('button').text()).toBe('Save')
  })

  it('validates on submit, displays supplied localized messages, submits edits and resets', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount(FormBuilder, {
      global,
      props: {
        schema: yup.object({ email: yup.string().required('ایمیل الزامی است').email('Invalid email') }),
        initialValues: { email: '' },
        onSubmit,
      },
    })
    await settle()
    expect(wrapper.text()).not.toContain('ایمیل الزامی است')
    await wrapper.find('form').trigger('submit')
    await settle()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('ایمیل الزامی است')
    await wrapper.find('input').setValue('new@example.com')
    await wrapper.find('form').trigger('submit')
    await settle()
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ email: 'new@example.com' })
    const reset = onSubmit.mock.calls[0]?.[1] as () => void
    reset()
    await settle()
    expect(wrapper.find('input').element.value).toBe('')
    expect(wrapper.text()).not.toContain('ایمیل الزامی است')
  })

  it('maps nested values and opens collapsed sections containing validation errors', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount(FormBuilder, {
      global,
      props: {
        sectionStructure: true,
        schema: yup.object({
          introduction: yup.string().label('Introduction').meta({ type: 'singleInput' }),
          profile: yup.object({
            name: yup.string().required('Name required').label('Name').meta({ direction: 'rtl' }),
          }).label('Profile').meta({ type: 'input' }),
          notes: yup.string().label('Notes').meta({ type: 'textarea' }),
        }),
        initialValues: { introduction: 'Hello', profile: { name: '' }, notes: 'Notes' },
        onSubmit,
      },
    })
    await settle()
    const section = wrapper.findAllComponents(QExpansionItem)[1]!
    expect(section.props('modelValue')).not.toBe(true)
    await wrapper.find('form').trigger('submit')
    await settle()
    expect(section.props('modelValue')).toBe(true)
    expect(wrapper.text()).toContain('Name required')
    const nested = wrapper.findAllComponents(QInput).find((input) => input.props('label') === 'Name')!
    expect(nested.find('input').attributes('dir')).toBe('rtl')
    await nested.find('input').setValue('Ada')
    await wrapper.find('form').trigger('submit')
    await settle()
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ profile: { name: 'Ada' }, notes: 'Notes' })
  })
})
