import { describe, it, expect } from 'vitest'
import { isStr, isNonEmptyStr, isStrArray, isPlainObject } from '@/lib/validate'

describe('validate guards', () => {
  it('isStr', () => {
    expect(isStr('')).toBe(true)
    expect(isStr('x')).toBe(true)
    expect(isStr(1)).toBe(false)
    expect(isStr(null)).toBe(false)
    expect(isStr(undefined)).toBe(false)
  })

  it('isNonEmptyStr rejects empty / whitespace-only', () => {
    expect(isNonEmptyStr('a')).toBe(true)
    expect(isNonEmptyStr('')).toBe(false)
    expect(isNonEmptyStr('   ')).toBe(false)
    expect(isNonEmptyStr(0)).toBe(false)
  })

  it('isStrArray', () => {
    expect(isStrArray([])).toBe(true)
    expect(isStrArray(['a', 'b'])).toBe(true)
    expect(isStrArray(['a', 1])).toBe(false)
    expect(isStrArray('a')).toBe(false)
    expect(isStrArray(null)).toBe(false)
  })

  it('isPlainObject excludes arrays and null', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject({ a: 1 })).toBe(true)
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject(null)).toBe(false)
    expect(isPlainObject('x')).toBe(false)
  })
})
