import { ref } from 'vue'

export const locale = ref<'en' | 'fa'>('en')
const messages: Record<string, Record<string, string>> = {
  en: { name: 'Name', email: 'Email', age: 'Age', role: 'Role', active: 'Active account', notifications: 'Email notifications', biography: 'Biography', city: 'City', phone: 'Phone number', countryCode: 'Country code', international: 'International', noCountry: 'No matching country', phoneHint: 'Search by country or calling code. You can also paste a full international number.', invalidPhone: 'Enter a valid phone number', required: 'This field is required', invalidEmail: 'Enter a valid email address' },
  fa: { name: 'نام', email: 'ایمیل', age: 'سن', role: 'نقش', active: 'حساب فعال', notifications: 'اعلان ایمیل', biography: 'درباره من', city: 'شهر', phone: 'شماره تلفن', countryCode: 'کد کشور', international: 'بین‌المللی', noCountry: 'کشوری پیدا نشد', phoneHint: 'نام کشور یا کد آن را جستجو کنید، یا شماره کامل بین‌المللی را وارد کنید.', invalidPhone: 'شماره تلفن معتبر وارد کنید', required: 'این فیلد الزامی است', invalidEmail: 'ایمیل معتبر وارد کنید' },
}
export const translate = (key: string) => messages[locale.value]?.[key] ?? key
