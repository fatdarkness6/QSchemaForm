# QSchemaForm

[![Version](https://img.shields.io/badge/version-0.1.1-blue)](https://github.com/fatdarkness6/QSchemaForm/tree/v0.1.1)
[![CI](https://github.com/fatdarkness6/QSchemaForm/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fatdarkness6/QSchemaForm/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](https://github.com/fatdarkness6/QSchemaForm/blob/main/LICENSE)

Schema-driven, typed forms for Vue 3 and Quasar. Render validated, localized forms from Yup, Zod, or Standard Schema validators without wiring every input by hand.

**Package:** `q-schema-form` · **Version:** `0.1.1` · **npm status:** not published yet.

- Typed field configuration and nested form data.
- Zod, Yup, and other Standard Schema-compatible validators.
- Built-in form state, with optional VeeValidate integration.
- Custom fields, asynchronous select options, and collapsible sections.
- Translation, RTL layouts, and an optional international phone input.
- ESM exports, TypeScript declarations, and SSR support.

[Usage](#minimal-form) · [Phone input](#international-phone-field-optional) · [Changelog](https://github.com/fatdarkness6/QSchemaForm/blob/main/CHANGELOG.md) · [Contributing](https://github.com/fatdarkness6/QSchemaForm/blob/main/CONTRIBUTING.md) · [Issues](https://github.com/fatdarkness6/QSchemaForm/issues)

## Installation

Use this in an existing Vue 3 + Quasar application. Until the first npm publication, install the versioned GitHub source:

```sh
npm install github:fatdarkness6/QSchemaForm#v0.1.1 zod
```

The GitHub install builds the library using its `prepare` script, so it needs a supported Node version and installs the build tools temporarily. For local testing, you can also install the tarball produced by `npm pack`.

After the package is published to npm, the install command will be:

```sh
npm install q-schema-form zod

# Or choose Yup, optionally with VeeValidate:
npm install q-schema-form yup vee-validate
```

Import from `q-schema-form` regardless of whether you installed from GitHub, a tarball, or npm. Each validator/state integration is optional and has its own import path.

Required peers: Vue `^3.5.0` and Quasar `^2.18.0`. Optional integrations: Zod `^4.0.0`, Yup `^1.7.0`, VeeValidate `^4.15.0`, and libphonenumber-js `^1.13.15` for the phone field. Use TypeScript 5.9+ for development. Repository tooling requires Node 22.12+ on the 22.x line, or Node 24+.

Install/configure Quasar in the host application and load its CSS and chosen icon set once. This library imports the Quasar components it uses; it does not require global component registration, Vue auto-imports, Vue I18n, or Nuxt.

## Minimal form

Standard Schema-compatible schemas work directly when fields are provided:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { QBtn } from 'quasar'
import { QSchemaForm, defineFields } from 'q-schema-form'
import { z } from 'zod'

const schema = z.object({ email: z.string().email() })
const form = ref({ email: '' })
const fields = defineFields<z.input<typeof schema>>()({
  email: { type: 'input', label: 'Email', props: { type: 'email' } },
})

function save(values: z.output<typeof schema>) {
  console.log(values)
}
</script>

<template>
  <QSchemaForm v-model="form" :schema="schema" :fields="fields" @submit="save">
    <QBtn type="submit" label="Save" />
  </QSchemaForm>
</template>
```

Use the default state implementation or pass `:state-adapter="veeValidateAdapter"` imported from `q-schema-form/vee-validate`. The core never imports VeeValidate or a validator implementation. `schema` is optional for forms using explicit fields and field-level validation only.

## Schema-only forms and adapters

Standard Schema standardizes validation and input/output types, **not UI introspection**. Use an adapter to infer fields:

```ts
import { zodAdapter } from 'q-schema-form/zod'
import { z } from 'zod'

const schema = zodAdapter(z.object({
  email: z.string().email(),
  age: z.number().min(18),
  active: z.boolean(),
  role: z.enum(['user', 'admin']),
}))
// <QSchemaForm v-model="form" :schema="schema" />
```

Zod inference supports objects, existing array indexes, strings, numbers, booleans, enums, wrappers such as optional/default, and the input side of pipelines. Defaults and transforms are applied by Zod during validation; inferred fields do not execute schema defaults to create editable values. Initialize `v-model` or specify `defaultValue` when a visible initial value is needed. Unions, lazy schemas, and other ambiguous types need explicit fields.

```ts
import * as yup from 'yup'
import { yupAdapter } from 'q-schema-form/yup'

const schema = yupAdapter(yup.object({
  email: yup.string().email().required().label('Email').meta({ type: 'email' }),
  active: yup.boolean().default(true).label('Active'),
  biography: yup.string().label('Biography').meta({ type: 'textarea' }),
}))
```

Yup uses its public `describe({ value })` API to resolve metadata and conditions. Validation collects all issues, preserves casting/transforms, and supports asynchronous tests. Object schemas are required for the Yup adapter. Field configuration overrides inferred metadata, and metadata overrides built-in defaults.

| Import | Exports |
| --- | --- |
| `q-schema-form` | `QSchemaForm`, `createQSchemaForm`, `createFieldRegistry`, `defineFields`, `standardSchemaAdapter`, `useFormState`, public types, `version` |
| `q-schema-form/yup` | `yupAdapter`, `describeYup` |
| `q-schema-form/zod` | `zodAdapter` |
| `q-schema-form/vee-validate` | `veeValidateAdapter` |
| `q-schema-form/compat` | `FormBuilder` compatibility component |
| `q-schema-form/phone` | `QPhoneField`, `isValidPhoneNumber`, `PhoneFieldProps`, `CountryCode` |

Valibot, ArkType and other compatible validators can use the Standard Schema path with explicit fields. Dedicated introspection adapters for those libraries are not included in v0.1.

## Field configuration

Built-ins: `input`, `number`, `textarea`, `select`, `checkbox`, and `toggle`.

```ts
const fields = defineFields<{
  profile: { name: string }
  role: string
  biography: string
}>()({
  'profile.name': { type: 'input', label: 'profile.name', class: 'col-12 col-sm-6' },
  role: {
    type: 'select', label: 'Role',
    options: [{ label: 'Administrator', value: 'admin' }, { label: 'User', value: 'user' }],
  },
  biography: { type: 'textarea', label: 'Biography', props: { rows: 4 } },
})
```

| Property | Meaning |
| --- | --- |
| `type` | Built-in or registered field type; defaults to `input` |
| `label`, `placeholder`, `hint` | Text or translation keys |
| `props` | Typed Quasar/component-specific props |
| `defaultValue` | Initial fallback when a value is `undefined`; does not replace `null`, `false`, `0`, or `''` |
| `hidden`, `disabled`, `readonly` | Boolean or `({ values, getValue }) => boolean` |
| `class` | Layout classes; defaults to `col-12` |
| `direction` | `ltr`, `rtl`, or `auto`; overrides form direction |
| `section` | Optional section key |
| `options` | Options array or asynchronous loader |
| `dependencies` | Paths that trigger option reloads; all values when omitted |
| `validate` | `(value, context) => string \| string[] \| undefined`, optionally async |

Field `props` are for presentation and component configuration. Engine-owned values, error state, and event bindings take precedence. Define validation in the schema or `validate`, rather than Quasar `rules`, so there is one validation authority. Number fields emit numbers, and emit `null` when cleared. Selects default to `emitValue` and `mapOptions`; those defaults can be overridden in field props. Checkbox/toggle readonly behavior disables interaction.

Nested paths use `profile.name` or indexed paths such as `addresses.0.city` (runtime also accepts `addresses[0].city`). Literal dots/brackets in property names, symbol keys, and prototype-related path segments are unsupported. Objects and arrays are updated immutably. Dynamic array add/remove/reorder UI is deferred.

Conditional hiding preserves values and does not remove fields from validation. Unknown field types produce an explicit error instead of silently hiding an input.

## Localization

```ts
import { createQSchemaForm } from 'q-schema-form'

const forms = createQSchemaForm({
  translate: (key, params) => i18n.global.t(key, params),
  defaultFieldProps: { outlined: true, dense: true },
})
app.use(forms)
```

Plugin installation is optional; forms also accept `translate` and `defaultFieldProps` directly. Translation falls back to the supplied text when no translator is configured. Select option objects have their labels translated; primitive options are treated as literal values.

Already-localized validation messages are preserved. Yup messages shaped as `{ key, values }` are translated automatically. To treat schema message strings as translation keys:

```vue
<QSchemaForm
  v-model="form"
  :schema="schema"
  :fields="fields"
  :format-validation-message="(issue, translate) => translate(issue.message, issue.params)"
  direction="rtl"
/>
```

Labels react to the translator's reactive dependencies. Revalidate to update previously stored error messages after a locale change. The library never changes global validator locale settings.

## Custom components, registry and slots

A custom field receives `modelValue`, `label`, `error`, `errorMessage`, `disable`, `readonly`, and configured props. Emit `update:modelValue` and `blur`. Forward accessibility attributes and honor disabled/readonly state.

```ts
import { createQSchemaForm } from 'q-schema-form'
import type { QInputProps } from 'quasar'
import PostalCodeField from './PostalCodeField.vue'

declare module 'q-schema-form' {
  interface FieldPropsMap {
    postalCode: Partial<QInputProps>
  }
}

const forms = createQSchemaForm()
forms.registerField('postalCode', PostalCodeField)
app.use(forms)
// fields.postalCode = { type: 'postalCode', label: 'Postal code' }
```

For per-form registration, use `createFieldRegistry({ postalCode: PostalCodeField })` and pass `:registry="registry"`. Registries are isolated; registering a component never changes another application's defaults. Supply the registry and state adapter at form creation; remount the form to change either.

Override one field with a named slot:

```vue
<template #field:email="{ bindings, setValue, blur }">
  <MyEmailInput v-bind="bindings" @update:model-value="setValue" @blur="blur" />
</template>
```

The default slot exposes `values`, `errors`, `touched`, `dirty`, `submitting`, `validating`, `reset`, and `submit`.

## International phone field (optional)

```sh
npm install libphonenumber-js
```

Register the optional component once in the host app. Importing this entry also supplies the `phone` field's TypeScript prop types; no declaration merging is needed:

```ts
import { createQSchemaForm } from 'q-schema-form'
import { QPhoneField } from 'q-schema-form/phone'

const forms = createQSchemaForm()
forms.registerField('phone', QPhoneField)
app.use(forms)
```

Then use it in a form:

```ts
import { ref } from 'vue'
import { defineFields } from 'q-schema-form'
import { isValidPhoneNumber } from 'q-schema-form/phone'
import { z } from 'zod'

const form = ref({ phone: '' })
const schema = z.object({
  phone: z.string().refine((value) => isValidPhoneNumber(value), 'Enter a valid phone number'),
})
const fields = defineFields<typeof form.value>()({
  phone: { type: 'phone', label: 'Phone number', props: { defaultCountry: 'IR' } },
})
// <QSchemaForm v-model="form" :schema="schema" :fields="fields" />
```

The country code button (for example `+98 ▾`) sits inside the phone input, sharing its border, label and validation message. Clicking it opens a searchable popup with all 245 supported country/territory entries. Search country names, ISO region codes, and calling codes (for example `Iran`, `IR`, or `+98`), then select a result with the mouse or arrow keys and Enter. Countries sharing a calling code remain separate choices. Pasting a full international number into the number input detects its country when possible. An International option supports non-geographic numbers.

Numbers display country-aware spaces, for example `912 123 4567` beside Iran `+98`, while `form.phone` contains `+989121234567`. National prefixes are normalized using phone metadata, and Persian/Arabic digits are accepted. Empty input remains `''`; incomplete numbers stay editable and must be checked by the schema. The component formats input but does not add validation rules itself. The optional helper uses libphonenumber-js's full metadata for validation; it does not verify number ownership or reachability. Keep the dependency updated as numbering plans change.

Phone-specific props are `defaultCountry` (ISO region, defaults to `US`), `locale` (country names, defaults to `en`), `countryCodeLabel`, `internationalLabel`, and `noResultsLabel`. Standard input props such as `outlined`, `dense`, `placeholder`, `disable`, and `readonly` are supported. Numbers remain left to right in RTL forms. Use translated labels and `locale: 'fa'` for Persian country names. No additional CSS import is required. The root package never imports the phone component or its metadata; apps only using other fields do not need this optional dependency.

## Async options

```ts
city: {
  type: 'select',
  dependencies: ['country'],
  options: async ({ values }, signal) => {
    const response = await fetch(`/api/cities?country=${encodeURIComponent(String(values.country))}`, { signal })
    if (!response.ok) throw new Error('Unable to load cities')
    return response.json()
  },
}
```

The renderer displays loading state, aborts superseded requests, discards stale responses, and emits `error` if loading fails. Changing options does not automatically clear the selected value; validation and application logic should decide whether it remains valid.

## Validation, submission and reset

Default validation timing is blur and submit, with revalidation on edits to an errored field. Set `validate-on="change"` or `validate-on="submit"` to change it. Blur/change validation runs the full schema to preserve cross-field rules, but updates errors only for the field being interacted with and runs only that field's custom validator. Errors on other fields are preserved; untouched fields do not gain errors or open their sections. Submit and the exposed `validate()` method validate all fields and display all errors, including form-level issues. No validation runs on mount.

Input state and validated output are separate. Submit receives transformed/cast output; validation does not rewrite the editable model. Async results from outdated values are ignored. Errors use normalized paths and retain all messages; controls show the first. Path `''` represents a form-level error.

```vue
<QSchemaForm v-model="form" :schema="schema" :submit-action="save">
  <template #default="{ reset, submitting }">
    <QBtn type="submit" label="Save" :loading="submitting" />
    <QBtn label="Reset" :disable="submitting" @click="reset" />
  </template>
</QSchemaForm>
```

Use `submitAction(values, { reset, setErrors })` for asynchronous persistence. The library awaits its promise, blocks duplicate submission, and disables fields until it settles. A successful `submit` event follows completion. Vue does not await event listeners; `@submit` alone only observes successful validation, so control `loading` yourself if you save from that event. UI-triggered thrown errors emit `error`; exposed methods reject so callers can handle failures.

| Event | Payload |
| --- | --- |
| `update:modelValue`, `change` | Current editable values after an internal change or reset |
| `field-change` | `{ path, value, values }` |
| `submit` | Validated output, then `{ reset, setErrors }` |
| `invalid` | Validation issues |
| `reset` | Restored initial values |
| `error` | Unexpected validation/submission/options error |

Exposed methods: `validate()`, `submit()`, `reset()`, `setErrors(map)`, `clearErrors()`, and `setFieldValue(path, value)`. `validate()` returns a discriminated `{ valid, value | issues }` result. `submit()` returns that result, or `undefined` when disabled, already submitting, or superseded by changed values.

Reset restores the mount-time snapshot (including defaults), clears errors/touched state, and emits the restored model. Later external model changes do not redefine that snapshot. Remount with a new `key` for another record. Model takes precedence over `initialValues`. Defaults are applied once at creation and appear in the next emitted model; parent values are not mutated on mount. Schema prop changes are observed; invalidated async results are ignored.

Use serializable plain object/array data and `Date` values. Non-plain instances are retained by reference; mutation inside class instances/Maps/Sets is outside the dirty-tracking contract.

## TypeScript

`defineFields<Model>()` checks known nested paths (up to four levels) and Quasar prop types. Runtime paths support deeper nesting. Declaration merging extends custom field types. Adapters preserve schema input/output inference; for example, Zod `z.string().transform(Number)` has string input and number output. Use `z.input` for model state and `z.output` for submit handlers. Yup's inferred type describes its validated output; initialize editable Yup models consistently with that type.

`SchemaAdapter<Input, Output>` separates `validate(values)` from optional `describe(values)`. `FormStateAdapter` is called during setup and provides reactive values, errors, touched and dirty state plus mutation/reset operations. Only one state adapter owns a form's state. These are the extension points for future validators and state libraries.

## Migration from FormBuilder.vue

Change the import first:

```ts
import { FormBuilder } from 'q-schema-form/compat'
```

Keep `schema`, `initialValues`, `sectionStructure`, `onSubmit(values, resetForm)`, `customClass`, `inputProps`, `direction`, and the default slot. Install Yup and VeeValidate. The compatibility component uses the new engine and optional VeeValidate state adapter, retains the metadata section types (`input`, `singleInput`, `textarea`), and opens invalid sections automatically.

The migration fixes field direction metadata, numeric value handling, inconsistent shared textarea props, and awaiting an async submit callback. Supported primitive types can now receive inferred controls. These are intentional improvements; the original file remains available for comparison.

Then migrate progressively to `QSchemaForm`: move UI choices to `fields`, use `v-model`, replace callback reset arguments with the submit context/default slot, and choose a state adapter. There is no need to migrate validators at the same time.

## SSR and Nuxt

The core has no browser-global access at module initialization and no process-wide mutable registry. Create plugin instances per SSR application/request. The host must configure Quasar's SSR integration and CSS; this is not a Nuxt module and does not provide Nuxt auto-imports. Async options run during component setup; loaders used with SSR must be server-safe. SSR streaming/hydration behavior of application-specific custom fields remains the host's responsibility.

## Development and contributing

```sh
git clone https://github.com/fatdarkness6/QSchemaForm.git
cd QSchemaForm
pnpm install
pnpm dev
pnpm check
```

`pnpm dev` first builds the library, then opens a Vite server at localhost. The playground imports built package exports, never internal source modules. Rebuild with `pnpm build` after changing library source; playground-only changes use Vite HMR.

Individual checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:playground`, and `pnpm check:package`. Build before typechecking a clean checkout because playground imports resolve through `dist`. The package check verifies export targets and bundles consumer entry points to detect optional-adapter leaks and lost tree shaking. `pnpm test:watch` runs Vitest interactively. The root `FormBuilder.vue` is tested with a small host-compatibility transform and deliberately excluded from strict library compilation; all new code is strict TypeScript.

Tests cover the original behavior, adapters, rendered Quasar fields, synchronization, submit/reset, localization, custom registration, async races, conditional fields and both state implementations. Consumer smoke fixtures under `tests/consumer` can verify installed tarballs and SSR.

```sh
npm pack --dry-run
npm pack
# In a separate directory, install the tarball plus chosen peers:
npm install /path/to/q-schema-form-0.1.1.tgz vue quasar
node /path/to/repo/tests/consumer/smoke.mjs .
# Add yup, zod, vee-validate and libphonenumber-js to check every integration:
node /path/to/repo/tests/consumer/smoke.mjs . --adapters --phone
```

Submit focused changes with a behavioral test, run the complete checks, and keep optional imports out of the root dependency graph. Published artifacts are restricted to `dist`, README, CHANGELOG, LICENSE and package metadata. Builds are ESM-only; CommonJS output is not currently provided. Source maps contain source text, but the playground, test harness, legacy reference, lockfile, and installed dependencies are not packaged.

GitHub Actions runs the full checks on pushes and pull requests to `main`. See [CONTRIBUTING.md](https://github.com/fatdarkness6/QSchemaForm/blob/main/CONTRIBUTING.md) for the folder structure and development workflow, and [RELEASING.md](https://github.com/fatdarkness6/QSchemaForm/blob/main/RELEASING.md) for versioning and the separate npm publication steps. No development script publishes the package.

## Roadmap

- Dynamic field-array controls and array-level layouts.
- Dedicated Valibot/ArkType introspection and TanStack Form integration.
- Additional Quasar controls, JSON Schema, and optional Nuxt module.
- Persistence, drag-and-drop authoring, and richer server-error helpers.

MIT licensed. See [LICENSE](./LICENSE).
