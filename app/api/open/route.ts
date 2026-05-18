import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import os from 'os'

const execAsync = promisify(exec)
const IS_WIN = process.platform === 'win32'
const IS_MAC = process.platform === 'darwin'

function expandPath(p: string) {
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

function quote(p: string) {
  // On Windows use double quotes; on Unix wrap with double quotes
  return IS_WIN ? `"${p}"` : `"${p}"`
}

export async function POST(req: NextRequest) {
  const { action, path: rawPath } = await req.json() as { action: 'terminal' | 'finder' | 'editor'; path: string }
  if (!rawPath) return NextResponse.json({ error: 'path required' }, { status: 400 })

  const target = expandPath(rawPath)

  try {
    switch (action) {
      case 'finder':
        if (IS_WIN) await execAsync(`explorer ${quote(target)}`)
        else if (IS_MAC) await execAsync(`open ${quote(target)}`)
        else await execAsync(`xdg-open ${quote(target)}`)
        break

      case 'terminal':
        if (IS_WIN) {
          await execAsync(`start cmd /K "cd /d ${quote(target)}"`)
        } else if (IS_MAC) {
          await execAsync(`open -a Terminal ${quote(target)}`)
        } else {
          // Linux: try common terminal emulators
          await execAsync(
            `x-terminal-emulator --working-directory=${quote(target)} || ` +
            `gnome-terminal --working-directory=${quote(target)} || ` +
            `xterm -e "cd ${quote(target)} && bash"`
          )
        }
        break

      case 'editor':
        if (IS_WIN) {
          // Try Cursor, then VS Code, then explorer as fallback
          await execAsync(
            `cursor ${quote(target)} || code ${quote(target)} || explorer ${quote(target)}`
          )
        } else if (IS_MAC) {
          await execAsync(
            `cursor ${quote(target)} 2>/dev/null || code ${quote(target)} 2>/dev/null || open ${quote(target)}`
          )
        } else {
          await execAsync(
            `cursor ${quote(target)} || code ${quote(target)} || xdg-open ${quote(target)}`
          )
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
