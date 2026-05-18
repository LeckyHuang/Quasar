import fs from 'fs'
import path from 'path'
import os from 'os'
import type { CacheData } from '@/types'

const CACHE_FILE = path.join(os.homedir(), '.quasar', 'cache.json')
const CACHE_VERSION = 1

export function readCache(): CacheData | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8')
    const data = JSON.parse(raw) as CacheData
    if (data.version !== CACHE_VERSION) return null
    return data
  } catch {
    return null
  }
}

export function writeCache(data: Omit<CacheData, 'version' | 'lastScanned'>): void {
  const cacheDir = path.dirname(CACHE_FILE)
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }
  const full: CacheData = {
    ...data,
    version: CACHE_VERSION,
    lastScanned: new Date().toISOString(),
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(full, null, 2), 'utf-8')
}

export function invalidateCache(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE)
  } catch {}
}

export function getCacheAge(): number | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as CacheData
    return Date.now() - new Date(data.lastScanned).getTime()
  } catch {
    return null
  }
}
