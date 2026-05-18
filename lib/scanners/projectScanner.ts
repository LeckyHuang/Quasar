import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import type { ProjectMeta } from '@/types'

const DEPLOY_FILES = ['DEPLOY.md', 'DEPLOYMENT.md', 'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'vercel.json', 'railway.json', '.github/workflows']

function detectTechStack(projectPath: string): string[] {
  const stack: string[] = []
  const pkgPath = path.join(projectPath, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      if (deps.next) stack.push('Next.js')
      if (deps.react && !deps.next) stack.push('React')
      if (deps.vue) stack.push('Vue')
      if (deps.vite) stack.push('Vite')
      if (deps.nuxt) stack.push('Nuxt')
      if (deps.typescript || deps['@types/node']) stack.push('TypeScript')
      if (deps.tailwindcss) stack.push('Tailwind')
    } catch {}
  }
  for (const pyFile of ['pyproject.toml', 'requirements.txt', 'setup.py']) {
    const fp = path.join(projectPath, pyFile)
    if (!fs.existsSync(fp)) continue
    stack.push('Python')
    try {
      const content = fs.readFileSync(fp, 'utf-8')
      if (content.includes('fastapi')) stack.push('FastAPI')
      if (content.includes('flask')) stack.push('Flask')
      if (content.includes('django')) stack.push('Django')
      if (content.includes('sqlalchemy')) stack.push('SQLAlchemy')
      if (content.includes('anthropic') || content.includes('@anthropic')) stack.push('Claude API')
    } catch {}
    break
  }
  return [...new Set(stack)]
}

function detectType(projectPath: string, techStack: string[]): ProjectMeta['type'] {
  const hasSkillMd = fs.existsSync(path.join(projectPath, 'SKILL.md'))
  if (hasSkillMd) return 'skill-source'
  const hasFrontend = fs.existsSync(path.join(projectPath, 'frontend')) || techStack.some(t => ['React', 'Vue', 'Next.js', 'Nuxt'].includes(t))
  const hasBackend = fs.existsSync(path.join(projectPath, 'backend')) || techStack.some(t => ['FastAPI', 'Flask', 'Django'].includes(t))
  if (hasFrontend && hasBackend) return 'fullstack'
  if (hasFrontend) return 'frontend'
  if (hasBackend) return 'backend'
  const hasTxt = fs.readdirSync(projectPath).some(f => f.endsWith('.txt') || f.endsWith('.md'))
  const hasCode = fs.readdirSync(projectPath).some(f => f.endsWith('.py') || f.endsWith('.ts') || f.endsWith('.js'))
  if (hasTxt && !hasCode) return 'content'
  return 'unknown'
}

function getGitInfo(projectPath: string): { remote?: string; branch?: string; lastCommit?: { message: string; date: string } } {
  try {
    const gitDir = path.join(projectPath, '.git')
    if (!fs.existsSync(gitDir)) return {}
    const configPath = path.join(gitDir, 'config')
    let remote: string | undefined
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, 'utf-8')
      const m = config.match(/url\s*=\s*(.+)/m)
      if (m) remote = m[1].trim()
    }
    let branch: string | undefined
    const headPath = path.join(gitDir, 'HEAD')
    if (fs.existsSync(headPath)) {
      const head = fs.readFileSync(headPath, 'utf-8').trim()
      const bm = head.match(/ref: refs\/heads\/(.+)/)
      if (bm) branch = bm[1]
    }
    let lastCommit: { message: string; date: string } | undefined
    const commitMsgPath = path.join(gitDir, 'COMMIT_EDITMSG')
    if (fs.existsSync(commitMsgPath)) {
      const msg = fs.readFileSync(commitMsgPath, 'utf-8').trim().split('\n')[0]
      const stat = fs.statSync(commitMsgPath)
      lastCommit = { message: msg, date: stat.mtime.toISOString() }
    }
    return { remote, branch, lastCommit }
  } catch {
    return {}
  }
}

function getDescription(projectPath: string): string {
  for (const name of ['README.md', 'readme.md', 'README.txt']) {
    const fp = path.join(projectPath, name)
    if (!fs.existsSync(fp)) continue
    try {
      const lines = fs.readFileSync(fp, 'utf-8').split('\n')
      const desc = lines.find(l => l.trim() && !l.startsWith('#'))
      return desc?.trim() || lines[0]?.replace(/^#+\s*/, '').trim() || ''
    } catch {}
  }
  return ''
}

function getGitAheadBehind(projectPath: string): { ahead: number; behind: number } {
  try {
    const gitDir = path.join(projectPath, '.git')
    if (!fs.existsSync(gitDir)) return { ahead: 0, behind: 0 }
    const out = execFileSync('git', ['rev-list', '--left-right', '--count', 'HEAD...@{u}'], {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    const [a, b] = out.split(/\s+/).map(Number)
    return { ahead: a || 0, behind: b || 0 }
  } catch {
    return { ahead: 0, behind: 0 }
  }
}

function findDeployFiles(projectPath: string): string[] {
  return DEPLOY_FILES.filter(f => fs.existsSync(path.join(projectPath, f)))
}

function calculateHealthScore(project: Omit<ProjectMeta, 'healthScore'>): number {
  let score = 0
  if (project.hasGitRemote) score += 40
  if (project.hasClaudeConfig) score += 30
  if (project.hasDeployConfig) score += 20
  if (project.gitAhead === 0 && project.hasGitRemote) score += 10
  return score
}

export async function scanProjectsDir(dir: string): Promise<ProjectMeta[]> {
  const expanded = dir.replace(/^~/, process.env.HOME || '')
  if (!fs.existsSync(expanded)) return []

  const projects: ProjectMeta[] = []
  const entries = fs.readdirSync(expanded, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const projectPath = path.join(expanded, entry.name)

    try {
      const techStack = detectTechStack(projectPath)
      const { remote, branch, lastCommit } = getGitInfo(projectPath)
      const deployFiles = findDeployFiles(projectPath)
      const stat = fs.statSync(projectPath)
      const { ahead: gitAhead, behind: gitBehind } = remote ? getGitAheadBehind(projectPath) : { ahead: 0, behind: 0 }

      const partial: Omit<ProjectMeta, 'healthScore'> = {
        id: entry.name,
        name: entry.name,
        description: getDescription(projectPath),
        path: projectPath,
        type: detectType(projectPath, techStack),
        techStack,
        hasGitRemote: !!remote,
        gitRemote: remote,
        gitBranch: branch,
        lastCommit,
        gitAhead,
        gitBehind,
        hasClaudeConfig: fs.existsSync(path.join(projectPath, 'CLAUDE.md')),
        hasAgentsConfig: fs.existsSync(path.join(projectPath, 'AGENTS.md')),
        hasDeployConfig: deployFiles.length > 0,
        deployFiles,
        lastModified: stat.mtime,
        sourceDir: expanded,
      }

      projects.push({ ...partial, healthScore: calculateHealthScore(partial) })
    } catch {
      // skip unreadable dir
    }
  }

  return projects
}

export async function scanAllProjects(dirs: string[]): Promise<ProjectMeta[]> {
  const results = await Promise.all(dirs.map(scanProjectsDir))
  return results.flat()
}
