import { NextRequest, NextResponse } from 'next/server'
import { getData } from '@/lib/dataService'
import { gitPull, gitPush, gitFetch } from '@/lib/git/gitClient'
import { invalidateCache } from '@/lib/cache'
import type { SyncResult } from '@/types'
import fs from 'fs'
import path from 'path'

const LOG_PATH = path.join(process.env.HOME || '', '.claude', 'quasar-sync-log.json')

function appendLog(entry: { name: string; type: string; action: string; success: boolean; message: string }) {
  try {
    let existing: unknown[] = []
    if (fs.existsSync(LOG_PATH)) {
      existing = JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'))
    }
    existing.unshift({ ...entry, timestamp: Date.now() })
    if (existing.length > 100) existing = existing.slice(0, 100)
    fs.writeFileSync(LOG_PATH, JSON.stringify(existing, null, 2))
  } catch {}
}

export async function GET() {
  try {
    if (!fs.existsSync(LOG_PATH)) return NextResponse.json([])
    const data = JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'))
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { id: string; type: 'skill' | 'project'; action: 'pull' | 'push' | 'fetch' }
  const { id, type, action } = body

  const { skills, projects } = await getData()

  if (type === 'skill') {
    const skill = skills.find(s => s.id === id)
    if (!skill) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!skill.hasGit) return NextResponse.json({ error: 'No git remote configured' }, { status: 400 })
    const result: SyncResult = action === 'pull'
      ? await gitPull(skill.path, id, type)
      : action === 'fetch'
      ? await gitFetch(skill.path, id, type)
      : await gitPush(skill.path, id, type)
    if (result.success && action !== 'fetch') invalidateCache()
    if (action !== 'fetch') appendLog({ name: skill.name, type, action, success: result.success, message: result.message })
    return NextResponse.json({ result })
  }

  const project = projects.find(p => p.id === id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!project.hasGitRemote) return NextResponse.json({ error: 'No git remote configured' }, { status: 400 })

  const result: SyncResult = action === 'pull'
    ? await gitPull(project.path, id, 'project')
    : action === 'fetch'
    ? await gitFetch(project.path, id, 'project')
    : await gitPush(project.path, id, 'project')

  if (result.success && action !== 'fetch') invalidateCache()
  if (action !== 'fetch') appendLog({ name: project.name, type: 'project', action, success: result.success, message: result.message })
  return NextResponse.json({ result })
}
