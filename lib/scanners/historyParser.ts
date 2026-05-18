import fs from 'fs'
import path from 'path'
import os from 'os'

const HISTORY_FILE = path.join(os.homedir(), '.claude', 'history.jsonl')

interface HistoryEntry {
  display?: string
  timestamp?: number
}

export function buildUsageMap(triggerWordMap: Record<string, string[]>): Record<string, number> {
  const usageMap: Record<string, number> = {}

  if (!fs.existsSync(HISTORY_FILE)) return usageMap

  try {
    const lines = fs.readFileSync(HISTORY_FILE, 'utf-8').split('\n').filter(Boolean)
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as HistoryEntry
        if (!entry.display) continue
        const display = entry.display.toLowerCase()
        for (const [skillId, words] of Object.entries(triggerWordMap)) {
          if (words.some(w => display.includes(w.toLowerCase()))) {
            usageMap[skillId] = (usageMap[skillId] || 0) + 1
          }
        }
      } catch {}
    }
  } catch {}

  return usageMap
}

export function getHistoryStats(): { totalEntries: number; oldestEntry?: Date; newestEntry?: Date } {
  if (!fs.existsSync(HISTORY_FILE)) return { totalEntries: 0 }
  try {
    const lines = fs.readFileSync(HISTORY_FILE, 'utf-8').split('\n').filter(Boolean)
    const timestamps: number[] = []
    for (const line of lines) {
      try {
        const e = JSON.parse(line) as HistoryEntry
        if (e.timestamp) timestamps.push(e.timestamp)
      } catch {}
    }
    return {
      totalEntries: lines.length,
      oldestEntry: timestamps.length ? new Date(Math.min(...timestamps)) : undefined,
      newestEntry: timestamps.length ? new Date(Math.max(...timestamps)) : undefined,
    }
  } catch {
    return { totalEntries: 0 }
  }
}
