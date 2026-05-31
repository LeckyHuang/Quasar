// Web Crypto HMAC-SHA256 — edge-runtime compatible, no extra deps

const SESSION_COOKIE = 'quasar_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getSecret(): string {
  return process.env.QUASAR_SECRET || 'quasar-dev-secret-change-in-production'
}

async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw', enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign', 'verify']
  )
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64urlDecode(s: string): ArrayBuffer {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - s.length % 4) % 4)
  const bytes = Uint8Array.from(atob(pad), c => c.charCodeAt(0))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

export async function signToken(): Promise<string> {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })
  const enc = new TextEncoder()
  const key = await getKey()
  const data = b64url(enc.encode(payload).buffer as ArrayBuffer)
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return `${data}.${b64url(sig)}`
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    const dot = token.lastIndexOf('.')
    if (dot < 0) return false
    const data = token.slice(0, dot)
    const sig = b64urlDecode(token.slice(dot + 1))
    const key = await getKey()
    const enc = new TextEncoder()
    const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(data))
    if (!valid) return false
    const rawData = b64urlDecode(data)
    const payload = JSON.parse(new TextDecoder().decode(rawData))
    return typeof payload.exp === 'number' && Date.now() < payload.exp
  } catch {
    return false
  }
}

export function isAuthEnabled(): boolean {
  return !!process.env.QUASAR_PASSWORD
}

export { SESSION_COOKIE }
