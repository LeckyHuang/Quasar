import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { isNonEmptyStr, isStr } from '@/lib/validate'

const SNIPPETS_PATH = path.join(os.homedir(), '.quasar', 'snippets.json')

interface Snippet {
  id: string
  name: string
  heading: string
  content: string
  createdAt: number
}

function readSnippets(): Snippet[] {
  try {
    if (!fs.existsSync(SNIPPETS_PATH)) return []
    return JSON.parse(fs.readFileSync(SNIPPETS_PATH, 'utf-8'))
  } catch { return [] }
}

function writeSnippets(snippets: Snippet[]) {
  const dir = path.dirname(SNIPPETS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(SNIPPETS_PATH, JSON.stringify(snippets, null, 2))
}

export async function GET() {
  return NextResponse.json(readSnippets())
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { name?: unknown; heading?: unknown; content?: unknown }
  if (!isNonEmptyStr(body.name) || !isStr(body.heading) || !isStr(body.content)) {
    return NextResponse.json({ error: 'name (non-empty), heading and content must be strings' }, { status: 400 })
  }
  const snippets = readSnippets()
  const newSnippet: Snippet = {
    id: `snip_${Date.now()}`,
    name: body.name,
    heading: body.heading,
    content: body.content,
    createdAt: Date.now(),
  }
  snippets.unshift(newSnippet)
  writeSnippets(snippets)
  return NextResponse.json(newSnippet)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const snippets = readSnippets().filter(s => s.id !== id)
  writeSnippets(snippets)
  return NextResponse.json({ ok: true })
}
