import { describe, expect, it } from 'vitest'
import * as yup from 'yup'
import { z } from 'zod'
import { yupAdapter } from '../../src/adapters/yup'
import { zodAdapter } from '../../src/adapters/zod'

describe('schema adapters', () => {
  it('Yup maps nested issues and preserves async validation and casts', async () => {
    const adapter = yupAdapter(yup.object({ profile: yup.object({ age: yup.number().min(18, 'Too young').required() }), name: yup.string().test('available', 'Taken', async (value) => value !== 'taken') }))
    const result = await adapter.validate({ profile: { age: 10 }, name: 'taken' })
    expect(result).toMatchObject({ valid: false, issues: [{ path: ['profile', 'age'], message: 'Too young' }, { path: ['name'], message: 'Taken' }] })
    expect(await adapter.validate({ profile: { age: 30 }, name: 'Ada' })).toEqual({ valid: true, value: { profile: { age: 30 }, name: 'Ada' } })
  })
  it('Yup describes primitive fields, indexed rows and metadata', () => {
    const adapter = yupAdapter(yup.object({
      email: yup.string().label('Email').meta({ type: 'email', direction: 'rtl' }),
      active: yup.boolean(),
      age: yup.number(),
      rows: yup.array(yup.object({ name: yup.string() })),
    }))
    expect(adapter.describe?.({ rows: [{ name: 'Ada' }] })).toMatchObject([
      { path: 'email', type: 'input', label: 'Email', direction: 'rtl', props: { type: 'email' } },
      { path: 'active', type: 'checkbox' }, { path: 'age', type: 'number' }, { path: 'rows.0.name', type: 'input' },
    ])
  })
  it('Yup retains translation keys from structured locale messages', async () => {
    const adapter = yupAdapter(yup.object({ name: yup.string().required(() => ({ key: 'required', values: { label: 'Name' } })) }))
    expect(await adapter.validate({ name: '' })).toMatchObject({ valid: false, issues: [{ messageKey: 'required', params: { label: 'Name' } }] })
  })
  it('Zod infers supported input shapes and validates transformations', async () => {
    const adapter = zodAdapter(z.object({
      name: z.string().transform((value) => value.trim()),
      age: z.number().optional(), enabled: z.boolean().default(true),
      role: z.enum(['user', 'admin']),
      profile: z.object({ city: z.string() }),
    }))
    const input = { name: ' Ada ', age: 20, role: 'user' as const, profile: { city: 'London' } }
    expect(adapter.describe?.(input)).toMatchObject([
      { path: 'name', type: 'input' }, { path: 'age', type: 'number' },
      { path: 'enabled', type: 'checkbox' }, { path: 'role', type: 'select', options: ['user', 'admin'] },
      { path: 'profile.city', type: 'input' },
    ])
    expect(await adapter.validate(input)).toMatchObject({ valid: true, value: { name: 'Ada', enabled: true } })
  })
  it('Zod emits array paths and reports async refinements', async () => {
    const adapter = zodAdapter(z.object({ rows: z.array(z.object({ name: z.string().refine(async (name) => name.length > 0, 'Required') })) }))
    expect(await adapter.validate({ rows: [{ name: '' }] })).toMatchObject({ valid: false, issues: [{ path: ['rows', 0, 'name'], message: 'Required' }] })
  })
})
