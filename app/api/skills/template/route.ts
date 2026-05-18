import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import os from 'os'

function expandPath(p: string) {
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

export async function GET(req: NextRequest) {
  const skillPath = req.nextUrl.searchParams.get('skillPath')
  const file = req.nextUrl.searchParams.get('file')

  if (!skillPath || !file) return NextResponse.json({ error: 'skillPath and file required' }, { status: 400 })

  // Security: only allow reading within the skill's own directory
  const base = expandPath(skillPath)
  const fullPath = path.resolve(base, 'templates', file)

  if (!fullPath.startsWith(path.resolve(base))) {
    return NextResponse.json({ error: 'path traversal not allowed' }, { status: 403 })
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8')
    return NextResponse.json({ content })
  } catch {
    return NextResponse.json({ error: 'file not found' }, { status: 404 })
  }
}
