import { markRaw, shallowReactive } from 'vue'
import type { Component } from 'vue'
import type { FieldRegistry } from '../types/index.js'
import { QInputField, QNumberField, QTextareaField, QSelectField, QCheckboxField, QToggleField } from '../fields/index.js'

/** Each call creates an isolated registry. No registration happens at module scope. */
export function createFieldRegistry(custom: Record<string, Component> = {}): FieldRegistry {
  const components = shallowReactive(new Map<string, Component>(Object.entries({
    input: QInputField,
    number: QNumberField,
    textarea: QTextareaField,
    select: QSelectField,
    checkbox: QCheckboxField,
    toggle: QToggleField,
    ...custom,
  })))
  return {
    registerField(type, component) { components.set(type, typeof component === 'object' ? markRaw(component) : component) },
    resolve(type) { return components.get(type) },
  }
}
