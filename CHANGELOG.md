# Changelog

Notable changes are recorded here. Git tags identify source versions; npm publication is a separate step.

## [0.2.0] - 2026-10-13

### Added

- Eight built-in field types: date, time, radio, file, slider, range, rating and rich-text editor.
- Validation helpers: required, matching fields, strict ISO dates, date comparisons, file sizes/types, validator composition and asynchronous availability checks.
- AbortSignal support for custom validators and protection against superseded submissions.
- Repeatable object groups with add/remove/reorder controls, item limits, stable row keys and remapped error/touched state.
- Scoped `validateFields()` and public array manipulation methods in refs and slots.
- `QSchemaWizard` with guarded forward navigation, preserved values, full submission validation, invalid-step recovery and reset.
- Runnable playground examples, README usage examples and behavioral regression tests for the additions.

### Changed

- Custom state adapters must implement `replaceTouched(map)` to replace the entire touched map. Bundled adapters are updated.
- Slider/range value bubbles use `props.valueLabel`; the field's `label` remains its title.

### Fixed

- VeeValidate indexed error/touched paths are normalized consistently with the form engine.
- Standard Schema validation unwraps Vue proxies to support schemas with non-configurable properties.
- Composite controls avoid duplicate validation when focus leaves a field.

## [0.1.1] - 2026-10-13

### Fixed

- Core TypeScript declarations no longer require the optional phone-number dependency when consumers use only standard fields.
- Custom field slot bindings now use an explicit public `FieldBindings` contract, so registered field props do not leak into generated core declarations.

### Added

- Package checks compile a core consumer with optional integrations unavailable to catch declaration dependency leaks.

## [0.1.0] - 2026-10-13

Initial version of QSchemaForm, prepared for npm publication.

### Added

- Vue 3 and Quasar form rendering with typed field configuration and nested paths.
- Optional Yup and Zod adapters, plus direct Standard Schema validation.
- Built-in form state and optional VeeValidate state management.
- Collapsible sections, conditional fields, asynchronous options, and scoped slots.
- Translation support, RTL layouts, and extensible component registries.
- Optional phone field with an embedded country selector, search, international formatting, and canonical submitted values.
- Async submission, reset, transformed output, and stale-validation protection.
- Compatibility component for the original Yup/VeeValidate FormBuilder API.
- Playground, regression tests, declaration builds, and package isolation checks.

### Validation behavior

- Blur and change update errors only for the field being edited.
- Submit and explicit `validate()` display errors across the complete form.

[0.1.0]: https://github.com/fatdarkness6/QSchemaForm/tree/v0.1.0
[0.1.1]: https://github.com/fatdarkness6/QSchemaForm/compare/v0.1.0...v0.1.1
[0.2.0]: https://github.com/fatdarkness6/QSchemaForm/compare/v0.1.1...v0.2.0
