import { mount, flushPromises } from '@vue/test-utils'
import { Quasar, QExpansionItem, QInput } from 'quasar'
import { describe, expect, it, vi } from 'vitest'
import * as yup from 'yup'
import FormBuilder from '../../src/compat/FormBuilder.vue'

const settle = async () => { await new Promise((resolve) => setTimeout(resolve, 30)); await flushPromises() }

describe('legacy compatibility entry', () => {
  it('preserves nested sections, localized errors, error expansion, submit values and reset callback', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount(FormBuilder, { global: { plugins: [Quasar] }, props: {
      schema: yup.object({
        introduction: yup.string().label('Introduction').meta({ type: 'singleInput' }),
        profile: yup.object({ name: yup.string().label('Name').required('نام الزامی است').meta({ direction: 'rtl' }) }).label('Profile').meta({ type: 'input' }),
        notes: yup.string().meta({ type: 'textarea' }),
      }),
      sectionStructure: true,
      initialValues: { introduction: 'Hello', profile: { name: '' }, notes: 'Notes' },
      inputProps: { dense: true }, customClass: 'legacy-layout', onSubmit,
    }, slots: { default: '<button type="submit">Save</button>' } })
    const section = wrapper.findAllComponents(QExpansionItem)[1]!
    expect(section.props('modelValue')).toBe(false)
    await wrapper.get('form').trigger('submit')
    await settle()
    expect(section.props('modelValue')).toBe(true)
    expect(wrapper.text()).toContain('نام الزامی است')
    expect(onSubmit).not.toHaveBeenCalled()
    const input = wrapper.findAllComponents(QInput).find((input) => input.props('label') === 'Name')!
    expect(input.get('input').attributes('dir')).toBe('rtl')
    expect(input.props('dense')).toBe(true)
    await input.get('input').setValue('Ada')
    await wrapper.get('form').trigger('submit')
    await settle()
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ profile: { name: 'Ada' }, introduction: 'Hello', notes: 'Notes' })
    const reset = onSubmit.mock.calls[0]?.[1] as () => void
    reset()
    await settle()
    expect(input.get('input').element.value).toBe('')
    expect(wrapper.text()).not.toContain('نام الزامی است')
    expect(wrapper.find('.legacy-layout').exists()).toBe(true)
  })
})
