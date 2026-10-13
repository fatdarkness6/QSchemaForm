import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  resolve: { alias: [{ find: /^quasar$/, replacement: 'quasar/dist/quasar.client.js' }] },
  plugins: [
    {
      name: 'legacy-host-auto-imports',
      enforce: 'pre',
      transform(code, id) {
        // Recreate the original application's auto-imports only for the reference.
        if (id.replaceAll('\\', '/').split('?')[0]?.endsWith('/FormBuilder.vue') && !id.includes('/src/') && !id.includes('vue&type=')) {
          return code.replace('<script setup lang="ts">', '<script setup lang="ts">\nimport { computed, reactive, watch } from "vue";')
        }
      },
    },
    vue(),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
  },
})
