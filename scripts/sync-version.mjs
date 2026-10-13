import { readFileSync, writeFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const entry = new URL('../src/index.ts', import.meta.url)
const source = readFileSync(entry, 'utf8')
const declaration = /export const version = ["'][^"']+["'];?/
if (!declaration.test(source)) throw new Error('Cannot find the public version export in src/index.ts')
writeFileSync(entry, source.replace(declaration, `export const version = ${JSON.stringify(manifest.version)};`))
