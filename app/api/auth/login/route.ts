import { NextRequest, NextResponse } from 'next/server'
import { signToken, SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: '' }))

  const expected = process.env.QUASAR_PASSWORD
  if (!expected) {
    // Auth disabled — always succeed
    const token = await signToken()
    const res = NextResponse.json({ ok: true })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, sameSite: 'lax', path: '/',
      maxAge: 7 * 24 * 60 * 60,
      secure: !!process.env.QUASAR_HTTPS,
    })
    return res
  }

  if (password !== expected) {
    await new Promise(r => setTimeout(r, 500)) // slow brute-force
    return NextResponse.json({ error: '密码错误' }, { status: 401 })
  }

  const token = await signToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/',
    maxAge: 7 * 24 * 60 * 60,
    secure: !!process.env.QUASAR_HTTPS,
  })
  return res
}
