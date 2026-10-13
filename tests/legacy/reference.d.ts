declare module '*.vue?legacy' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>>
  export default component
}
