import { AsYouType, getCountries, getCountryCallingCode, parseDigits, parseIncompletePhoneNumber } from 'libphonenumber-js/max'
import type { CountryCode } from 'libphonenumber-js/max'

export interface PhoneCountryOption {
  country: CountryCode | ''
  callingCode: string
  label: string
}

export function phoneCountries(locale: string, internationalLabel: string): PhoneCountryOption[] {
  const names = new Intl.DisplayNames([locale], { type: 'region' })
  return [
    { country: '' as const, callingCode: '', label: internationalLabel },
    ...getCountries().map((country) => ({
      country,
      callingCode: getCountryCallingCode(country),
      label: `${names.of(country) ?? country} (+${getCountryCallingCode(country)})`,
    })).sort((a, b) => a.label.localeCompare(b.label, locale)),
  ]
}

export function filterPhoneCountries(options: readonly PhoneCountryOption[], query: string) {
  const search = query.trim().toLocaleLowerCase()
  const digits = parseIncompletePhoneNumber(search).replace(/^\+/, '')
  const codeSearch = /^\+?[\d\s]+$/.test(search) || /^[+\d\s۰-۹٠-٩]+$/.test(search)
  return options.filter((option) => !search || option.label.toLocaleLowerCase().includes(search)
    || option.country.toLowerCase() === search
    || (codeSearch && digits !== '' && option.callingCode.startsWith(digits)))
}

/** Keep partial input editable; a schema decides when it is a valid complete number. */
export function phoneValue(input: string, country?: CountryCode): string {
  let value = parseIncompletePhoneNumber(input)
  if (value.startsWith('00')) value = `+${value.slice(2)}`
  if (!value) return ''
  const international = value.startsWith('+') || !country
  if (international && !value.startsWith('+')) value = `+${value}`
  const formatter = new AsYouType(international ? undefined : country)
  formatter.input(value)
  return formatter.getNumber()?.number ?? (international ? value : `+${getCountryCallingCode(country!)}${value}`)
}

export function countryForNumber(value: string, preferred?: CountryCode): CountryCode | undefined {
  const formatter = new AsYouType()
  formatter.input(value)
  const callingCode = formatter.getCallingCode()
  return formatter.getCountry()
    ?? (preferred && (!callingCode || getCountryCallingCode(preferred) === callingCode) ? preferred : undefined)
    ?? getCountries().find((country) => getCountryCallingCode(country) === callingCode)
}

export function nationalDigits(value: string): string {
  const formatter = new AsYouType()
  formatter.input(value)
  return formatter.getNumber()?.nationalNumber ?? parseDigits(value).slice(formatter.getCallingCode()?.length ?? 0)
}

export function phoneDisplay(value: string, country?: CountryCode): string {
  const formatter = new AsYouType()
  const formatted = formatter.input(value)
  const callingCode = formatter.getCallingCode()
  return country && callingCode === getCountryCallingCode(country)
    ? formatted.slice(callingCode.length + 1).trimStart()
    : formatted
}
