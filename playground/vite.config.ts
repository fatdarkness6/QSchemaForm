import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue()],
  // Package self-references resolve exports to dist, exactly as consumers do.
  resolve: { dedupe: ['vue', 'quasar'] },
  optimizeDeps: { exclude: ['q-schema-form', 'q-schema-form/yup', 'q-schema-form/zod', 'q-schema-form/vee-validate', 'q-schema-form/phone'] },
  build: { outDir: 'dist', emptyOutDir: true },
  server: { host: '127.0.0.1', watch: { awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 } } },
})
