import { defineComponent, h, ref } from 'vue'
import type { Component } from 'vue'
import { QBtn, QDate, QTime, QInput, QPopupProxy, QField, QOptionGroup, QFile, QSlider, QRange, QRating, QEditor } from 'quasar'

function pickerField(name: string, picker: Component, defaultMask: string, icon: string) {
  return defineComponent({
    name, inheritAttrs: false, emits: ['update:modelValue', 'blur'],
    setup(_props, { attrs, emit }) {
      const popup = ref<QPopupProxy>()
      const root = ref<HTMLElement>()
      const open = ref(false)
      return () => h('div', { ref: root, onFocusout: () => queueMicrotask(() => {
        if (!open.value && !root.value?.contains(document.activeElement)) emit('blur')
      }) }, [h(QInput, {
        ...attrs, mask: undefined, type: 'text',
        modelValue: attrs.modelValue ?? null,
        'onUpdate:modelValue': (value: unknown) => emit('update:modelValue', value),
      }, {
        append: () => h(QBtn, {
          flat: true, round: true, dense: true, type: 'button', icon,
          disable: Boolean(attrs.disable || attrs.readonly), 'aria-label': `Open ${String(attrs.label ?? name)}`,
        }, { default: () => h(QPopupProxy, { ref: popup, onBeforeShow: () => { open.value = true }, onHide: () => { open.value = false; emit('blur') } }, {
          default: () => h(picker, {
            ...attrs, multiple: false, range: false, mask: attrs.mask ?? defaultMask, modelValue: attrs.modelValue ?? null,
            'onUpdate:modelValue': (value: unknown) => { emit('update:modelValue', value); popup.value?.hide() },
          }),
        }) }),
      })])
    },
  })
}

function wrappedField(name: string, component: Component, fallback: unknown, radio = false) {
  return defineComponent({
    name, inheritAttrs: false, emits: ['update:modelValue', 'blur'],
    setup(_props, { attrs, emit }) {
      const root = ref<HTMLElement>()
      return () => h('div', { ref: root, dir: attrs.dir, onFocusout: () => queueMicrotask(() => {
        if (!root.value?.contains(document.activeElement)) emit('blur')
      }) }, [h(QField, {
        borderless: true, stackLabel: true, label: attrs.label,
        error: Boolean(attrs.error), errorMessage: attrs.errorMessage, hint: attrs.hint, disable: attrs.disable,
      }, {
        control: () => h(component, {
          ...attrs, modelValue: attrs.modelValue ?? fallback,
          label: component === QSlider || component === QRange ? Boolean(attrs.valueLabel) : undefined,
          ...(radio ? { type: 'radio' } : {}),
          disable: Boolean(attrs.disable || (component !== QEditor && attrs.readonly)),
          readonly: Boolean(attrs.readonly),
          'aria-label': attrs.label,
          'onUpdate:modelValue': (value: unknown) => emit('update:modelValue', value),
        }),
      })])
    },
  })
}

export const QDateField = /* @__PURE__ */ pickerField('QDateField', QDate, 'YYYY-MM-DD', 'event')
export const QTimeField = /* @__PURE__ */ pickerField('QTimeField', QTime, 'HH:mm', 'schedule')
export const QRadioField = /* @__PURE__ */ wrappedField('QRadioField', QOptionGroup, null, true)
export const QSliderField = /* @__PURE__ */ wrappedField('QSliderField', QSlider, 0)
export const QRangeField = /* @__PURE__ */ wrappedField('QRangeField', QRange, { min: 0, max: 100 })
export const QRatingField = /* @__PURE__ */ wrappedField('QRatingField', QRating, 0)
export const QEditorField = /* @__PURE__ */ wrappedField('QEditorField', QEditor, '')
export const QFileField = /* @__PURE__ */ defineComponent({
  name: 'QFileField', inheritAttrs: false, emits: ['update:modelValue', 'blur'],
  setup(_props, { attrs, emit }) {
    return () => h(QFile, {
      ...attrs, modelValue: attrs.modelValue ?? null,
      'onUpdate:modelValue': (value: unknown) => emit('update:modelValue', value),
      onBlur: () => emit('blur'),
    })
  },
})
