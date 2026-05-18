import { NextResponse } from 'next/server'
import { getData } from '@/lib/dataService'
import { invalidateCache } from '@/lib/cache'

export async function POST() {
  invalidateCache()
  const data = await getData(true)
  return NextResponse.json({
    skills: data.skills.length,
    projects: data.projects.length,
    lastScanned: data.lastScanned,
  })
}
