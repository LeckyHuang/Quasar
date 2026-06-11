import { NextRequest, NextResponse } from 'next/server'
import { signToken, SESSION_COOKIE } from '@/lib/auth'

function sessionResponse(token: string) {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/',
    maxAge: 7 * 24 * 60 * 60,
    secure: !!process.env.QUASAR_HTTPS,
  })
  return res
}

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: '' }))

  const expected = process.env.QUASAR_PASSWORD

  try {
    if (!expected) {
      // Auth disabled — always succeed
      return sessionResponse(await signToken())
    }

    if (password !== expected) {
      await new Promise(r => setTimeout(r, 500)) // slow brute-force
      return NextResponse.json({ error: '密码错误' }, { status: 401 })
    }

    return sessionResponse(await signToken())
  } catch {
    // signToken throws when QUASAR_PASSWORD is set but QUASAR_SECRET is unset/default
    return NextResponse.json(
      { error: '服务端鉴权配置错误：启用密码时必须设置 QUASAR_SECRET 环境变量' },
      { status: 500 }
    )
  }
}
