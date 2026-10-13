import { mount, flushPromises } from '@vue/test-utils'
import { QEditor, QFile, QInput, QOptionGroup, QPopupProxy, QRange, QRating, QSlider, Quasar } from 'quasar'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import QSchemaForm from '../../src/components/QSchemaForm.vue'
import type { FormActions } from '../../src/types'

const actions = (wrapper: { vm: unknown }) => wrapper.vm as FormActions
describe('additional Quasar controls', () => {
  // jsdom does not implement the browser editing command API used by QEditor.
  beforeEach(() => { Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) }) })
  it('renders typed controls and forwards their models through the form', async () => {
    const wrapper = mount(QSchemaForm, { global: { plugins: [Quasar] }, props: {
      initialValues: { day: '', time: '', role: 'user', file: null, amount: 10, range: { min: 10, max: 30 }, stars: 2, html: '' },
      fields: { day: { type: 'date' }, time: { type: 'time' }, role: { type: 'radio', options: ['user', 'admin'] },
        file: { type: 'file' }, amount: { type: 'slider' }, range: { type: 'range' }, stars: { type: 'rating', props: { max: 5 } }, html: { type: 'editor' } },
    } })
    expect(wrapper.findAllComponents(QInput)).toHaveLength(2)
    const group = wrapper.getComponent(QOptionGroup)
    expect(group.props('options')).toEqual([{ label: 'user', value: 'user' }, { label: 'admin', value: 'admin' }])
    const file = new File(['hi'], 'cv.pdf', { type: 'application/pdf' })
    for (const [component, value] of [[QSlider, 35], [QRange, { min: 5, max: 70 }], [QRating, 4], [QEditor, '<p>Hello</p>'], [QFile, file], [QOptionGroup, 'admin']] as const) {
      wrapper.getComponent(component).vm.$emit('update:modelValue', value)
      await flushPromises()
    }
    await wrapper.get('input[name="day"]').setValue('2026-10-13')
    await wrapper.get('input[name="time"]').setValue('12:30')
    const result = await actions(wrapper).validate()
    expect(result).toEqual({ valid: true, value: { day: '2026-10-13', time: '12:30', role: 'admin', file, amount: 35, range: { min: 5, max: 70 }, stars: 4, html: '<p>Hello</p>' } })
    actions(wrapper).reset()
    await flushPromises()
    expect(wrapper.getComponent(QFile).props('modelValue')).toBeNull()
    expect(wrapper.getComponent(QEditor).props('modelValue')).toBe('')
  })
  it('honors readonly controls and keeps picker actions disabled', () => {
    const wrapper = mount(QSchemaForm, { global: { plugins: [Quasar] }, props: {
      initialValues: { day: '', time: '', rating: 0, html: '' }, readonly: true,
      fields: { day: { type: 'date' }, time: { type: 'time' }, rating: { type: 'rating' }, html: { type: 'editor' } },
    } })
    expect(wrapper.findAll('.q-field__append button').every((button) => button.attributes('disabled') !== undefined)).toBe(true)
    expect(wrapper.getComponent(QRating).props('disable')).toBe(true)
    expect(wrapper.getComponent(QEditor).props('readonly')).toBe(true)
  })
  it('validates only once when leaving a composite field', async () => {
    const validate = vi.fn(() => 'Choose a role')
    const wrapper = mount(QSchemaForm, { global: { plugins: [Quasar] }, props: {
      initialValues: { role: null }, fields: { role: { type: 'radio', options: ['a', 'b'], validate } },
    } })
    await wrapper.get('[role="radio"]').trigger('focusout')
    await flushPromises()
    expect(validate).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Choose a role')
  })
  it('keeps popup interactions inside the date field validation boundary', async () => {
    const validate = vi.fn(() => 'Date required')
    const wrapper = mount(QSchemaForm, { global: { plugins: [Quasar] }, props: { initialValues: { day: '' }, fields: { day: { type: 'date', validate } } } })
    wrapper.getComponent(QPopupProxy).vm.$emit('beforeShow')
    await wrapper.get('input').trigger('focusout')
    await flushPromises()
    expect(validate).not.toHaveBeenCalled()
    wrapper.getComponent(QPopupProxy).vm.$emit('hide')
    await flushPromises()
    expect(validate).toHaveBeenCalledTimes(1)
  })
})
