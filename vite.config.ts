import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import packageJson from './package.json' with { type: 'json' }

const peers = Object.keys(packageJson.peerDependencies)

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: Object.fromEntries(['index', 'adapters/yup/index', 'adapters/zod/index', 'adapters/vee-validate/index', 'phone/index', 'wizard/index'].map((entry) => [entry, fileURLToPath(new URL(`./src/${entry}.ts`, import.meta.url))])),
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    sourcemap: true,
    target: 'es2022',
    rolldownOptions: {
      external: (id) => peers.some((name) => id === name || id.startsWith(`${name}/`)),
      output: { chunkFileNames: 'chunks/[name].js' },
    },
  },
})
