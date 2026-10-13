import type { App, Component } from 'vue'
import type { QSchemaFormOptions } from '../types/index.js'
import { configurationKey } from './configuration.js'
import { createFieldRegistry } from './fieldRegistry.js'
import QSchemaForm from '../components/QSchemaForm.vue'

/** Create once per application (once per request in SSR). Installation is optional. */
export function createQSchemaForm(options: QSchemaFormOptions = {}) {
  const registry = createFieldRegistry(options.fields)
  return {
    registerField: registry.registerField,
    install(app: App) {
      app.provide(configurationKey, { ...options, registry })
      app.component('QSchemaForm', QSchemaForm as Component)
    },
  }
}
