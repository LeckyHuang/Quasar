import { NextRequest, NextResponse } from 'next/server'
import { getData } from '@/lib/dataService'

export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get('refresh') === 'true'
  const category = req.nextUrl.searchParams.get('category')
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase()

  const { skills, lastScanned, fromCache } = await getData(refresh)

  let filtered = skills
  if (category) filtered = filtered.filter(s => s.category === category)
  if (q) filtered = filtered.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q) ||
    s.triggerWords.some(w => w.toLowerCase().includes(q))
  )

  return NextResponse.json({ skills: filtered, total: filtered.length, lastScanned, fromCache })
}
