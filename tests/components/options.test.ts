import { mount, flushPromises } from '@vue/test-utils'
import { Quasar, QSelect } from 'quasar'
import { describe, expect, it, vi } from 'vitest'
import QSchemaForm from '../../src/components/QSchemaForm.vue'
import type { FieldContext, FormActions, SelectOption } from '../../src/types'

describe('dynamic fields', () => {
  it('reloads dependent options, aborts previous requests and ignores stale results', async () => {
    const pending: { resolve: (options: SelectOption[]) => void; signal: AbortSignal }[] = []
    const options = vi.fn((_context: FieldContext, signal: AbortSignal) => new Promise<SelectOption[]>((resolve) => pending.push({ resolve, signal })))
    const wrapper = mount(QSchemaForm, { global: { plugins: [Quasar] }, props: {
      modelValue: { country: 'uk', city: '', unrelated: '' }, fields: { city: { type: 'select', options, dependencies: ['country'] } },
    } })
    expect(wrapper.findComponent(QSelect).props('loading')).toBe(true)
    await wrapper.setProps({ modelValue: { country: 'uk', city: '', unrelated: 'changed' } })
    expect(options).toHaveBeenCalledTimes(1)
    await wrapper.setProps({ modelValue: { country: 'ir', city: '', unrelated: 'changed' } })
    expect(pending[0]?.signal.aborted).toBe(true)
    pending[1]!.resolve(['Tehran'])
    await flushPromises()
    pending[0]!.resolve(['London'])
    await flushPromises()
    expect(wrapper.findComponent(QSelect).props('options')).toEqual(['Tehran'])
    expect(wrapper.findComponent(QSelect).props('loading')).toBe(false)
  })

  it('reports option-loading errors and keeps the select usable for recovery', async () => {
    const wrapper = mount(QSchemaForm, { global: { plugins: [Quasar] }, props: {
      fields: { city: { type: 'select', options: async () => { throw new Error('Unavailable') } } },
    } })
    await flushPromises()
    expect(wrapper.text()).toContain('Unable to load options')
    expect(wrapper.emitted('error')).toHaveLength(1)
    expect(wrapper.findComponent(QSelect).props('loading')).toBe(false)
  })

  it('supports conditional visibility, field validation and form-level errors', async () => {
    const wrapper = mount(QSchemaForm, { global: { plugins: [Quasar] }, props: {
      modelValue: { show: false, name: '' }, fields: {
        name: { type: 'input', hidden: ({ values }) => !values.show, validate: (value) => value ? undefined : 'Name required' },
      },
    } })
    expect(wrapper.find('input').exists()).toBe(false)
    expect(await (wrapper.vm as unknown as FormActions).validate()).toMatchObject({ valid: false })
    await wrapper.setProps({ modelValue: { show: true, name: '' } })
    expect(wrapper.find('input').exists()).toBe(true)
    ;(wrapper.vm as unknown as FormActions).setErrors({ '': 'Unable to save' })
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Unable to save')
  })

  it('honors disabled, readonly and external loading state', async () => {
    const wrapper = mount(QSchemaForm, { global: { plugins: [Quasar] }, props: { fields: { name: { type: 'input' } }, disabled: true } })
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
    expect(await (wrapper.vm as unknown as FormActions).submit()).toBeUndefined()
    await wrapper.setProps({ disabled: false, readonly: true })
    expect(wrapper.get('input').attributes('readonly')).toBeDefined()
    await wrapper.setProps({ readonly: false, loading: true })
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
    expect(wrapper.get('form').attributes('aria-busy')).toBe('true')
  })
})
