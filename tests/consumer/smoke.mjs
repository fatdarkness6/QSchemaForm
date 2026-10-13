import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

// ESM eval resolves imports from cwd, away from the repository's dependencies.
const directory = resolve(process.argv[2] ?? '.consumer-test')
const script = readFileSync(new URL('./runtime.mjs', import.meta.url), 'utf8')
const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script, '--', ...process.argv.slice(3)], {
  cwd: directory, stdio: 'inherit',
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
