import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, h } from 'vue'
import { Quasar, QInput, QMenu, QItem } from 'quasar'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import QPhoneField from '../../src/phone/QPhoneField.vue'
import { isValidPhoneNumber } from '../../src/phone'
import { countryForNumber, filterPhoneCountries, phoneCountries, phoneDisplay, phoneValue } from '../../src/phone/phoneNumber'
import QSchemaForm from '../../src/components/QSchemaForm.vue'
import { createFieldRegistry } from '../../src/core/fieldRegistry'
import { zodAdapter } from '../../src/adapters/zod'
import type { FormActions } from '../../src/types'

const global = { plugins: [Quasar] }
const settle = async () => { await flushPromises(); await nextTick() }

describe('international phone field', () => {
  it('lists countries separately, including shared codes, and searches names, ISO codes and calling codes', () => {
    const countries = phoneCountries('en', 'International')
    expect(countries.length).toBeGreaterThan(240)
    expect(countries.find((option) => option.country === 'US')?.callingCode).toBe('1')
    expect(countries.find((option) => option.country === 'CA')?.callingCode).toBe('1')
    expect(filterPhoneCountries(countries, 'Iran').map((option) => option.country)).toEqual(['IR'])
    expect(filterPhoneCountries(countries, 'gb').map((option) => option.country)).toEqual(['GB'])
    expect(filterPhoneCountries(countries, '+98').map((option) => option.country)).toEqual(['IR'])
    expect(filterPhoneCountries(countries, '۹۸').map((option) => option.country)).toEqual(['IR'])
    expect(phoneCountries('fa', 'بین‌المللی').find((option) => option.country === 'IR')?.label).toContain('ایران')
  })

  it('normalizes national, international, spaced and Persian input while respecting national prefixes', () => {
    expect(phoneValue('0912 123 4567', 'IR')).toBe('+989121234567')
    expect(phoneValue('۰۹۱۲۱۲۳۴۵۶۷', 'IR')).toBe('+989121234567')
    expect(phoneValue('٠٩١٢١٢٣٤٥٦٧', 'IR')).toBe('+989121234567')
    expect(phoneValue('020 7946 0018', 'GB')).toBe('+442079460018')
    expect(phoneValue('02 36618 300', 'IT')).toBe('+390236618300')
    expect(phoneValue('00 44 20 7946 0018', 'IR')).toBe('+442079460018')
    expect(phoneDisplay('+989121234567', 'IR')).toBe('912 123 4567')
    expect(phoneDisplay('+442079460018', 'GB')).toBe('20 7946 0018')
    expect(phoneValue('', 'IR')).toBe('')
    expect(isValidPhoneNumber('+989121234567')).toBe(true)
    expect(isValidPhoneNumber('+98123')).toBe(false)
    expect(countryForNumber('+14165551234', 'US')).toBe('CA')
    expect(countryForNumber('+1', 'CA')).toBe('CA')
  })

  it('formats edits, detects pasted countries, supports selector search and resets with the model', async () => {
    const wrapper = mount(QPhoneField, { global, props: { modelValue: '', defaultCountry: 'IR', name: 'phone' } })
    const number = wrapper.get('input[type="tel"]')
    await number.setValue('09121234567')
    const value = wrapper.emitted('update:modelValue')?.at(-1)?.[0] as string
    expect(value).toBe('+989121234567')
    await wrapper.setProps({ modelValue: value })
    expect((number.element as HTMLInputElement).value).toBe('912 123 4567')

    await number.setValue('+44 20 7946 0018')
    await wrapper.setProps({ modelValue: wrapper.emitted('update:modelValue')?.at(-1)?.[0] as string })
    const selector = wrapper.get('button[aria-haspopup="listbox"]')
    expect(selector.text()).toContain('+44')
    expect(selector.attributes('title')).toBe('United Kingdom (+44)')
    expect(number.element.closest('.q-field')?.contains(selector.element)).toBe(true)
    expect((number.element as HTMLInputElement).value).toBe('20 7946 0018')
    await number.setValue('')
    await wrapper.setProps({ modelValue: '' })
    expect(selector.text()).toContain('+44')
    await number.setValue('02079460018')
    await wrapper.setProps({ modelValue: wrapper.emitted('update:modelValue')?.at(-1)?.[0] as string })
    await selector.trigger('click')
    await settle()
    const search = wrapper.getComponent(QMenu).getComponent(QInput).get('input')
    await search.setValue('+98')
    expect(wrapper.findAllComponents(QItem)).toHaveLength(1)
    expect(wrapper.getComponent(QItem).text()).toBe('Iran (+98)')
    await search.trigger('keydown', { key: 'ArrowDown', keyCode: 40 })
    await search.trigger('keydown', { key: 'Enter', keyCode: 13 })
    await settle()
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('+982079460018')

    await wrapper.setProps({ modelValue: '' })
    expect((number.element as HTMLInputElement).value).toBe('')
    expect(selector.text()).toContain('+98')
    await number.setValue('+80012345678')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('+80012345678')
    expect(selector.attributes('title')).toBe('International')
  })

  it('preserves explicit selections for countries sharing a calling code and honors disabled/readonly', async () => {
    const wrapper = mount(QPhoneField, { global, props: { modelValue: '+14165551234', defaultCountry: 'CA' } })
    const selector = wrapper.get('button[aria-haspopup="listbox"]')
    await selector.trigger('click')
    await settle()
    const us = wrapper.findAllComponents(QItem).find((item) => item.attributes('data-country') === 'US')!
    await us.trigger('click')
    await wrapper.setProps({ modelValue: wrapper.emitted('update:modelValue')?.at(-1)?.[0] as string })
    expect(selector.attributes('title')).toBe('United States (+1)')
    for (const state of [{ disable: true, readonly: false }, { disable: false, readonly: true }]) {
      await wrapper.setProps(state)
      const before = wrapper.emitted('update:modelValue')?.length
      wrapper.getComponent(QInput).vm.$emit('update:modelValue', '123')
      await selector.trigger('click')
      await settle()
      expect(wrapper.emitted('update:modelValue')?.length).toBe(before)
      expect(selector.attributes('disabled')).toBeDefined()
      expect(wrapper.getComponent(QInput).props('readonly')).toBe(state.readonly)
    }
  })

  it('integrates with Zod, scoped blur validation, submitted values and reset', async () => {
    const wrapper = mount(QSchemaForm<{ phone: string; email: string }>, { global, props: {
      modelValue: { phone: '', email: 'ada@example.com' },
      registry: createFieldRegistry({ phone: QPhoneField }),
      schema: zodAdapter(z.object({ phone: z.string().refine(isValidPhoneNumber, 'Invalid phone'), email: z.string().email('Invalid email') })),
      fields: { phone: { type: 'phone', props: { defaultCountry: 'IR' } } },
    }, slots: { default: (scope: { errors: unknown }) => h('output', JSON.stringify(scope.errors)) } })
    const phone = wrapper.getComponent(QPhoneField)
    phone.getComponent(QInput).vm.$emit('blur')
    await settle()
    expect(JSON.parse(wrapper.get('output').text())).toEqual({ phone: ['Invalid phone'] })
    await wrapper.get('input[name="phone"]').setValue('09121234567')
    await settle()
    expect(JSON.parse(wrapper.get('output').text())).toEqual({})
    const actions = wrapper.vm as unknown as FormActions
    await actions.submit()
    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({ phone: '+989121234567', email: 'ada@example.com' })
    actions.reset()
    await settle()
    expect((wrapper.get('input[name="phone"]').element as HTMLInputElement).value).toBe('')
  })

  it('emits blur only when focus leaves the whole composite field', async () => {
    const wrapper = mount(QPhoneField, { global, attachTo: document.body, props: { defaultCountry: 'IR' } })
    const number = wrapper.get<HTMLInputElement>('input[type="tel"]')
    number.element.focus()
    wrapper.get<HTMLButtonElement>('button[aria-haspopup="listbox"]').element.focus()
    wrapper.getComponent(QInput).vm.$emit('blur')
    await settle()
    expect(wrapper.emitted('blur')).toBeUndefined()
    ;(document.activeElement as HTMLElement).blur()
    wrapper.getComponent(QInput).vm.$emit('blur')
    await settle()
    expect(wrapper.emitted('blur')?.length).toBeGreaterThan(0)
  })
})
