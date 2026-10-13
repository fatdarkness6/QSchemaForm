import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Explicit .vue.js specifiers resolve vue-tsc's .vue.d.ts files in NodeNext too.
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) visit(path)
    else if (path.endsWith('.d.ts')) {
      const source = readFileSync(path, 'utf8')
      const updated = source.replace(/(['"])(\.[^'"]+\.vue)\1/g, '$1$2.js$1')
      if (updated !== source) writeFileSync(path, updated)
    }
  }
}
visit(fileURLToPath(new URL('../dist', import.meta.url)))
