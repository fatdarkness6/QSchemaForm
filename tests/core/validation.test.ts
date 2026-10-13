import { describe, expect, it } from 'vitest'
import { allOf, asyncCheck, dateAfter, fileSize, fileType, isoDate, matchesField, required } from '../../src/validation'

const context = { values: { password: 'secret', start: '2026-02-28' }, getValue: (path: string) => path === 'password' ? 'secret' : '2026-02-28' }
describe('validation helpers', () => {
  it('checks required values without rejecting zero or false', () => {
    for (const value of ['', '  ', null, undefined, []]) expect(required()(value, context)).toBeTruthy()
    for (const value of [0, false, 'Ada', [1]]) expect(required()(value, context)).toBeUndefined()
  })
  it('compares fields and strict Gregorian dates', () => {
    expect(matchesField('password')('secret', context)).toBeUndefined()
    expect(matchesField('password')('wrong', context)).toBeTruthy()
    expect(isoDate()('2024-02-29', context)).toBeUndefined()
    for (const value of ['2026-02-29', '2026-04-31', '2026/01/01', 'hello']) expect(isoDate()(value, context)).toBeTruthy()
    expect(isoDate()('', context)).toBeUndefined()
    expect(dateAfter('start')('2026-02-28', context)).toBeUndefined()
    expect(dateAfter('start', 'Later', false)('2026-02-28', context)).toBe('Later')
    expect(dateAfter('start')('2026-02-27', context)).toBeTruthy()
  })
  it('checks every selected file, MIME wildcards, extensions and size boundaries', () => {
    const pdf = new File(['1234'], 'CV.PDF', { type: 'application/pdf' })
    const image = new File(['12'], 'avatar.png', { type: 'image/png' })
    expect(fileSize(4)(pdf, context)).toBeUndefined()
    expect(fileSize(3)([image, pdf], context)).toBeTruthy()
    expect(fileType(['.pdf', 'image/*'])([pdf, image], context)).toBeUndefined()
    expect(fileType(['image/*'])([pdf, image], context)).toBeTruthy()
    expect(fileSize(4)(null, context)).toBeUndefined()
    expect(fileType(['.pdf'])({ name: 'fake' }, context)).toBeTruthy()
    expect(() => fileSize(-1)).toThrow()
  })
  it('combines errors and forwards cancellation to server checks', async () => {
    const controller = new AbortController()
    const validate = allOf(required('Required'), asyncCheck(async (value, ctx) => {
      expect(ctx.signal).toBe(controller.signal)
      return value !== 'taken'
    }, 'Unavailable'))
    expect(await validate('', { ...context, signal: controller.signal })).toEqual(['Required'])
    expect(await validate('taken', { ...context, signal: controller.signal })).toEqual(['Unavailable'])
    expect(await validate('free', { ...context, signal: controller.signal })).toBeUndefined()
  })
})
