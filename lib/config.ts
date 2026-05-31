import fs from 'fs'
import path from 'path'
import os from 'os'
import type { QuasarConfig } from '@/types'

const CONFIG_DIR = path.join(os.homedir(), '.quasar')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

const DEFAULT_CONFIG: QuasarConfig = {
  skillsDirs: [],
  projectsDirs: [],
  appearance: 'dark',
  autoScan: true,
  scanIntervalMs: 300000,
  obsServices: [],
  alertRules: [],
}

export function readConfig(): QuasarConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return DEFAULT_CONFIG
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8')
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function writeConfig(config: QuasarConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

export function isFirstRun(): boolean {
  return !fs.existsSync(CONFIG_FILE)
}
