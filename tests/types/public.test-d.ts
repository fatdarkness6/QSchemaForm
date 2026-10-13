import { expectTypeOf } from 'vitest'
import { defineFields } from '../../src'
import { zodAdapter } from '../../src/adapters/zod'
import { yupAdapter } from '../../src/adapters/yup'
import { z } from 'zod'
import * as yup from 'yup'
import type { FieldMap, SchemaAdapter } from '../../src'
import type { PhoneFieldProps } from '../../src/phone'

const zod = zodAdapter(z.object({ name: z.string(), count: z.string().transform(Number) }))
expectTypeOf(zod).toEqualTypeOf<SchemaAdapter<{ name: string; count: string }, { name: string; count: number }>>()
const yupSchema = yupAdapter(yup.object({ name: yup.string().required() }))
expectTypeOf(yupSchema).toEqualTypeOf<SchemaAdapter<{ name: string }, { name: string }>>()
const fields = defineFields<{ profile: { name: string }; age: number }>()({ 'profile.name': { type: 'input' }, age: { type: 'number' } })
expectTypeOf(fields.age.type).toEqualTypeOf<'number'>()
const invalid: FieldMap<{ name: string }> = {
  // @ts-expect-error Unknown paths should not type-check.
  missing: { type: 'input' },
}
const invalidProps: FieldMap<{ name: string }> = {
  // @ts-expect-error Input props retain Quasar's property types.
  name: { type: 'input', props: { dense: 'yes' } },
}
void invalid
void invalidProps
// @ts-expect-error The helper rejects unknown paths even alongside valid fields.
defineFields<{ name: string }>()({ name: { type: 'input' }, typo: { type: 'input' } })

const phoneProps: PhoneFieldProps = { defaultCountry: 'IR', locale: 'fa', dense: true }
defineFields<{ phone: string }>()({ phone: { type: 'phone', props: phoneProps } })
// @ts-expect-error Phone countries are supported ISO region codes.
defineFields<{ phone: string }>()({ phone: { type: 'phone', props: { defaultCountry: 'Invalid' } } })
