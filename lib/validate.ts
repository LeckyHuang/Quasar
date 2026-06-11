// Tiny runtime type guards for validating untrusted request bodies.
// Pure functions — unit-tested in lib/__tests__/validate.test.ts.

export function isStr(v: unknown): v is string {
  return typeof v === 'string'
}

export function isNonEmptyStr(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export function isStrArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(x => typeof x === 'string')
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
