import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { standardSchemaAdapter } from '../../src/adapters/standard-schema'
import { normalizeForm, applyDefaults } from '../../src/core/normalizeForm'
import { useFormState } from '../../src/composables/useFormState'
import { getPath, setPath } from '../../src/utils/paths'

describe('portable core', () => {
  it('validates async Standard Schema refinements and preserves transformed output', async () => {
    const adapter = standardSchemaAdapter(z.object({ email: z.string().transform((value) => value.toLowerCase()).refine(async (value) => value.includes('@'), 'Email invalid') }))
    expect(await adapter.validate({ email: 'ADA@EXAMPLE.COM' })).toEqual({ valid: true, value: { email: 'ada@example.com' } })
    expect(await adapter.validate({ email: 'bad' })).toEqual({ valid: false, issues: [{ path: ['email'], message: 'Email invalid' }] })
  })
  it('handles immutable nested and indexed paths and rejects unsafe paths', () => {
    const original = { users: [{ name: 'Ada' }] }
    const next = setPath(original, 'users[0].name', 'Grace')
    expect(getPath(next, 'users.0.name')).toBe('Grace')
    expect(original.users[0]?.name).toBe('Ada')
    expect(() => setPath({}, '__proto__.polluted', true)).toThrow('Invalid field path')
    expect(() => setPath({}, 'a.constructor.prototype.x', true)).toThrow()
  })
  it('lets explicit fields override inference and only fills missing defaults', () => {
    const fields = normalizeForm({ validate: (value: { name: string }) => ({ valid: true, value }), describe: () => [{ path: 'name', type: 'input', label: 'Inferred' }] }, { name: { type: 'textarea', label: 'Explicit', defaultValue: 'fallback' } }, { name: '' })
    expect(fields[0]).toMatchObject({ label: 'Explicit', type: 'textarea' })
    expect(applyDefaults({ name: '' }, fields)).toEqual({ name: '' })
  })
  it('requires explicit fields when a schema has no introspection', () => {
    expect(() => normalizeForm(z.object({ name: z.string() }), undefined, { name: '' })).toThrow('Provide fields')
  })
  it('isolates state, detects dirtiness, and resets from an independent snapshot', () => {
    const initial = { profile: { name: 'Ada' } }
    const state = useFormState(initial)
    initial.profile.name = 'Changed outside'
    state.replaceValues({ profile: { name: 'Grace' } })
    state.setTouched('profile.name')
    state.setErrors({ 'profile.name': ['Invalid'] })
    expect(state.dirty.value).toBe(true)
    state.reset()
    expect(state.values.value).toEqual({ profile: { name: 'Ada' } })
    expect(state.errors.value).toEqual({})
    expect(state.touched.value).toEqual({})
    expect(state.dirty.value).toBe(false)
  })
})
