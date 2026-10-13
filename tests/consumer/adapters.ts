import { yupAdapter } from 'q-schema-form/yup'
import { zodAdapter } from 'q-schema-form/zod'
import { veeValidateAdapter } from 'q-schema-form/vee-validate'
import { QPhoneField, isValidPhoneNumber } from 'q-schema-form/phone'
import type { SchemaAdapter } from 'q-schema-form'
import * as yup from 'yup'
import { z } from 'zod'

const fromYup: SchemaAdapter<{ name: string }> = yupAdapter(yup.object({ name: yup.string().required() }))
const fromZod: SchemaAdapter<{ name: string }> = zodAdapter(z.object({ name: z.string() }))
void fromYup
void fromZod
void veeValidateAdapter
void QPhoneField
void isValidPhoneNumber
