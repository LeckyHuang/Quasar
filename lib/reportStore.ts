import fs from 'fs'
import path from 'path'
import os from 'os'
import type { QuasarReport, ReportRunType, ReportTargetType } from '@/types'

const REPORTS_DIR = path.join(os.homedir(), '.quasar', 'reports')
const PENDING_DIR = path.join(os.homedir(), '.quasar', 'pending')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function listReports(opts?: {
  runType?: ReportRunType
  targetType?: ReportTargetType
  targetPath?: string
  limit?: number
}): QuasarReport[] {
  ensureDir(REPORTS_DIR)
  let files: string[]
  try {
    files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.json'))
  } catch {
    return []
  }

  const reports: QuasarReport[] = []
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(REPORTS_DIR, file), 'utf-8')
      const report = JSON.parse(raw) as QuasarReport
      if (opts?.runType && report.runType !== opts.runType) continue
      if (opts?.targetType && report.targetType !== opts.targetType) continue
      if (opts?.targetPath && report.targetPath !== opts.targetPath) continue
      reports.push(report)
    } catch {
      // skip malformed files
    }
  }

  reports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return opts?.limit ? reports.slice(0, opts.limit) : reports
}

export function writeReport(report: QuasarReport): void {
  ensureDir(REPORTS_DIR)
  const file = path.join(REPORTS_DIR, `${report.id}.json`)
  fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf-8')
}

export function writeLaunchScript(opts: {
  skillType: ReportRunType
  targetPath: string
  targetName: string
}): string {
  ensureDir(PENDING_DIR)

  const ts = Date.now()
  const filename = `launch-${opts.skillType}-${opts.targetName.replace(/[^a-z0-9_-]/gi, '_')}-${ts}.command`
  const scriptPath = path.join(PENDING_DIR, filename)

  const labels: Record<ReportRunType, { en: string; trigger: string }> = {
    'darwin': { en: 'darwin-skill · Skill 评估与进化', trigger: '/darwin-skill' },
    'test-architect': { en: 'test-architect · 测试', trigger: '/test-architect' },
    'skill-universalizer': { en: 'skill-universalizer · 通用化评估', trigger: '/skill-universalizer' },
  }
  const label = labels[opts.skillType]

  const script = `#!/bin/bash
cd "${opts.targetPath}"
clear
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║       QUASAR Launch Bridge                      ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  工具: ${label.en.padEnd(42)}║"
echo "║  目标: ${opts.targetName.padEnd(42)}║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  已定位到目标目录："
echo "  $(pwd)"
echo ""
echo "  请运行 claude，然后在会话中输入："
echo ""
echo "    ${label.trigger}"
echo ""
echo "─────────────────────────────────────────────────"
exec $SHELL -l
`

  fs.writeFileSync(scriptPath, script, { encoding: 'utf-8', mode: 0o755 })
  return scriptPath
}
