import { NextRequest, NextResponse } from 'next/server'
import { getData } from '@/lib/dataService'

export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get('refresh') === 'true'
  const type = req.nextUrl.searchParams.get('type')
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase()
  const hasGit = req.nextUrl.searchParams.get('hasGit')
  const minHealth = req.nextUrl.searchParams.get('minHealth')

  const { projects, lastScanned, fromCache } = await getData(refresh)

  let filtered = projects
  if (type) filtered = filtered.filter(p => p.type === type)
  if (q) filtered = filtered.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    p.techStack.some(t => t.toLowerCase().includes(q))
  )
  if (hasGit === 'true') filtered = filtered.filter(p => p.hasGitRemote)
  if (hasGit === 'false') filtered = filtered.filter(p => !p.hasGitRemote)
  if (minHealth) filtered = filtered.filter(p => p.healthScore >= parseInt(minHealth))

  return NextResponse.json({ projects: filtered, total: filtered.length, lastScanned, fromCache })
}
