import { NextResponse } from 'next/server'
import { getData } from '@/lib/dataService'
import * as fs from 'fs'
import * as path from 'path'

export interface GraphEdge {
  skillId: string
  projectId: string
  reason: 'source-code' | 'mentioned-in-readme' | 'mentioned-in-claude' | 'tech-match'
  strength: number // 1-3
}

export interface GraphData {
  skills: { id: string; name: string; category: string }[]
  projects: { id: string; name: string; type: string; healthScore: number }[]
  edges: GraphEdge[]
}

function readFileSafe(p: string): string {
  try { return fs.readFileSync(p, 'utf-8').toLowerCase() } catch { return '' }
}

export async function GET(): Promise<NextResponse> {
  const { skills, projects } = await getData()

  const edges: GraphEdge[] = []

  for (const project of projects) {
    const readme = readFileSafe(path.join(project.path, 'README.md'))
    const claudeMd = readFileSafe(path.join(project.path, 'CLAUDE.md'))

    for (const skill of skills) {
      const skillNameLower = skill.name.toLowerCase()
      const skillIdLower = skill.id.toLowerCase()

      // Strongest signal: project IS the source repo for this skill
      if (project.type === 'skill-source' && (
        project.id === skill.id ||
        project.name.toLowerCase() === skillNameLower
      )) {
        edges.push({ skillId: skill.id, projectId: project.id, reason: 'source-code', strength: 3 })
        continue
      }

      // CLAUDE.md mention
      if (claudeMd.includes(skillNameLower) || claudeMd.includes(skillIdLower)) {
        edges.push({ skillId: skill.id, projectId: project.id, reason: 'mentioned-in-claude', strength: 2 })
        continue
      }

      // README mention
      if (readme.includes(skillNameLower) || readme.includes(skillIdLower)) {
        edges.push({ skillId: skill.id, projectId: project.id, reason: 'mentioned-in-readme', strength: 1 })
      }
    }
  }

  return NextResponse.json({
    skills: skills.map(s => ({ id: s.id, name: s.name, category: s.category })),
    projects: projects.map(p => ({ id: p.id, name: p.name, type: p.type, healthScore: p.healthScore })),
    edges,
  } satisfies GraphData)
}
