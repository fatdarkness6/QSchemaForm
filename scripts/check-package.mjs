import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { build } from 'vite'

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const { version } = await import('../dist/index.js')
assert.equal(version, manifest.version, 'Run the version hook and rebuild to synchronize the public package version')
for (const [name, entry] of Object.entries(manifest.exports)) {
  assert.ok(existsSync(entry.types), `Missing declaration for ${name}`)
  assert.ok(existsSync(entry.import), `Missing JavaScript for ${name}`)
}
for (const [file, helperOnly] of [['bundle-entry.ts', false], ['helper-entry.ts', true]]) {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      lib: { entry: resolve('tests/consumer', file), formats: ['es'] },
      rolldownOptions: { external: ['vue', 'quasar'] },
    },
  })
  for (const output of (Array.isArray(result) ? result : [result])) {
    for (const chunk of output.output) {
      if (chunk.type !== 'chunk') continue
      assert.ok(!Object.keys(chunk.modules).some((path) => /[/\\](yup|zod|vee-validate|libphonenumber-js)[/\\]/.test(path)), 'An optional integration leaked into the root bundle')
      assert.ok(chunk.imports.every((name) => ['vue', 'quasar'].includes(name)), `Unexpected runtime import: ${chunk.imports}`)
      if (helperOnly) assert.equal(chunk.imports.length, 0, 'A type helper retained Vue/Quasar runtime imports')
    }
  }
}
console.log('Public export targets, adapter isolation and helper tree shaking passed.')
