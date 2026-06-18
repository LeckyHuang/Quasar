import { NextRequest, NextResponse } from 'next/server'
import { listReports } from '@/lib/reportStore'
import type { ReportRunType, ReportTargetType } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const runType = searchParams.get('runType') as ReportRunType | null
  const targetType = searchParams.get('targetType') as ReportTargetType | null
  const targetPath = searchParams.get('targetPath') || undefined
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

  const reports = listReports({
    runType: runType ?? undefined,
    targetType: targetType ?? undefined,
    targetPath,
    limit,
  })

  return NextResponse.json({ reports })
}
