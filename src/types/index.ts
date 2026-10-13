import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Component, ComputedRef, Ref, InputHTMLAttributes, TextareaHTMLAttributes } from 'vue'
import type { QInputProps, QSelectProps, QCheckboxProps, QToggleProps, QDateProps, QTimeProps, QOptionGroupProps, QFileProps, QSliderProps, QRangeProps, QRatingProps, QEditorProps } from 'quasar'

export type FormValues = Record<string, unknown>
export type Direction = 'ltr' | 'rtl' | 'auto'
export type MaybePromise<T> = T | Promise<T>
/** Object patches merge recursively; arrays and non-plain values are replaced whole. */
export type DeepPartial<T> = T extends Date | Blob | readonly unknown[] ? T : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T
export type FieldPath<T, Depth extends unknown[] = []> = Depth['length'] extends 4 ? never : {
  [K in keyof T & string]: T[K] extends readonly (infer Item)[]
    ? K | `${K}.${number}` | `${K}.${number}.${FieldPath<Item, [...Depth, 0]>}`
    : NonNullable<T[K]> extends Date | Blob ? K
    : NonNullable<T[K]> extends object
      ? K | `${K}.${FieldPath<NonNullable<T[K]>, [...Depth, 0]>}` : K
}[keyof T & string]

export interface FieldContext<T = FormValues> {
  values: Readonly<T>
  getValue: (path: string) => unknown
  /** Aborted when a validation run is superseded; available to field validators. */
  signal?: AbortSignal
  /** Current search text when loading dropdown options. */
  query?: string
}
export type FieldProps<T, Props> = Props | ((context: FieldContext<T>) => Props)
export type FieldValidator<T = FormValues> = (value: unknown, context: FieldContext<T>) => MaybePromise<string | readonly string[] | undefined>
export type Condition<T> = boolean | ((context: FieldContext<T>) => boolean)
export type SelectOption = string | number | { label: string; value: unknown; disable?: boolean }
export type OptionsSource<T> = readonly SelectOption[] | ((context: FieldContext<T>, signal: AbortSignal) => MaybePromise<readonly SelectOption[]>)

/** Extend through declaration merging to type a registered custom field's props. */
export interface FieldPropsMap {
  input: Partial<QInputProps> & InputHTMLAttributes
  number: Partial<QInputProps> & InputHTMLAttributes
  textarea: Partial<QInputProps> & TextareaHTMLAttributes
  select: Partial<QSelectProps>
  checkbox: Partial<QCheckboxProps>
  toggle: Partial<QToggleProps>
  date: Omit<Partial<QDateProps>, 'multiple' | 'range'> & Pick<Partial<QInputProps>, 'outlined' | 'filled' | 'dense' | 'clearable'>
  time: Partial<QTimeProps> & Pick<Partial<QInputProps>, 'outlined' | 'filled' | 'dense' | 'clearable'>
  radio: Omit<Partial<QOptionGroupProps>, 'type'>
  file: Partial<QFileProps>
  slider: Omit<Partial<QSliderProps>, 'label'> & { valueLabel?: boolean }
  range: Omit<Partial<QRangeProps>, 'label'> & { valueLabel?: boolean }
  rating: Partial<QRatingProps>
  editor: Partial<QEditorProps>
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
  step?: string
  options?: OptionsSource<T>
  /** Paths that trigger option reloads; all values are watched when omitted. */
  dependencies?: readonly string[]
  validate?: FieldValidator<T>
}
export type FieldConfig<T = FormValues> = FieldBase<T> & (
  | { [K in keyof FieldPropsMap]: { type: K; props?: FieldProps<T, FieldPropsMap[K]> } }[keyof FieldPropsMap]
  | { type?: undefined; props?: FieldProps<T, FieldPropsMap['input']> }
)
export type FieldMap<T = FormValues> = Partial<Record<FieldPath<T>, FieldConfig<T>>>
export type FieldDefinition<T = FormValues> = FieldConfig<T> & { path: string; arrayPath?: string; arrayIndex?: number }
export type FieldArrayPath<T, Depth extends unknown[] = []> = string extends keyof T ? string : Depth['length'] extends 4 ? never : {
  [K in keyof T & string]: NonNullable<T[K]> extends readonly unknown[] ? K
    : NonNullable<T[K]> extends FormValues ? `${K}.${FieldArrayPath<NonNullable<T[K]>, [...Depth, 0]>}` : never
}[keyof T & string]
export type PathValue<T, Path extends string> = Path extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T ? PathValue<NonNullable<T[Key]>, Rest> : unknown
  : Path extends keyof T ? T[Path] : unknown
export type FieldArrayItem<T, Path extends string> = NonNullable<PathValue<T, Path>> extends readonly (infer Item)[] ? Item : FormValues
export interface FieldArrayPresentation {
  path: string
  label: string
  minItems?: number
  maxItems?: number
  section?: string
  step?: string
  class?: string
  addLabel?: string
}
export type FieldArrayDefinition<T = FormValues> = {
  [Path in FieldArrayPath<T>]: FieldArrayPresentation & {
    path: Path
    fields: Partial<Record<FieldPath<FieldArrayItem<T, Path>>, FieldConfig<T>>>
    createItem: () => FieldArrayItem<T, Path>
    hidden?: Condition<T>
  }
}[FieldArrayPath<T>]
export interface StepDefinition {
  key: string
  label: string
  icon?: string
}
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
  replaceTouched: (touched: Record<string, boolean>) => void
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
/** Engine-owned slot bindings; registered component props remain dynamic. */
export interface FieldBindings extends Record<string, unknown> {
  name: string
  modelValue: unknown
  label: string
  error: boolean
  errorMessage?: string
  loading: boolean
  disable?: boolean
  readonly?: boolean
  dir: Direction
}
export interface QSchemaFormOptions {
  translate?: Translate
  formatValidationMessage?: (issue: ValidationIssue, translate: Translate) => string
  defaultFieldProps?: Record<string, unknown>
  fields?: Record<string, Component>
}
export interface SetValuesOptions {
  /** Preserve values that differ from the current reset baseline. */
  keepDirtyValues?: boolean
  /** Treat incoming data as the new reset baseline. */
  asInitial?: boolean
}
export interface ValueLoadContext<Input = FormValues> {
  values: Readonly<Input>
  signal: AbortSignal
}
export type ValueLoader<Input = FormValues> = (context: ValueLoadContext<Input>) => MaybePromise<DeepPartial<Input>>
/** Map your API's response shape into this explicit, transport-independent contract. */
export interface ServerResponse<Input = FormValues> {
  values?: DeepPartial<Input>
  errors?: Record<string, string | readonly string[]>
}
export interface SubmitContext<Input = FormValues> {
  reset: (values?: Input) => void
  setErrors: (errors: Record<string, string | readonly string[]>) => void
  setValues: (values: DeepPartial<Input>, options?: SetValuesOptions) => void
  applyServerResponse: (response: ServerResponse<Input>, options?: SetValuesOptions) => void
}
export interface FormActions<Input = FormValues, Output = Input> extends SubmitContext<Input> {
  readonly loadingValues: boolean
  validate: () => Promise<ValidationResult<Output>>
  submit: () => Promise<ValidationResult<Output> | undefined>
  clearErrors: () => void
  setFieldValue: (path: FieldPath<Input>, value: unknown) => void
  validateFields: (paths: readonly string[]) => Promise<boolean>
  appendArrayItem: (path: FieldArrayPath<Input>, value?: unknown) => boolean
  removeArrayItem: (path: FieldArrayPath<Input>, index: number) => boolean
  moveArrayItem: (path: FieldArrayPath<Input>, from: number, to: number) => boolean
  loadValues: (loader: ValueLoader<Input>, options?: SetValuesOptions) => Promise<boolean>
  cancelLoad: () => void
}
export interface WizardActions<Input = FormValues, Output = Input> extends FormActions<Input, Output> {
  nextStep: () => Promise<boolean>
  previousStep: () => boolean
  goToStep: (key: string) => Promise<boolean>
}
