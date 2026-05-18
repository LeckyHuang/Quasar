import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'

const execAsync = promisify(exec)

// Expand ~ to home directory
function expandPath(p: string) {
  if (p.startsWith('~/')) return path.join(process.env.HOME || '', p.slice(2))
  return p
}

export async function POST(req: NextRequest) {
  const { action, path: rawPath } = await req.json() as { action: 'terminal' | 'finder' | 'editor'; path: string }

  if (!rawPath) return NextResponse.json({ error: 'path required' }, { status: 400 })

  const target = expandPath(rawPath)

  try {
    switch (action) {
      case 'finder':
        await execAsync(`open "${target}"`)
        break
      case 'terminal':
        // Open a new Terminal window cd'd to the path
        await execAsync(`open -a Terminal "${target}"`)
        break
      case 'editor':
        // Try cursor first, fall back to code, then default editor
        try {
          await execAsync(`cursor "${target}" 2>/dev/null || code "${target}" 2>/dev/null || open "${target}"`)
        } catch {
          await execAsync(`open "${target}"`)
        }
        break
      default:
        return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
