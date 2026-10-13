import { flushPromises, mount } from '@vue/test-utils'
import { QInput, QSelect, QSlider, Quasar } from 'quasar'
import { defineComponent, h } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import QSchemaForm from '../../src/components/QSchemaForm.vue'
import { createQSchemaForm } from '../../src/core/plugin'
import { normalizeForm } from '../../src/core/normalizeForm'
import { resolveFieldProps } from '../../src/core/fieldProps'
import type { FieldContext, FormActions, FormValues, SchemaAdapter, SelectOption } from '../../src/types'

const global = { plugins: [Quasar] }

describe('remote dropdowns and reactive field props', () => {
  it('loads remote matches when typing into the actual Quasar dropdown input', async () => {
    // jsdom has no element scrolling; Quasar's options list scrolls after filtering.
    const scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo')
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() })
    const options = vi.fn(async ({ query }: FieldContext) => query ? [{ label: 'London', value: 'london' }] : [])
    const wrapper = mount(QSchemaForm, { attachTo: document.body, global, props: {
      modelValue: { city: null }, fields: { city: { type: 'select', options, dependencies: [], props: { useInput: true, inputDebounce: 0 } } },
    } })
    try {
      await flushPromises()
      const input = wrapper.get('input')
      await input.trigger('focusin')
      await input.setValue('lon')
      await vi.waitFor(() => expect(options.mock.calls.at(-1)?.[0].query).toBe('lon'))
      await flushPromises()
      expect(wrapper.getComponent(QSelect).props('options')).toEqual([{ label: 'London', value: 'london' }])
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    } finally {
      wrapper.unmount()
      if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollTo', scrollDescriptor)
      else Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
    }
  })

  it('passes search text to the loader, aborts old searches and completes only the newest filter', async () => {
    const pending: { query?: string; signal: AbortSignal; resolve: (options: SelectOption[]) => void; reject: (error: Error) => void }[] = []
    const options = vi.fn((context: FieldContext, signal: AbortSignal) => new Promise<SelectOption[]>((resolve, reject) => {
      pending.push({ query: context.query, signal, resolve, reject })
    }))
    const wrapper = mount(QSchemaForm, { global, props: {
      modelValue: { city: null }, fields: { city: { type: 'select', options, dependencies: [], props: { useInput: true, inputDebounce: 0 } } },
    } })
    const select = wrapper.getComponent(QSelect)
    expect(pending[0]?.query).toBe('')
    pending[0]!.resolve([])
    await flushPromises()

    const oldDone = vi.fn()
    const oldAbort = vi.fn()
    const newDone = vi.fn((update: () => void) => update())
    const newAbort = vi.fn()
    select.vm.$emit('filter', 'lon', oldDone, oldAbort)
    select.vm.$emit('filter', 'teh', newDone, newAbort)
    expect(pending[1]?.query).toBe('lon')
    expect(pending[1]?.signal.aborted).toBe(true)
    expect(oldAbort).toHaveBeenCalledTimes(1)
    expect(pending[2]?.query).toBe('teh')
    pending[2]!.resolve([{ label: 'Tehran', value: 'tehran' }])
    await flushPromises()
    expect(newDone).toHaveBeenCalledTimes(1)
    expect(newAbort).not.toHaveBeenCalled()
    expect(select.props('options')).toEqual([{ label: 'Tehran', value: 'tehran' }])
    expect(select.props('loading')).toBe(false)
    pending[1]!.reject(new Error('Late old failure'))
    await flushPromises()
    expect(oldDone).not.toHaveBeenCalled()
    expect(wrapper.emitted('error')).toBeUndefined()
    expect(select.props('options')).toEqual([{ label: 'Tehran', value: 'tehran' }])
  })

  it('retains the search and finishes filtering when dependencies change during an outstanding request', async () => {
    const pending: { context: FieldContext; signal: AbortSignal; resolve: (options: SelectOption[]) => void }[] = []
    const options = (context: FieldContext, signal: AbortSignal) => new Promise<SelectOption[]>((resolve) => pending.push({ context, signal, resolve }))
    const wrapper = mount(QSchemaForm, { global, props: {
      modelValue: { country: 'GB', city: null }, fields: { city: { type: 'select', options, dependencies: ['country'], props: { useInput: true } } },
    } })
    pending[0]!.resolve([])
    await flushPromises()
    const done = vi.fn()
    const abort = vi.fn()
    wrapper.getComponent(QSelect).vm.$emit('filter', 'a', done, abort)
    await wrapper.setProps({ modelValue: { country: 'IR', city: null } })
    expect(pending[1]?.signal.aborted).toBe(true)
    // The old loader's values stay consistent, including getValue after an await.
    expect(pending[1]?.context.getValue('country')).toBe('GB')
    expect(pending[2]?.context.query).toBe('a')
    expect(pending[2]?.context.getValue('country')).toBe('IR')
    pending[2]!.resolve(['Ahvaz'])
    await flushPromises()
    expect(done).toHaveBeenCalledTimes(1)
    expect(abort).not.toHaveBeenCalled()
    expect(wrapper.getComponent(QSelect).props('options')).toEqual(['Ahvaz'])
    // No need for an aborted loader that ignores its signal to ever settle.
  })

  it('shows server failures and lets the same search retry without changing the selected model', async () => {
    let fail = false
    const options = vi.fn(async ({ query }: FieldContext) => {
      if (fail) throw new Error('Temporary outage')
      return [{ label: query ? 'London' : 'Saved city', value: 'london' }]
    })
    const wrapper = mount(QSchemaForm, { global, props: {
      modelValue: { city: 'london' }, fields: { city: { type: 'select', options, dependencies: [], props: { useInput: true, noOptionPrefetch: true } } },
    } })
    await flushPromises()
    const select = wrapper.getComponent(QSelect)
    fail = true
    const aborted = vi.fn()
    select.vm.$emit('filter', 'lon', vi.fn(), aborted)
    await flushPromises()
    expect(aborted).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Unable to load options')
    expect(wrapper.emitted('error')).toHaveLength(1)
    expect(select.props('modelValue')).toBe('london')

    fail = false
    const done = vi.fn()
    select.vm.$emit('filter', 'lon', done, vi.fn())
    await flushPromises()
    expect(done).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).not.toContain('Unable to load options')
    expect(select.props('options')).toEqual([{ label: 'London', value: 'london' }])
    expect(select.props('modelValue')).toBe('london')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('exposes a retry callback to custom field slots without passing it as a control attribute', async () => {
    let fail = true
    const loader = vi.fn(async () => {
      if (fail) throw new Error('Offline')
      return ['Ready']
    })
    const wrapper = mount(QSchemaForm, { global, props: {
      fields: { city: { type: 'select', options: loader } },
    }, slots: {
      'field:city': ({ reloadOptions, bindings }: { reloadOptions: () => Promise<boolean>; bindings: Record<string, unknown> }) => h('div', [
        h('button', { type: 'button', onClick: reloadOptions }, 'Retry'),
        h('output', JSON.stringify(bindings.options)),
      ]),
    } })
    await flushPromises()
    fail = false
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(loader).toHaveBeenCalledTimes(2)
    expect(wrapper.get('output').text()).toBe('["Ready"]')
  })

  it('reacts to values for inputs, sliders and registered custom controls while protecting engine bindings', async () => {
    const custom = defineComponent({ inheritAttrs: false, setup: (_props, { attrs }) => () => h('output', String(attrs.max)) })
    const forms = createQSchemaForm({ fields: { rating: custom } })
    const wrapper = mount(QSchemaForm, { global: { plugins: [Quasar, forms] }, props: {
      modelValue: { limit: 10, name: 'Ada', amount: 4, stars: 2 }, fields: {
        name: { type: 'input', label: 'Name', props: ({ values }) => ({ maxlength: Number(values.limit), readonly: Number(values.limit) < 5, modelValue: 'Wrong', label: 'Wrong' }) },
        amount: { type: 'slider', props: ({ getValue }) => ({ min: 0, max: Number(getValue('limit')) }) },
        stars: { type: 'rating', props: ({ values }) => ({ max: Number(values.limit) }) },
      },
    } })
    const input = wrapper.getComponent(QInput)
    expect(input.props('maxlength')).toBe(10)
    expect(input.props('modelValue')).toBe('Ada')
    expect(input.props('label')).toBe('Name')
    expect(wrapper.getComponent(QSlider).props('max')).toBe(10)
    expect(wrapper.get('output').text()).toBe('10')
    ;(wrapper.vm as unknown as FormActions).setFieldValue('limit', 3)
    await flushPromises()
    expect(input.props('maxlength')).toBe(3)
    expect(input.props('readonly')).toBe(true)
    expect(wrapper.getComponent(QSlider).props('max')).toBe(3)
    expect(wrapper.get('output').text()).toBe('3')
  })

  it('merges inferred props with dynamic overrides, including repeatable row fields', () => {
    const schema: SchemaAdapter<FormValues> = { validate: (values) => ({ valid: true, value: values }), describe: () => [
      { path: 'email', type: 'input', props: { type: 'email', dense: true, maxlength: 80 } },
      { path: 'rows.0.name', type: 'input', props: ({ getValue }) => ({ maxlength: Number(getValue('limit')), dense: true }) },
    ] }
    const values = { limit: 20, email: '', rows: [{ name: '' }] }
    const fields = normalizeForm(schema, { email: { type: 'input', props: ({ values }) => ({ maxlength: Number(values.limit), outlined: true }) } }, values, [
      { path: 'rows', label: 'Rows', createItem: () => ({ name: '' }), fields: { name: { type: 'input', props: { outlined: true } } } },
    ])
    const context = { values, getValue: (path: string) => path === 'limit' ? values.limit : undefined }
    const resolved = (path: string) => resolveFieldProps(fields.find((field) => field.path === path)!.props, context)
    expect(resolved('email')).toEqual({ type: 'email', dense: true, maxlength: 20, outlined: true })
    expect(resolved('rows.0.name')).toEqual({ dense: true, maxlength: 20, outlined: true })
    values.limit = 5
    expect(resolved('email').maxlength).toBe(5)
  })

  it('aborts remote loaders on unmount and suppresses late failures', async () => {
    let signal!: AbortSignal
    let reject!: (error: Error) => void
    const wrapper = mount(QSchemaForm, { global, props: {
      fields: { city: { type: 'select', options: (_context, current) => {
        signal = current
        return new Promise<SelectOption[]>((_resolve, fail) => { reject = fail })
      } } },
    } })
    wrapper.unmount()
    expect(signal.aborted).toBe(true)
    reject(new Error('Late failure'))
    await flushPromises()
    expect(wrapper.emitted('error')).toBeUndefined()
  })
})
