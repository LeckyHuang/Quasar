import { NextRequest, NextResponse } from 'next/server'
import { getData } from '@/lib/dataService'
import { invalidateCache } from '@/lib/cache'
import * as fs from 'fs'
import * as path from 'path'

export async function PUT(req: NextRequest) {
  const { projectId, content } = await req.json() as { projectId: string; content: string }
  if (!projectId || content == null) return NextResponse.json({ error: 'projectId and content required' }, { status: 400 })

  const { projects } = await getData()
  const project = projects.find(p => p.id === projectId)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const claudePath = path.join(project.path, 'CLAUDE.md')
  try {
    fs.writeFileSync(claudePath, content, 'utf-8')
    invalidateCache()
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
