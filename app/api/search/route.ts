import { NextRequest, NextResponse } from 'next/server'
import { getData } from '@/lib/dataService'
import fs from 'fs'
import path from 'path'

function snippet(content: string, query: string, radius = 80): string {
  const idx = content.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return content.slice(0, radius * 2)
  const start = Math.max(0, idx - radius)
  const end = Math.min(content.length, idx + query.length + radius)
  return (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '')
}

function readFile(filePath: string): string {
  try { return fs.readFileSync(filePath, 'utf-8') } catch { return '' }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])

  const { skills, projects } = await getData()
  const results: { id: string; name: string; kind: 'skill' | 'project'; href: string; snippet: string; matchField: string }[] = []

  for (const skill of skills) {
    const skillMdPath = path.join(skill.path, 'SKILL.md')
    const content = readFile(skillMdPath)
    const ql = q.toLowerCase()

    const nameMatch = skill.name.toLowerCase().includes(ql)
    const triggerMatch = skill.triggerWords.some(w => w.toLowerCase().includes(ql))
    const categoryMatch = skill.category.toLowerCase().includes(ql)
    const descMatch = skill.description.toLowerCase().includes(ql)
    const contentMatch = !descMatch && content.toLowerCase().includes(ql)

    if (nameMatch || triggerMatch || categoryMatch || descMatch || contentMatch) {
      const matchField = nameMatch ? 'name' : triggerMatch ? 'trigger' : categoryMatch ? 'category' : descMatch ? 'description' : 'content'
      const searchIn = contentMatch ? content : skill.description
      results.push({
        id: skill.id,
        name: skill.name,
        kind: 'skill',
        href: `/skills/${skill.id}`,
        snippet: snippet(searchIn, q),
        matchField,
      })
    }
  }

  for (const project of projects) {
    const ql = q.toLowerCase()
    const readmePath = path.join(project.path, 'README.md')
    const readmeContent = readFile(readmePath)

    const nameMatch = project.name.toLowerCase().includes(ql)
    const stackMatch = project.techStack.some(t => t.toLowerCase().includes(ql))
    const descMatch = project.description.toLowerCase().includes(ql)
    const readmeMatch = !descMatch && readmeContent.toLowerCase().includes(ql)

    if (nameMatch || stackMatch || descMatch || readmeMatch) {
      const matchField = nameMatch ? 'name' : stackMatch ? 'tech' : descMatch ? 'description' : 'readme'
      const searchIn = readmeMatch ? readmeContent : project.description
      results.push({
        id: project.id,
        name: project.name,
        kind: 'project',
        href: `/projects/${project.id}`,
        snippet: snippet(searchIn, q),
        matchField,
      })
    }
  }

  return NextResponse.json(results.slice(0, 15))
}
