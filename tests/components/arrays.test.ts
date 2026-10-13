import { mount, flushPromises } from '@vue/test-utils'
import { Quasar } from 'quasar'
import { h, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import QSchemaForm from '../../src/components/QSchemaForm.vue'
import { veeValidateAdapter } from '../../src/adapters/vee-validate'
import { required } from '../../src/validation'
import type { FieldArrayDefinition, FormActions, FormValues } from '../../src/types'

const settle = async () => { await flushPromises(); await nextTick() }
const actions = (wrapper: { vm: unknown }) => wrapper.vm as FormActions
const arrays: FieldArrayDefinition<FormValues>[] = [{ path: 'contacts', label: 'Contacts', minItems: 1, maxItems: 3, createItem: () => ({ email: '' }), fields: { email: { type: 'input', validate: required('Email required') } } }]
describe('repeatable groups', () => {
  it.each([undefined, veeValidateAdapter])('moves errors, touched state and stable row keys with each item (%s)', async (stateAdapter) => {
    const wrapper = mount(QSchemaForm, { global: { plugins: [Quasar] }, props: {
      initialValues: { contacts: [{ email: 'a' }, { email: 'b' }] }, arrays, stateAdapter, validateOn: 'submit',
    }, slots: { default: (scope: { touched: unknown; values: unknown }) => h('output', JSON.stringify(scope)) } })
    const firstRow = wrapper.get('[data-row="0"]').element
    await wrapper.get('input[name="contacts.0.email"]').trigger('focusin')
    await wrapper.get('input[name="contacts.0.email"]').trigger('focusout')
    await new Promise((resolve) => setTimeout(resolve, 5))
    actions(wrapper).setErrors({ 'contacts.0.email': 'Error A', 'contacts.1.email': 'Error B', '': 'General' })
    expect(actions(wrapper).moveArrayItem('contacts', 0, 1)).toBe(true)
    await settle()
    expect(wrapper.get('[data-row="1"]').element).toBe(firstRow)
    expect(wrapper.get<HTMLInputElement>('input[name="contacts.1.email"]').element.value).toBe('a')
    expect(JSON.parse(wrapper.get('output').text()).errors).toEqual({ 'contacts.0.email': ['Error B'], 'contacts.1.email': ['Error A'], '': ['General'] })
    expect(wrapper.get('[data-row="1"]').text()).toContain('Error A')
    expect(JSON.parse(wrapper.get('output').text()).touched).toEqual({ 'contacts.1.email': true })
    expect(actions(wrapper).removeArrayItem('contacts', 0)).toBe(true)
    await settle()
    expect(wrapper.get('[data-row="0"]').text()).toContain('Error A')
    expect(wrapper.text()).not.toContain('Error B')
    expect(wrapper.text()).toContain('General')
    expect(actions(wrapper).removeArrayItem('contacts', 0)).toBe(false)
    actions(wrapper).reset()
    await settle()
    expect(wrapper.findAll('[data-row]')).toHaveLength(2)
    expect(JSON.parse(wrapper.get('output').text()).touched).toEqual({})
  })
  it('renders an empty group, adds independent items and enforces limits on validation', async () => {
    const wrapper = mount(QSchemaForm, { global: { plugins: [Quasar] }, props: { initialValues: { contacts: [] }, arrays } })
    expect((await actions(wrapper).validate()).valid).toBe(false)
    expect(wrapper.text()).toContain('At least 1 items')
    await wrapper.get('[data-array] button').trigger('click')
    await settle()
    expect(wrapper.findAll('[data-row]')).toHaveLength(1)
    expect(await actions(wrapper).validateFields(['contacts'])).toBe(false)
    actions(wrapper).setFieldValue('contacts.0.email', 'ada@example.com')
    expect(await actions(wrapper).validateFields(['contacts'])).toBe(true)
    expect(actions(wrapper).appendArrayItem('contacts')).toBe(true)
    expect(actions(wrapper).appendArrayItem('contacts')).toBe(true)
    expect(actions(wrapper).appendArrayItem('contacts')).toBe(false)
    expect(actions(wrapper).moveArrayItem('contacts', -1, 0)).toBe(false)
    expect(actions(wrapper).removeArrayItem('contacts', 9)).toBe(false)
  })
  it('disables array controls for readonly forms', () => {
    const wrapper = mount(QSchemaForm, { global: { plugins: [Quasar] }, props: { initialValues: { contacts: [{ email: '' }] }, arrays, readonly: true } })
    expect(wrapper.findAll('[data-array] button').every((button) => button.attributes('disabled') !== undefined)).toBe(true)
  })
})
