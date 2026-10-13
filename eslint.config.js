import js from '@eslint/js'
import ts from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

export default ts.config(
  { ignores: ['node_modules/**', 'dist/**', 'playground/dist/**', '.consumer-test/**', 'FormBuilder.vue'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { 'vue/multi-word-component-names': 'off', 'vue/max-attributes-per-line': 'off', 'vue/singleline-html-element-content-newline': 'off' },
  },
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: ts.parser } },
    // Core control-flow analysis cannot see reads made by a Vue template.
    rules: { 'no-useless-assignment': 'off' },
  },
  { files: ['src/fields/*.ts', 'tests/**/*.ts'], rules: { 'vue/one-component-per-file': 'off' } },
)
