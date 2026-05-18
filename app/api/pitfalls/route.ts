import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

/* ─── Paths ─── */
const SESSION_LOG = path.join(os.homedir(), '.claude', 'session-log.md')
const LINKS_PATH = path.join(os.homedir(), '.quasar', 'pitfall-links.json')

/* ─── Types ─── */
export interface Pitfall {
  id: string
  problem: string
  solution: string
  lessons: string
  linkedProjects: string[]
  linkedSkills: string[]
}

interface PitfallLink {
  pitfallId: string
  projectId?: string
  skillId?: string
}

/* ─── Stable ID from problem text ─── */
function makeId(problem: string): string {
  let h = 5381
  const s = problem.slice(0, 80)
  for (let i = 0; i < s.length; i++) {
    h = Math.imul((h << 5) + h, 1) ^ s.charCodeAt(i)
  }
  return Math.abs(h).toString(36)
}

/* ─── Parse session-log.md ─── */
function parsePitfalls(): Pitfall[] {
  if (!fs.existsSync(SESSION_LOG)) return []

  const content = fs.readFileSync(SESSION_LOG, 'utf-8')

  // Extract the 踩坑 & 教训 section
  const sectionMatch = content.match(/##\s*踩坑[^#]+/)
  if (!sectionMatch) return []

  const section = sectionMatch[0]
  const pitfalls: Pitfall[] = []

  // Split by bullet entries starting with "- 问题："
  const entries = section.split(/\n(?=- 问题[：:])/).filter(e => e.trim().startsWith('- 问题'))

  for (const entry of entries) {
    const problemMatch = entry.match(/- 问题[：:]\s*([\s\S]+?)(?=\n\s+解法[：:]|\n\s+教训[：:]|$)/)
    const solutionMatch = entry.match(/解法[：:]\s*([\s\S]+?)(?=\n\s+教训[：:]|$)/)
    const lessonsMatch = entry.match(/教训[：:]\s*([\s\S]+?)(?=\n-\s|$)/)

    const problem = problemMatch?.[1]?.trim() ?? ''
    if (!problem) continue

    pitfalls.push({
      id: makeId(problem),
      problem,
      solution: solutionMatch?.[1]?.trim() ?? '',
      lessons: lessonsMatch?.[1]?.trim() ?? '',
      linkedProjects: [],
      linkedSkills: [],
    })
  }

  return pitfalls
}

/* ─── Read / write links ─── */
function readLinks(): PitfallLink[] {
  try {
    if (!fs.existsSync(LINKS_PATH)) return []
    return JSON.parse(fs.readFileSync(LINKS_PATH, 'utf-8'))
  } catch { return [] }
}

function writeLinks(links: PitfallLink[]) {
  const dir = path.dirname(LINKS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(LINKS_PATH, JSON.stringify(links, null, 2))
}

function applyLinks(pitfalls: Pitfall[], links: PitfallLink[]): Pitfall[] {
  return pitfalls.map(p => ({
    ...p,
    linkedProjects: links.filter(l => l.pitfallId === p.id && l.projectId).map(l => l.projectId!),
    linkedSkills: links.filter(l => l.pitfallId === p.id && l.skillId).map(l => l.skillId!),
  }))
}

/* ─── Routes ─── */

// GET /api/pitfalls
// ?projectId=xxx  → filter by project
// ?skillId=xxx    → filter by skill
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const projectId = params.get('projectId')
  const skillId = params.get('skillId')
  const pitfalls = applyLinks(parsePitfalls(), readLinks())

  if (projectId) return NextResponse.json(pitfalls.filter(p => p.linkedProjects.includes(projectId)))
  if (skillId) return NextResponse.json(pitfalls.filter(p => p.linkedSkills.includes(skillId)))
  return NextResponse.json(pitfalls)
}

// POST /api/pitfalls  { pitfallId, projectId? } or { pitfallId, skillId? }
export async function POST(req: NextRequest) {
  const body = await req.json() as PitfallLink
  const { pitfallId, projectId, skillId } = body
  if (!pitfallId || (!projectId && !skillId)) {
    return NextResponse.json({ error: 'pitfallId + (projectId or skillId) required' }, { status: 400 })
  }

  const links = readLinks()
  const exists = links.some(l =>
    l.pitfallId === pitfallId &&
    (projectId ? l.projectId === projectId : l.skillId === skillId)
  )
  if (!exists) {
    links.push({ pitfallId, ...(projectId ? { projectId } : { skillId }) })
    writeLinks(links)
  }
  return NextResponse.json({ ok: true })
}

// DELETE /api/pitfalls?pitfallId=xxx&projectId=xxx
//                   or ?pitfallId=xxx&skillId=xxx
export async function DELETE(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const pitfallId = params.get('pitfallId')
  const projectId = params.get('projectId')
  const skillId = params.get('skillId')
  if (!pitfallId || (!projectId && !skillId)) {
    return NextResponse.json({ error: 'pitfallId + (projectId or skillId) required' }, { status: 400 })
  }

  const links = readLinks().filter(l => {
    if (l.pitfallId !== pitfallId) return true
    if (projectId) return l.projectId !== projectId
    return l.skillId !== skillId
  })
  writeLinks(links)
  return NextResponse.json({ ok: true })
}
