import { NextRequest, NextResponse } from 'next/server'
import { readConfig, writeConfig, isFirstRun } from '@/lib/config'
import { invalidateCache } from '@/lib/cache'
import { isPlainObject, isStrArray } from '@/lib/validate'
import type { QuasarConfig } from '@/types'

// Only these keys may be written through the API — prevents a client from
// injecting arbitrary keys into the persisted config file.
const ALLOWED_KEYS: (keyof QuasarConfig)[] = [
  'skillsDirs', 'projectsDirs', 'appearance', 'accent', 'autoScan',
  'scanIntervalMs', 'obsServices', 'alertRules', 'pricing', 'obsDbPath',
]

export async function GET() {
  const config = readConfig()
  const firstRun = isFirstRun()
  const authEnabled = !!process.env.QUASAR_PASSWORD
  return NextResponse.json({ config, firstRun, authEnabled })
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) {
    return NextResponse.json({ error: 'body must be an object' }, { status: 400 })
  }
  if (body.skillsDirs !== undefined && !isStrArray(body.skillsDirs)) {
    return NextResponse.json({ error: 'skillsDirs must be string[]' }, { status: 400 })
  }
  if (body.projectsDirs !== undefined && !isStrArray(body.projectsDirs)) {
    return NextResponse.json({ error: 'projectsDirs must be string[]' }, { status: 400 })
  }

  const current = readConfig()
  // Whitelist: copy only known keys from the request onto the current config.
  const updated = { ...current }
  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined) {
      (updated as Record<string, unknown>)[key] = body[key]
    }
  }

  writeConfig(updated)
  invalidateCache()
  return NextResponse.json({ config: updated, success: true })
}
