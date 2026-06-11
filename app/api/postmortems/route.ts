import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

const DIR = path.join(os.homedir(), '.quasar', 'postmortems')

export interface Incident {
  id: string
  entityId: string
  entityType: 'skill' | 'project'
  date: string               // YYYY-MM-DD
  severity: 'critical' | 'major' | 'minor'
  title: string
  problem: string
  rootCause: string
  solution: string
  lessons: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

function filePath(entityId: string) {
  return path.join(DIR, `${entityId}.json`)
}

function read(entityId: string): Incident[] {
  try {
    const fp = filePath(entityId)
    if (!fs.existsSync(fp)) return []
    return JSON.parse(fs.readFileSync(fp, 'utf-8'))
  } catch { return [] }
}

function write(entityId: string, incidents: Incident[]) {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true })
  fs.writeFileSync(filePath(entityId), JSON.stringify(incidents, null, 2))
}

// GET /api/postmortems?entityId=xxx
export async function GET(req: NextRequest) {
  const entityId = new URL(req.url).searchParams.get('entityId')
  if (!entityId) return NextResponse.json({ error: 'entityId required' }, { status: 400 })
  const list = read(entityId).sort((a, b) => b.date.localeCompare(a.date))
  return NextResponse.json(list)
}

// POST /api/postmortems  — create
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>
  if (typeof body.entityId !== 'string' || !body.entityId) {
    return NextResponse.json({ error: 'entityId required' }, { status: 400 })
  }
  if (body.entityType !== 'skill' && body.entityType !== 'project') {
    return NextResponse.json({ error: 'entityType must be skill or project' }, { status: 400 })
  }

  const now = Date.now()
  const incident: Incident = {
    ...body,
    id: `pm_${now}`,
    createdAt: now,
    updatedAt: now,
  }
  const list = read(body.entityId)
  list.unshift(incident)
  write(body.entityId, list)
  return NextResponse.json(incident)
}

// PUT /api/postmortems  — update
export async function PUT(req: NextRequest) {
  const body = await req.json() as Partial<Incident> & { id: string; entityId: string }
  if (!body.id || !body.entityId) return NextResponse.json({ error: 'id and entityId required' }, { status: 400 })

  const list = read(body.entityId)
  const idx = list.findIndex(i => i.id === body.id)
  if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  list[idx] = { ...list[idx], ...body, updatedAt: Date.now() }
  write(body.entityId, list)
  return NextResponse.json(list[idx])
}

// DELETE /api/postmortems?id=xxx&entityId=xxx
export async function DELETE(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const id = params.get('id')
  const entityId = params.get('entityId')
  if (!id || !entityId) return NextResponse.json({ error: 'id and entityId required' }, { status: 400 })

  const list = read(entityId).filter(i => i.id !== id)
  write(entityId, list)
  return NextResponse.json({ ok: true })
}
