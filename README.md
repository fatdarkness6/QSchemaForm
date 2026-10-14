# QSchemaForm

[![npm version](https://img.shields.io/npm/v/q-schema-form)](https://www.npmjs.com/package/q-schema-form)
[![CI](https://github.com/fatdarkness6/QSchemaForm/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fatdarkness6/QSchemaForm/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](https://github.com/fatdarkness6/QSchemaForm/blob/main/LICENSE)

Build validated forms in Vue 3 + Quasar from a schema and a field configuration. Supports Zod, Yup, and other Standard Schema validators.

## Install

In an existing app with Vue 3.5+ and Quasar 2.18+ configured, including Quasar CSS:

```sh
npm install q-schema-form zod
```

## Usage

**`schema`** defines validation rules. **`fields`** chooses inputs and their appearance. **`v-model`** holds the entered values.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { QBtn } from 'quasar'
import { z } from 'zod'
import { QSchemaForm, defineFields } from 'q-schema-form'

const schema = z.object({ email: z.string().email('Enter a valid email') })
const values = ref({ email: '' })
const fields = defineFields<z.input<typeof schema>>()({
  email: { type: 'input', label: 'Email', props: { type: 'email' } },
})

function save(data: z.output<typeof schema>) {
  console.log(data) // Replace with your API call; promises are awaited.
}
</script>

<template>
  <QSchemaForm v-model="values" :schema="schema" :fields="fields" :submit-action="save">
    <QBtn type="submit" label="Save" />
  </QSchemaForm>
</template>
```

By default, leaving a field validates that field; submitting validates the whole form. `save` receives validated data only.

## Key options

| Prop | Purpose |
| --- | --- |
| `v-model` | Current form values |
| `schema` | Validation schema; optional when using field validators |
| `fields` | Input configuration keyed by model paths, e.g. `email` or `profile.name` |
| `submit-action` | Save validated data; async functions are awaited |
| `validate-on` | `blur` (default), `change`, or `submit` |
| `default-field-props` | Shared Quasar props, e.g. `{ outlined: true, dense: true }` |

Each field accepts `type`, `label`, `props` (Quasar options), `options` (dropdown choices), and `validate` (custom validation). Inputs include text, numbers, dropdowns, checkboxes, dates, files, and more.

For Yup, phone inputs, server values/errors, dynamic dropdowns, custom fields, repeatable groups, and wizards, see the **[full guide](https://github.com/fatdarkness6/QSchemaForm/blob/main/docs/guide.md)**.

[Changelog](https://github.com/fatdarkness6/QSchemaForm/blob/main/CHANGELOG.md) · [Contributing](https://github.com/fatdarkness6/QSchemaForm/blob/main/CONTRIBUTING.md) · [Issues](https://github.com/fatdarkness6/QSchemaForm/issues)
