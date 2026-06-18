import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import { writeLaunchScript } from '@/lib/reportStore'
import type { ReportRunType } from '@/types'

const execFileAsync = promisify(execFile)

const VALID_SKILL_TYPES = new Set<ReportRunType>(['darwin', 'test-architect', 'skill-universalizer'])

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    skillType?: unknown
    targetPath?: unknown
    targetName?: unknown
  }

  const { skillType, targetPath, targetName } = body

  if (typeof skillType !== 'string' || !VALID_SKILL_TYPES.has(skillType as ReportRunType)) {
    return NextResponse.json({ error: 'invalid skillType' }, { status: 400 })
  }
  if (typeof targetPath !== 'string' || !targetPath) {
    return NextResponse.json({ error: 'targetPath required' }, { status: 400 })
  }
  if (typeof targetName !== 'string' || !targetName) {
    return NextResponse.json({ error: 'targetName required' }, { status: 400 })
  }

  if (!fs.existsSync(targetPath)) {
    return NextResponse.json({ error: 'targetPath does not exist' }, { status: 400 })
  }

  try {
    const scriptPath = writeLaunchScript({
      skillType: skillType as ReportRunType,
      targetPath,
      targetName,
    })

    if (process.platform === 'darwin') {
      await execFileAsync('open', [scriptPath])
    } else {
      return NextResponse.json({ error: 'Launch Bridge only supported on macOS', scriptPath }, { status: 200 })
    }

    return NextResponse.json({ ok: true, scriptPath })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
