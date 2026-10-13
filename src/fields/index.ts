import { defineComponent, h } from 'vue'
import type { Component } from 'vue'
import { QInput, QSelect, QCheckbox, QToggle, QField } from 'quasar'

function inputField(name: string, component: Component, type?: string) {
  return defineComponent({
    name,
    inheritAttrs: false,
    emits: ['update:modelValue', 'blur'],
    setup(_props, { attrs, emit, slots }) {
      return () => h(component, {
        ...attrs,
        ...(type ? { type } : {}),
        modelValue: attrs.modelValue ?? null,
        'onUpdate:modelValue': (value: unknown) => {
          const next = type === 'number' && typeof value === 'string'
            ? value.trim() === '' ? null : Number.isFinite(Number(value)) ? Number(value) : value
            : value
          emit('update:modelValue', next)
        },
        onBlur: () => emit('blur'),
      }, slots)
    },
  })
}

function booleanField(name: string, component: Component) {
  return defineComponent({
    name,
    inheritAttrs: false,
    emits: ['update:modelValue', 'blur'],
    setup(_props, { attrs, emit, slots }) {
      return () => h(QField, {
        borderless: true,
        error: Boolean(attrs.error),
        errorMessage: String(attrs.errorMessage ?? ''),
        hint: typeof attrs.hint === 'string' ? attrs.hint : undefined,
        disable: Boolean(attrs.disable),
      }, {
        control: () => h(component, {
          ...attrs,
          modelValue: attrs.modelValue ?? false,
          disable: Boolean(attrs.disable || attrs.readonly),
          'aria-invalid': Boolean(attrs.error),
          'onUpdate:modelValue': (value: unknown) => emit('update:modelValue', value),
          onBlur: () => emit('blur'),
        }, slots),
      })
    },
  })
}

export const QInputField = inputField('QInputField', QInput)
export const QNumberField = inputField('QNumberField', QInput, 'number')
export const QTextareaField = inputField('QTextareaField', QInput, 'textarea')
export const QSelectField = inputField('QSelectField', QSelect)
export const QCheckboxField = booleanField('QCheckboxField', QCheckbox)
export const QToggleField = booleanField('QToggleField', QToggle)
