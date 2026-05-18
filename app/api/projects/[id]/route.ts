import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { getData } from '@/lib/dataService'
import { getGitStatus, getRecentCommits } from '@/lib/git/gitClient'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { projects } = await getData()
  const project = projects.find(p => p.id === id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Read text files
  const readFile = (filename: string): string | null => {
    const fp = path.join(project.path, filename)
    if (!fs.existsSync(fp)) return null
    try { return fs.readFileSync(fp, 'utf-8') } catch { return null }
  }

  const readmeContent = readFile('README.md') || readFile('readme.md') || readFile('README.txt')
  const claudeContent = readFile('CLAUDE.md')
  const agentsContent = readFile('AGENTS.md')

  const deployContent: Record<string, string> = {}
  for (const f of project.deployFiles) {
    const content = readFile(f)
    if (content) deployContent[f] = content.slice(0, 3000) // cap at 3kb per file
  }

  // Live git status (ahead/behind)
  let gitStatus = null
  let commits: { hash: string; message: string; date: string; author: string }[] = []
  if (project.hasGitRemote) {
    [gitStatus, commits] = await Promise.all([
      getGitStatus(project.path),
      getRecentCommits(project.path),
    ])
  }

  return NextResponse.json({
    ...project,
    gitAhead: gitStatus?.ahead ?? project.gitAhead,
    gitBehind: gitStatus?.behind ?? project.gitBehind,
    readmeContent: readmeContent?.slice(0, 8000) || null,
    claudeContent,
    agentsContent,
    deployContent,
    commits,
  })
}
