<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { QBtn, QInput, QItem, QItemSection, QMenu, QSeparator } from 'quasar'
import { parseDigits } from 'libphonenumber-js/max'
import type { CountryCode } from 'libphonenumber-js/max'
import type { PhoneCountryOption } from './phoneNumber.js'
import { countryForNumber, filterPhoneCountries, nationalDigits, phoneCountries, phoneDisplay, phoneValue } from './phoneNumber.js'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  modelValue?: string | null
  label?: string
  defaultCountry?: CountryCode
  locale?: string
  countryCodeLabel?: string
  internationalLabel?: string
  noResultsLabel?: string
  disable?: boolean
  readonly?: boolean
}>(), {
  modelValue: '', label: 'Phone number', defaultCountry: 'US', locale: 'en',
  countryCodeLabel: 'Country code', internationalLabel: 'International', noResultsLabel: 'No matching country',
})
const emit = defineEmits<{ 'update:modelValue': [value: string]; blur: [] }>()
const root = ref<HTMLElement>()
const input = ref<QInput>()
const countryButton = ref<QBtn>()
const countryList = ref<HTMLElement>()
const listId = `phone-countries-${useId()}`
const country = ref<CountryCode | ''>(props.defaultCountry)
const display = ref('')
const query = ref('')
const menuOpen = ref(false)
const highlighted = ref(-1)
const countries = computed(() => phoneCountries(props.locale, props.internationalLabel))
const filteredCountries = computed(() => filterPhoneCountries(countries.value, query.value))
const selectedCountry = computed(() => countries.value.find((option) => option.country === country.value))
const selectedCode = computed(() => selectedCountry.value?.callingCode ? `+${selectedCountry.value.callingCode}` : '+')
const optionId = (option: PhoneCountryOption) => `${listId}-${option.country || 'international'}`
let lastEmitted: string | undefined
let edit = 0

watch([() => props.modelValue, () => props.defaultCountry], ([value]) => {
  if (!value && value !== lastEmitted) country.value = props.defaultCountry
  else if (value !== lastEmitted) country.value = countryForNumber(value, country.value || undefined) ?? ''
  display.value = phoneDisplay(value ?? '', country.value || undefined)
}, { immediate: true })

function publish(value: string) {
  lastEmitted = value
  display.value = phoneDisplay(value, country.value || undefined)
  emit('update:modelValue', value)
}

function changeCountry(option: PhoneCountryOption) {
  if (props.disable || props.readonly) return
  const next = option.country
  const digits = nationalDigits(props.modelValue ?? '')
  country.value = next
  query.value = ''
  if (digits) publish(phoneValue(digits, next || undefined))
  menuOpen.value = false
  void nextTick(() => input.value?.focus())
}

async function changeNumber(raw: string | number | null) {
  if (props.disable || props.readonly) return
  const text = String(raw ?? '')
  const element = input.value?.nativeEl
  const caret = element?.selectionStart ?? text.length
  const digitsBeforeCaret = parseDigits(text.slice(0, caret)).length
  const value = phoneValue(text, country.value || undefined)
  if (/^\s*(?:\+|00)/.test(text)) country.value = countryForNumber(value, country.value || undefined) ?? ''
  const previousPrefixDigits = parseDigits(text).length - parseDigits(phoneDisplay(value, country.value || undefined)).length
  publish(value)
  const currentEdit = ++edit
  await nextTick()
  if (currentEdit !== edit || !element || document.activeElement !== element) return
  // Formatting inserts spaces. Restore the caret relative to the digits, including mid-number edits.
  element.value = display.value
  const targetDigits = Math.max(0, digitsBeforeCaret - Math.max(0, previousPrefixDigits))
  let position = 0
  let count = 0
  while (position < display.value.length && count < targetDigits) {
    if (/\d/.test(display.value[position]!)) count++
    position++
  }
  element.setSelectionRange(position, position)
}

watch(query, () => { highlighted.value = -1 })
watch(() => props.disable || props.readonly, (blocked) => {
  if (blocked) menuOpen.value = false
})

function openCountries() {
  if (props.disable || props.readonly) return
  query.value = ''
  highlighted.value = -1
  menuOpen.value = !menuOpen.value
}

function highlight(direction: number) {
  const count = filteredCountries.value.length
  if (!count) return
  highlighted.value = highlighted.value < 0 ? (direction > 0 ? 0 : count - 1) : (highlighted.value + direction + count) % count
  void nextTick(() => countryList.value?.children[highlighted.value]?.scrollIntoView?.({ block: 'nearest' }))
}

function chooseHighlighted() {
  const option = filteredCountries.value[Math.max(0, highlighted.value)]
  if (option) changeCountry(option)
}

function dismissCountries() {
  menuOpen.value = false
  countryButton.value?.$el.focus()
}

async function blur() {
  await nextTick()
  // Moving from the country selector into the number is still inside the same field.
  if (!menuOpen.value && !root.value?.contains(document.activeElement)) emit('blur')
}
</script>

<template>
  <div ref="root" class="q-phone-field" role="group" :aria-label="label">
    <QInput
      ref="input"
      v-bind="$attrs"
      :model-value="display"
      :label="label"
      :disable="disable"
      :readonly="readonly"
      type="tel"
      inputmode="tel"
      autocomplete="tel-national"
      dir="ltr"
      class="q-phone-field__number"
      stack-label
      @update:model-value="changeNumber"
      @blur="blur"
    >
      <template #prepend>
        <QBtn
          ref="countryButton"
          flat
          dense
          no-caps
          type="button"
          :label="selectedCode"
          icon-right="arrow_drop_down"
          :aria-label="countryCodeLabel"
          :title="selectedCountry?.label"
          :aria-expanded="menuOpen"
          aria-haspopup="listbox"
          :aria-controls="listId"
          :disable="disable || readonly"
          style="font-size: 14px; min-width: 64px"
          @click.stop="openCountries"
          @blur="blur"
        >
          <QMenu
            v-model="menuOpen"
            no-parent-event
            no-refocus
            anchor="bottom left"
            self="top left"
            style="width: 300px; max-width: calc(100vw - 32px)"
            @hide="blur"
            @escape-key="dismissCountries"
          >
            <div class="q-pa-sm" @keydown.esc.stop.prevent="dismissCountries">
              <QInput
                :model-value="query"
                :placeholder="countryCodeLabel"
                :aria-label="countryCodeLabel"
                :aria-controls="listId"
                :aria-activedescendant="highlighted >= 0 && filteredCountries[highlighted] ? optionId(filteredCountries[highlighted]!) : undefined"
                aria-expanded="true"
                aria-autocomplete="list"
                role="combobox"
                autofocus
                outlined
                dense
                clearable
                @update:model-value="query = String($event ?? '')"
                @clear="query = ''"
                @keydown.down.stop.prevent="highlight(1)"
                @keydown.up.stop.prevent="highlight(-1)"
                @keydown.enter.stop.prevent="chooseHighlighted"
              />
              <div :id="listId" ref="countryList" role="listbox" :aria-label="countryCodeLabel" class="q-mt-sm" style="max-height: 240px; overflow-y: auto">
                <QItem
                  v-for="(option, index) in filteredCountries"
                  :id="optionId(option)"
                  :key="option.country"
                  clickable
                  dense
                  role="option"
                  :data-country="option.country"
                  :aria-selected="option.country === country"
                  :active="index === highlighted"
                  active-class="bg-primary text-white"
                  @click="changeCountry(option)"
                >
                  <QItemSection>{{ option.label }}</QItemSection>
                </QItem>
                <div v-if="!filteredCountries.length" class="q-pa-sm text-grey-7" role="status">{{ noResultsLabel }}</div>
              </div>
            </div>
          </QMenu>
        </QBtn>
        <QSeparator vertical inset class="q-ml-xs" />
      </template>
    </QInput>
  </div>
</template>
