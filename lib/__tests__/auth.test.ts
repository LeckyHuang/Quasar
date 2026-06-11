import { describe, it, expect, afterEach } from 'vitest'
import { signToken, verifyToken, isAuthEnabled } from '@/lib/auth'

const ORIG = { ...process.env }
afterEach(() => {
  process.env = { ...ORIG }
})

describe('auth secret fail-closed', () => {
  it('throws when password set but secret missing', async () => {
    process.env.QUASAR_PASSWORD = 'pw'
    delete process.env.QUASAR_SECRET
    await expect(signToken()).rejects.toThrow(/QUASAR_SECRET/)
  })

  it('throws when password set but secret is the public default', async () => {
    process.env.QUASAR_PASSWORD = 'pw'
    process.env.QUASAR_SECRET = 'quasar-dev-secret-change-in-production'
    await expect(signToken()).rejects.toThrow(/QUASAR_SECRET/)
  })

  it('works when auth disabled (no password)', async () => {
    delete process.env.QUASAR_PASSWORD
    delete process.env.QUASAR_SECRET
    const token = await signToken()
    expect(await verifyToken(token)).toBe(true)
  })
})

describe('token roundtrip', () => {
  it('signs and verifies a valid token', async () => {
    process.env.QUASAR_PASSWORD = 'pw'
    process.env.QUASAR_SECRET = 'a-strong-unique-secret'
    const token = await signToken()
    expect(await verifyToken(token)).toBe(true)
  })

  it('rejects a tampered token', async () => {
    process.env.QUASAR_PASSWORD = 'pw'
    process.env.QUASAR_SECRET = 'a-strong-unique-secret'
    const token = await signToken()
    const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa')
    expect(await verifyToken(tampered)).toBe(false)
  })

  it('rejects a token signed with a different secret', async () => {
    process.env.QUASAR_PASSWORD = 'pw'
    process.env.QUASAR_SECRET = 'secret-one'
    const token = await signToken()
    process.env.QUASAR_SECRET = 'secret-two'
    expect(await verifyToken(token)).toBe(false)
  })

  it('verifyToken returns false on garbage input', async () => {
    delete process.env.QUASAR_PASSWORD
    expect(await verifyToken('not-a-token')).toBe(false)
  })

  it('isAuthEnabled reflects QUASAR_PASSWORD', () => {
    process.env.QUASAR_PASSWORD = 'pw'
    expect(isAuthEnabled()).toBe(true)
    delete process.env.QUASAR_PASSWORD
    expect(isAuthEnabled()).toBe(false)
  })
})
