import type { InjectionKey } from 'vue'
import type { FieldRegistry, QSchemaFormOptions } from '../types/index.js'

export interface FormConfiguration extends QSchemaFormOptions { registry: FieldRegistry }
export const configurationKey: InjectionKey<FormConfiguration> = Symbol('q-schema-form')
