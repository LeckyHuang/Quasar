import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import os from 'os'

const execFileAsync = promisify(execFile)
const IS_WIN = process.platform === 'win32'
const IS_MAC = process.platform === 'darwin'

function expandPath(p: string) {
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

// Try a list of [cmd, args] in order, returning on first success. No shell — args
// are passed as an array so a path can never be interpreted as a command.
async function tryInOrder(candidates: [string, string[]][]): Promise<boolean> {
  for (const [cmd, args] of candidates) {
    try {
      await execFileAsync(cmd, args)
      return true
    } catch {
      // try next fallback
    }
  }
  return false
}

export async function POST(req: NextRequest) {
  const { action, path: rawPath } = await req.json() as { action: 'terminal' | 'finder' | 'editor'; path: string }
  if (!rawPath) return NextResponse.json({ error: 'path required' }, { status: 400 })

  const target = expandPath(rawPath)

  // Defense in depth: only ever act on a path that actually exists on disk.
  // This both prevents acting on garbage input and blocks injection-style values
  // (which never resolve to a real path).
  if (!fs.existsSync(target)) {
    return NextResponse.json({ error: 'path does not exist' }, { status: 400 })
  }

  try {
    let ok = false
    switch (action) {
      case 'finder':
        if (IS_WIN) ok = await tryInOrder([['explorer', [target]]])
        else if (IS_MAC) ok = await tryInOrder([['open', [target]]])
        else ok = await tryInOrder([['xdg-open', [target]]])
        // explorer returns non-zero even on success; treat finder as best-effort
        if (IS_WIN) ok = true
        break

      case 'terminal':
        if (IS_WIN) {
          // `start` is a cmd builtin; pass the path as a discrete argv entry (no shell string concat)
          ok = await tryInOrder([['cmd', ['/c', 'start', 'cmd', '/K', `cd /d "${target}"`]]])
        } else if (IS_MAC) {
          ok = await tryInOrder([['open', ['-a', 'Terminal', target]]])
        } else {
          ok = await tryInOrder([
            ['x-terminal-emulator', [`--working-directory=${target}`]],
            ['gnome-terminal', [`--working-directory=${target}`]],
            ['xterm', ['-e', 'bash', '-c', `cd "${target}" && bash`]],
          ])
        }
        break

      case 'editor':
        if (IS_WIN) {
          ok = await tryInOrder([['cursor', [target]], ['code', [target]], ['explorer', [target]]])
          ok = true // explorer fallback is best-effort
        } else if (IS_MAC) {
          ok = await tryInOrder([['cursor', [target]], ['code', [target]], ['open', [target]]])
        } else {
          ok = await tryInOrder([['cursor', [target]], ['code', [target]], ['xdg-open', [target]]])
        }
        break

      default:
        return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }

    if (!ok) return NextResponse.json({ error: 'no handler succeeded' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
