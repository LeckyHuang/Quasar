import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { getData } from '@/lib/dataService'
import { getRecentCommits } from '@/lib/git/gitClient'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { skills } = await getData()
  const skill = skills.find(s => s.id === id)
  if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })

  // Read SKILL.md content
  const skillMdPath = path.join(skill.path, 'SKILL.md')
  const skillMdContent = fs.existsSync(skillMdPath)
    ? fs.readFileSync(skillMdPath, 'utf-8')
    : ''

  // List template files with details
  const templatesDir = path.join(skill.path, 'templates')
  const templateFiles = fs.existsSync(templatesDir)
    ? fs.readdirSync(templatesDir, { recursive: true })
        .filter(f => typeof f === 'string' && !fs.statSync(path.join(templatesDir, f)).isDirectory())
        .map(f => {
          const fp = path.join(templatesDir, String(f))
          const stat = fs.statSync(fp)
          return { name: String(f), sizeBytes: stat.size }
        })
    : []

  // Git commits if available
  const commits = skill.hasGit ? await getRecentCommits(skill.path) : []

  return NextResponse.json({ ...skill, skillMdContent, templateFiles, commits })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { skills } = await getData()
  const skill = skills.find(s => s.id === id)
  if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })

  const body = await req.json() as { category?: string; tags?: string[]; triggerWords?: string[] }
  const skillMdPath = path.join(skill.path, 'SKILL.md')
  if (!fs.existsSync(skillMdPath)) return NextResponse.json({ error: 'SKILL.md not found' }, { status: 404 })

  // Update frontmatter fields
  let content = fs.readFileSync(skillMdPath, 'utf-8')
  if (body.category !== undefined) {
    content = content.replace(/^category:.*$/m, `category: ${body.category}`)
    if (!content.match(/^category:/m)) content = content.replace(/^---/, `---\ncategory: ${body.category}`)
  }
  fs.writeFileSync(skillMdPath, content, 'utf-8')

  return NextResponse.json({ success: true })
}
