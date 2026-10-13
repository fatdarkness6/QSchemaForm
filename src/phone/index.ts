import type { QInputProps } from 'quasar'
import type { CountryCode } from 'libphonenumber-js/max'

export { default as QPhoneField } from './QPhoneField.vue'
export { isValidPhoneNumber } from 'libphonenumber-js/max'
export type { CountryCode } from 'libphonenumber-js/max'

export type PhoneFieldProps = Omit<Partial<QInputProps>, 'type' | 'mask' | 'prefix'> & {
  defaultCountry?: CountryCode
  locale?: string
  countryCodeLabel?: string
  internationalLabel?: string
  noResultsLabel?: string
}

declare module '../types/index.js' {
  interface FieldPropsMap {
    phone: PhoneFieldProps
  }
}
