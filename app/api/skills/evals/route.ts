import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getData } from '@/lib/dataService'

export interface DarwinRun {
  timestamp: string
  commit: string
  scoreBefore: number
  scoreAfter: number
  status: 'improved' | 'rolled_back' | 'no_change' | string
  dimension: string
  mode: string
}

function parseTsv(content: string): DarwinRun[] {
  const lines = content.trim().split('\n').filter(Boolean)
  if (lines.length === 0) return []

  // Skip header row if present (contains non-numeric scoreBefore)
  const dataLines = lines.filter(line => {
    const cols = line.split('\t')
    return cols.length >= 4 && !isNaN(Number(cols[2]))
  })

  return dataLines.map(line => {
    const cols = line.split('\t').map(s => s.trim())
    return {
      timestamp: cols[0] ?? '',
      commit: cols[1] ?? '',
      scoreBefore: Number(cols[2]) || 0,
      scoreAfter: Number(cols[3]) || 0,
      status: cols[4] ?? '',
      dimension: cols[5] ?? '',
      mode: cols[6] ?? '',
    }
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { skills } = await getData()
  const skill = skills.find(s => s.id === id)
  if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })

  const tsvPath = path.join(skill.path, 'results.tsv')
  if (!fs.existsSync(tsvPath)) {
    return NextResponse.json({ runs: null })
  }

  try {
    const content = fs.readFileSync(tsvPath, 'utf-8')
    const runs = parseTsv(content)
    return NextResponse.json({ runs })
  } catch {
    return NextResponse.json({ runs: null })
  }
}
