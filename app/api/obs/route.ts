import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { readConfig } from '@/lib/config'

function resolveObsDbPath(): string | null {
  const configured = readConfig().obsDbPath
  if (!configured) return null
  const expanded = configured.startsWith('~/')
    ? path.join(os.homedir(), configured.slice(2))
    : configured
  return fs.existsSync(expanded) ? expanded : null
}

// Structured empty payload so the Obs tab shows a clean zero-state instead of an error
// when no obs.db is configured (or the configured file is missing).
function emptyObsPayload(days: number) {
  return {
    ok: true,
    summary: {
      total_calls: 0, error_count: 0, error_rate: 0, avg_latency_ms: 0,
      total_cost_cny: 0, total_tokens: 0, period_days: days,
    },
    by_day: [], by_model: [], recent_errors: [], recent_calls: [],
  }
}

// Python 脚本：查询 obs.db，返回 JSON
function queryObs(dbPath: string, project: string | null, days: number): string {
  const script = `
import sqlite3, json, time, sys

db_path = ${JSON.stringify(dbPath)}
project = ${project ? JSON.stringify(project) : 'None'}
since = time.time() - ${days} * 86400

try:
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row

    where = "ts >= ?"
    args = [since]
    if project:
        where += " AND project = ?"
        args.append(project)

    # 汇总
    r = db.execute(f"""
        SELECT COUNT(*) AS total_calls,
               SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) AS error_count,
               AVG(CASE WHEN status='ok' THEN latency_ms END) AS avg_latency_ms,
               SUM(cost_cny) AS total_cost_cny,
               SUM(total_tokens) AS total_tokens
        FROM llm_calls WHERE {where}
    """, args).fetchone()
    total = r["total_calls"] or 0
    summary = {
        "total_calls": total,
        "error_count": r["error_count"] or 0,
        "error_rate": round((r["error_count"] or 0) / total, 4) if total else 0,
        "avg_latency_ms": round(r["avg_latency_ms"] or 0, 1),
        "total_cost_cny": round(r["total_cost_cny"] or 0, 4),
        "total_tokens": r["total_tokens"] or 0,
        "period_days": ${days},
    }

    # 按天
    by_day = [dict(x) for x in db.execute(f"""
        SELECT DATE(ts,'unixepoch','localtime') AS day,
               COUNT(*) AS calls, SUM(cost_cny) AS cost_cny,
               AVG(CASE WHEN status='ok' THEN latency_ms END) AS avg_latency_ms,
               SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) AS errors
        FROM llm_calls WHERE {where}
        GROUP BY day ORDER BY day
    """, args).fetchall()]

    # 按模型
    by_model = [dict(x) for x in db.execute(f"""
        SELECT model, provider, COUNT(*) AS calls,
               SUM(total_tokens) AS total_tokens, SUM(cost_cny) AS cost_cny,
               AVG(latency_ms) AS avg_latency_ms
        FROM llm_calls WHERE {where}
        GROUP BY model, provider ORDER BY calls DESC LIMIT 10
    """, args).fetchall()]

    # 最近错误
    recent_errors = [dict(x) for x in db.execute(f"""
        SELECT id, ts, project, operation, model, error_msg, latency_ms
        FROM llm_calls WHERE status='error' AND {where}
        ORDER BY ts DESC LIMIT 20
    """, args).fetchall()]

    # 最近调用
    recent_calls = [dict(x) for x in db.execute(f"""
        SELECT id, ts, project, operation, model, provider,
               input_tokens, output_tokens, latency_ms, cost_cny, status
        FROM llm_calls WHERE {where}
        ORDER BY ts DESC LIMIT 50
    """, args).fetchall()]

    db.close()
    print(json.dumps({"ok": True, "summary": summary, "by_day": by_day,
                      "by_model": by_model, "recent_errors": recent_errors,
                      "recent_calls": recent_calls}))
except Exception as e:
    print(json.dumps({"ok": False, "error": str(e)}))
`
  return script
}

export async function GET(req: NextRequest) {
  const project = req.nextUrl.searchParams.get('project') || null
  const rawDays = parseInt(req.nextUrl.searchParams.get('days') || '7', 10)
  const days = isNaN(rawDays) || rawDays <= 0 ? 7 : Math.min(rawDays, 365)

  const dbPath = resolveObsDbPath()
  if (!dbPath) return NextResponse.json(emptyObsPayload(days))

  try {
    const out = execSync(`python3 -c '${queryObs(dbPath, project, days).replace(/'/g, "'\\''")}'`, {
      timeout: 8000,
      encoding: 'utf8',
    })
    const data = JSON.parse(out.trim())
    if (!data.ok) return NextResponse.json({ error: data.error }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
