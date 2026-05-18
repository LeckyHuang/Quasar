import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import { readConfig, writeConfig, isFirstRun } from '@/lib/config'
import { invalidateCache } from '@/lib/cache'

export async function GET() {
  const config = readConfig()
  const firstRun = isFirstRun()
  return NextResponse.json({ config, firstRun })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const current = readConfig()

  // Validate dirs exist
  const validateDirs = (dirs: string[]): string[] =>
    dirs.map(d => d.replace(/^~/, process.env.HOME || '')).filter(d => {
      try { return fs.existsSync(d) } catch { return false }
    }).map(d => d.replace(process.env.HOME || '', '~'))

  const updated = {
    ...current,
    ...body,
    skillsDirs: body.skillsDirs ? validateDirs(body.skillsDirs) : current.skillsDirs,
    projectsDirs: body.projectsDirs ? validateDirs(body.projectsDirs) : current.projectsDirs,
  }

  writeConfig(updated)
  invalidateCache()
  return NextResponse.json({ config: updated, success: true })
}
