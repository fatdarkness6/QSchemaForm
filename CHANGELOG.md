# Changelog

Notable changes are recorded here. Git tags identify source versions; npm publication is a separate step.

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
