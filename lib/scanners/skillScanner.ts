import fs from 'fs'
import path from 'path'
import os from 'os'
import { execFileSync } from 'child_process'
import matter from 'gray-matter'
import type { SkillMeta } from '@/types'

const SKILL_CATEGORIES: Record<string, string> = {
  'novel-writer': '内容创作',
  'social-content-pipeline': '内容创作',
  'rapid-proto': '内容创作',
  'cloud-design': '设计视觉',
  'frontend-design': '设计视觉',
  graphify: '设计视觉',
  'darwin-skill': '设计视觉',
  'skill-creator': '工程开发',
  'mcp-builder': '工程开发',
  'test-architect': '工程开发',
  'webapp-testing': '工程开发',
  'agent-reach': '工程开发',
  xlsx: '数据文档',
  pdf: '数据文档',
  docx: '数据文档',
}

function extractTriggerWords(description: string): string[] {
  const triggerMatch = description.match(/触发词(?:包括)?[：:]\s*([^\n]+)/m)
  if (!triggerMatch) return []
  const raw = triggerMatch[1].replace(/等[。.]?\s*$/, '')
  return raw
    .split(/[、,，\s]+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 10)
}

function getTemplates(skillPath: string): string[] {
  const templatesDir = path.join(skillPath, 'templates')
  if (!fs.existsSync(templatesDir)) return []
  return fs.readdirSync(templatesDir, { recursive: true })
    .filter((f) => typeof f === 'string' && !fs.statSync(path.join(templatesDir, f)).isDirectory())
    .map(String)
}

function getGitRemote(skillPath: string): string | undefined {
  try {
    const gitConfig = path.join(skillPath, '.git', 'config')
    if (!fs.existsSync(gitConfig)) return undefined
    const content = fs.readFileSync(gitConfig, 'utf-8')
    const match = content.match(/url\s*=\s*(.+)/m)
    return match?.[1]?.trim()
  } catch {
    return undefined
  }
}

function getGitAheadBehind(skillPath: string): { ahead: number; behind: number } {
  try {
    const out = execFileSync('git', ['rev-list', '--left-right', '--count', 'HEAD...@{u}'], {
      cwd: skillPath, encoding: 'utf-8', timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    const [a, b] = out.split(/\s+/).map(Number)
    return { ahead: a || 0, behind: b || 0 }
  } catch {
    return { ahead: 0, behind: 0 }
  }
}

function getGitBranch(skillPath: string): string | undefined {
  try {
    const head = path.join(skillPath, '.git', 'HEAD')
    if (!fs.existsSync(head)) return undefined
    const content = fs.readFileSync(head, 'utf-8').trim()
    // "ref: refs/heads/main" → "main"
    const match = content.match(/^ref: refs\/heads\/(.+)$/)
    return match?.[1] ?? content.slice(0, 7) // detached HEAD: show short hash
  } catch {
    return undefined
  }
}

export async function scanSkillsDir(dir: string, usageMap: Record<string, number> = {}): Promise<SkillMeta[]> {
  const expanded = dir.replace(/^~/, os.homedir())
  if (!fs.existsSync(expanded)) return []

  const skills: SkillMeta[] = []
  const entries = fs.readdirSync(expanded, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const skillPath = path.join(expanded, entry.name)
    const skillMdPath = path.join(skillPath, 'SKILL.md')
    if (!fs.existsSync(skillMdPath)) continue

    try {
      const raw = fs.readFileSync(skillMdPath, 'utf-8')
      const { data, content } = matter(raw)
      const stat = fs.statSync(skillMdPath)
      const hasGit = fs.existsSync(path.join(skillPath, '.git'))
      const gitRemote = getGitRemote(skillPath)
      const gitBranch = hasGit ? getGitBranch(skillPath) : undefined
      const { ahead: gitAhead, behind: gitBehind } = hasGit && gitRemote ? getGitAheadBehind(skillPath) : { ahead: 0, behind: 0 }

      const name: string = data.name || entry.name
      const description: string = typeof data.description === 'string' ? data.description : content.slice(0, 300)
      const triggerWords = extractTriggerWords(description)
      const id = entry.name

      skills.push({
        id,
        name,
        description,
        category: data.category || SKILL_CATEGORIES[id] || '未分类',
        tags: Array.isArray(data.tags) ? data.tags : [],
        triggerWords,
        path: skillPath,
        lastModified: stat.mtime,
        hasGit,
        gitRemote,
        gitBranch,
        gitAhead,
        gitBehind,
        usageCount: usageMap[id] || 0,
        templates: getTemplates(skillPath),
        sourceDir: expanded,
      })
    } catch {
      // skip malformed skill
    }
  }

  return skills
}

export async function scanAllSkills(dirs: string[], usageMap: Record<string, number> = {}): Promise<SkillMeta[]> {
  const results = await Promise.all(dirs.map((d) => scanSkillsDir(d, usageMap)))
  return results.flat()
}
