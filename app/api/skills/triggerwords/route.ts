import { NextRequest, NextResponse } from 'next/server'
import { getData } from '@/lib/dataService'
import { invalidateCache } from '@/lib/cache'
import fs from 'fs'
import path from 'path'

// PUT /api/skills/triggerwords  body: { skillId, triggerWords: string[] }
// Rewrites the 触发词 line inside SKILL.md (description frontmatter or body)
export async function PUT(req: NextRequest) {
  const { skillId, triggerWords } = await req.json() as { skillId: string; triggerWords: string[] }
  if (!skillId) return NextResponse.json({ error: 'skillId required' }, { status: 400 })

  const { skills } = await getData()
  const skill = skills.find(s => s.id === skillId)
  if (!skill) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const skillMdPath = path.join(skill.path, 'SKILL.md')
  if (!fs.existsSync(skillMdPath)) return NextResponse.json({ error: 'SKILL.md not found' }, { status: 404 })

  try {
    const content = fs.readFileSync(skillMdPath, 'utf-8')
    const newLine = `触发词包括：${triggerWords.join('、')}`

    let updated: string
    // Try to replace existing 触发词 line
    if (/触发词(?:包括)?[：:]/.test(content)) {
      updated = content.replace(/触发词(?:包括)?[：:][^\n]*/m, newLine)
    } else {
      // Append before the first blank line after frontmatter, or at end
      const lines = content.split('\n')
      const insertIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '')
      if (insertIdx !== -1) {
        lines.splice(insertIdx, 0, newLine)
        updated = lines.join('\n')
      } else {
        updated = content + '\n' + newLine
      }
    }

    fs.writeFileSync(skillMdPath, updated, 'utf-8')
    invalidateCache()
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
