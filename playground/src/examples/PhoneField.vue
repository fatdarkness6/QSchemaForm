<script setup lang="ts">
import { QPhoneField } from 'q-schema-form/phone'
import { locale, translate } from '../localization'
defineOptions({ inheritAttrs: false })
defineProps<{ modelValue?: string | null; label?: string }>()
defineEmits<{ 'update:modelValue': [value: string | number | null]; blur: [] }>()
</script>

<template>
  <QPhoneField
    v-bind="$attrs"
    :model-value="modelValue"
    :label="label"
    :locale="locale"
    :country-code-label="translate('countryCode')"
    :international-label="translate('international')"
    :no-results-label="translate('noCountry')"
    @update:model-value="$emit('update:modelValue', $event)"
    @blur="$emit('blur')"
  />
</template>
