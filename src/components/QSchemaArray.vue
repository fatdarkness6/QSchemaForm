<script setup lang="ts" generic="Input extends FormValues">
import { QBtn } from 'quasar'
import type { Direction, ErrorMap, FieldArrayPresentation, FieldDefinition, FieldRegistry, FormValues, Translate } from '../types/index.js'
import QSchemaField from './QSchemaField.vue'

defineProps<{
  definition: FieldArrayPresentation
  rows: readonly { key: string; index: number; fields: readonly FieldDefinition<Input>[] }[]
  values: Input
  errors: ErrorMap
  registry: FieldRegistry
  translate: Translate
  disabled?: boolean
  readonly?: boolean
  direction?: Direction
  defaultProps?: Record<string, unknown>
}>()
defineEmits<{
  append: [path: string]
  remove: [path: string, index: number]
  move: [path: string, from: number, to: number]
  change: [path: string, value: unknown]
  blur: [path: string]
  error: [error: unknown]
}>()
</script>

<template>
  <section :class="definition.class ?? 'col-12'" :aria-label="translate(definition.label)" :data-array="definition.path">
    <div class="row items-center justify-between q-mb-sm">
      <h3 class="text-subtitle1 q-my-sm">{{ translate(definition.label) }}</h3>
      <QBtn type="button" flat color="primary" icon="add" :label="translate(definition.addLabel ?? 'Add')" :disable="disabled || readonly || rows.length >= (definition.maxItems ?? Infinity)" @click="$emit('append', definition.path)" />
    </div>
    <p v-if="errors[definition.path]?.length" class="text-negative" role="alert">{{ errors[definition.path]?.join(' ') }}</p>
    <div v-for="row in rows" :key="row.key" class="q-pa-md q-mb-md rounded-borders" style="border: 1px solid #dce1e8" :data-row="row.index">
      <div class="row items-center justify-between q-mb-sm">
        <span class="text-weight-medium">{{ translate(definition.label) }} {{ row.index + 1 }}</span>
        <div class="row q-gutter-xs">
          <QBtn type="button" flat round dense icon="arrow_upward" :aria-label="`${translate('Move up')} ${translate(definition.label)} ${row.index + 1}`" :disable="disabled || readonly || row.index === 0" @click="$emit('move', definition.path, row.index, row.index - 1)" />
          <QBtn type="button" flat round dense icon="arrow_downward" :aria-label="`${translate('Move down')} ${translate(definition.label)} ${row.index + 1}`" :disable="disabled || readonly || row.index === rows.length - 1" @click="$emit('move', definition.path, row.index, row.index + 1)" />
          <QBtn type="button" flat round dense color="negative" icon="delete_outline" :aria-label="`${translate('Remove')} ${translate(definition.label)} ${row.index + 1}`" :disable="disabled || readonly || rows.length <= (definition.minItems ?? 0)" @click="$emit('remove', definition.path, row.index)" />
        </div>
      </div>
      <p v-if="errors[`${definition.path}.${row.index}`]?.length" class="text-negative" role="alert">{{ errors[`${definition.path}.${row.index}`]?.join(' ') }}</p>
      <div class="row q-col-gutter-sm">
        <QSchemaField
          v-for="field in row.fields" :key="field.path" :field="field" :values="values" :registry="registry"
          :translate="translate" :error="errors[field.path]?.[0]" :disabled="disabled" :readonly="readonly"
          :direction="direction" :default-props="defaultProps" @change="(path, value) => $emit('change', path, value)"
          @blur="(path) => $emit('blur', path)" @error="(error) => $emit('error', error)"
        >
          <template v-if="$slots[`field:${field.path}`]" #default="scope"><slot :name="`field:${field.path}`" v-bind="scope" /></template>
        </QSchemaField>
      </div>
    </div>
  </section>
</template>
