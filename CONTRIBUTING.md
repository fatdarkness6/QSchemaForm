# Contributing

QSchemaForm is one npm library with a separate app for testing it interactively.

## Setup

Use Node 22.12+ on the 22.x line, or Node 24+, and pnpm 11.25.0 (the version in `package.json`).

```sh
git clone https://github.com/fatdarkness6/QSchemaForm.git
cd QSchemaForm
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed in the terminal. Playground edits update live. After editing library code, run `pnpm build` or restart `pnpm dev` so the playground can load the rebuilt package.

## Folder structure

| Path | Purpose |
| --- | --- |
| `src/components` | Form and individual-field rendering |
| `src/core` | Validation, submission, configuration, and field registration |
| `src/fields` | Built-in Quasar input wrappers |
| `src/phone` | Optional international phone component |
| `src/adapters` | Optional schema/state integrations |
| `src/types` | Public TypeScript contracts |
| `src/index.ts` | Root public exports |
| `playground` | Demo app that imports the built package |
| `tests` | Behavior, adapter, type, and consumer checks |
| `scripts` | Declaration, version, and package helpers |
| `dist` | Generated package output; do not edit or commit it |
| `FormBuilder.vue` | Original component, preserved as a regression reference |

## Before a pull request

```sh
pnpm check
npm pack --dry-run
```

`pnpm check` builds the package, checks types and lint, runs tests, builds the playground, and verifies exports/tree shaking. GitHub Actions runs the same checks. Add behavioral coverage for fixes and update the README/changelog when public behavior changes. Keep optional validator and phone imports in their dedicated package entries.

Commit `pnpm-lock.yaml` when dependencies change. Generated output, tarballs, local caches, and `node_modules` stay ignored.

## Report a bug

Open a [GitHub issue](https://github.com/fatdarkness6/QSchemaForm/issues) with your package/Vue/Quasar versions, a small schema and field configuration, the expected result, and the actual result. Use fake data in reproductions.

For versioning and npm publication, see [RELEASING.md](./RELEASING.md).
