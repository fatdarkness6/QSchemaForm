import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Component, ComputedRef, Ref } from 'vue'
import type { QInputProps, QSelectProps, QCheckboxProps, QToggleProps } from 'quasar'

export type FormValues = Record<string, unknown>
export type Direction = 'ltr' | 'rtl' | 'auto'
export type MaybePromise<T> = T | Promise<T>
export type FieldPath<T, Depth extends unknown[] = []> = Depth['length'] extends 4 ? never : {
  [K in keyof T & string]: T[K] extends readonly (infer Item)[]
    ? K | `${K}.${number}` | `${K}.${number}.${FieldPath<Item, [...Depth, 0]>}`
    : NonNullable<T[K]> extends object
      ? K | `${K}.${FieldPath<NonNullable<T[K]>, [...Depth, 0]>}` : K
}[keyof T & string]

export interface FieldContext<T = FormValues> {
  values: Readonly<T>
  getValue: (path: string) => unknown
}
export type Condition<T> = boolean | ((context: FieldContext<T>) => boolean)
export type SelectOption = string | number | { label: string; value: unknown; disable?: boolean }
export type OptionsSource<T> = readonly SelectOption[] | ((context: FieldContext<T>, signal: AbortSignal) => MaybePromise<readonly SelectOption[]>)

/** Extend through declaration merging to type a registered custom field's props. */
export interface FieldPropsMap {
  input: Partial<QInputProps>
  number: Partial<QInputProps>
  textarea: Partial<QInputProps>
  select: Partial<QSelectProps>
  checkbox: Partial<QCheckboxProps>
  toggle: Partial<QToggleProps>
}
export interface FieldBase<T = FormValues> {
  label?: string
  placeholder?: string
  hint?: string
  defaultValue?: unknown
  hidden?: Condition<T>
  disabled?: Condition<T>
  readonly?: Condition<T>
  class?: string
  direction?: Direction
  section?: string
  options?: OptionsSource<T>
  /** Paths that trigger option reloads; all values are watched when omitted. */
  dependencies?: readonly string[]
  validate?: (value: unknown, context: FieldContext<T>) => MaybePromise<string | readonly string[] | undefined>
}
export type FieldConfig<T = FormValues> = FieldBase<T> & (
  | { [K in keyof FieldPropsMap]: { type: K; props?: FieldPropsMap[K] } }[keyof FieldPropsMap]
  | { type?: undefined; props?: Partial<QInputProps> }
)
export type FieldMap<T = FormValues> = Partial<Record<FieldPath<T>, FieldConfig<T>>>
export type FieldDefinition<T = FormValues> = FieldConfig<T> & { path: string }
export interface SectionDefinition {
  key: string
  label: string
  icon?: string
  defaultOpened?: boolean
}
export interface ValidationIssue {
  path: readonly (string | number)[]
  message: string
  messageKey?: string
  params?: Record<string, unknown>
}
export type ValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; issues: readonly ValidationIssue[] }

/** Describing a schema is optional; validation never requires introspection. */
export interface SchemaAdapter<Input = FormValues, Output = Input> {
  validate: (values: Input) => MaybePromise<ValidationResult<Output>>
  describe?: (values: Input) => readonly FieldDefinition<Input>[]
}
export type SchemaSource<Input = FormValues, Output = Input> = SchemaAdapter<Input, Output> | StandardSchemaV1<Input, Output>
export type ErrorMap = Record<string, readonly string[]>
export interface FormState {
  values: Readonly<Ref<FormValues>>
  errors: Readonly<Ref<ErrorMap>>
  touched: Readonly<Ref<Record<string, boolean>>>
  dirty: ComputedRef<boolean>
  replaceValues: (values: FormValues) => void
  setTouched: (path: string) => void
  setErrors: (errors: ErrorMap) => void
  reset: (values?: FormValues) => void
}
/** Called synchronously during component setup; adapters may use Vue composables. */
export type FormStateAdapter = (initialValues: FormValues) => FormState
export interface FieldRegistry {
  registerField: (type: string, component: Component) => void
  resolve: (type: string) => Component | undefined
}
export type Translate = (key: string, params?: Record<string, unknown>) => string
export interface QSchemaFormOptions {
  translate?: Translate
  formatValidationMessage?: (issue: ValidationIssue, translate: Translate) => string
  defaultFieldProps?: Record<string, unknown>
  fields?: Record<string, Component>
}
export interface SubmitContext {
  reset: () => void
  setErrors: (errors: Record<string, string | readonly string[]>) => void
}
export interface FormActions<Input = FormValues, Output = Input> extends SubmitContext {
  validate: () => Promise<ValidationResult<Output>>
  submit: () => Promise<ValidationResult<Output> | undefined>
  clearErrors: () => void
  setFieldValue: (path: FieldPath<Input>, value: unknown) => void
}
