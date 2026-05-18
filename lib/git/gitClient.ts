import simpleGit from 'simple-git'
import type { SyncResult } from '@/types'

export interface GitStatus {
  ahead: number
  behind: number
  isClean: boolean
  branch: string
  hasRemote: boolean
}

export async function getGitStatus(repoPath: string): Promise<GitStatus> {
  try {
    const git = simpleGit(repoPath)
    const remotes = await git.getRemotes(true)
    if (remotes.length === 0) {
      return { ahead: 0, behind: 0, isClean: true, branch: '', hasRemote: false }
    }
    await git.fetch(['--quiet'])
    const status = await git.status()
    return {
      ahead: status.ahead,
      behind: status.behind,
      isClean: status.isClean(),
      branch: status.current || '',
      hasRemote: true,
    }
  } catch {
    return { ahead: 0, behind: 0, isClean: true, branch: '', hasRemote: false }
  }
}

export async function gitFetch(repoPath: string, id: string, type: 'skill' | 'project'): Promise<SyncResult> {
  try {
    const git = simpleGit(repoPath)
    await git.fetch()
    return { id, type, action: 'pull', success: true, message: 'Fetch successful', timestamp: new Date().toISOString() }
  } catch (e) {
    return { id, type, action: 'pull', success: false, message: String(e), timestamp: new Date().toISOString() }
  }
}

export async function gitPull(repoPath: string, id: string, type: 'skill' | 'project'): Promise<SyncResult> {
  try {
    const git = simpleGit(repoPath)
    await git.pull()
    return { id, type, action: 'pull', success: true, message: 'Pull successful', timestamp: new Date().toISOString() }
  } catch (e) {
    return { id, type, action: 'pull', success: false, message: String(e), timestamp: new Date().toISOString() }
  }
}

export async function gitPush(repoPath: string, id: string, type: 'skill' | 'project'): Promise<SyncResult> {
  try {
    const git = simpleGit(repoPath)
    await git.push()
    return { id, type, action: 'push', success: true, message: 'Push successful', timestamp: new Date().toISOString() }
  } catch (e) {
    return { id, type, action: 'push', success: false, message: String(e), timestamp: new Date().toISOString() }
  }
}

export async function getRecentCommits(repoPath: string, count = 5): Promise<{ hash: string; message: string; date: string; author: string }[]> {
  try {
    const git = simpleGit(repoPath)
    const log = await git.log({ maxCount: count })
    return log.all.map(c => ({
      hash: c.hash.slice(0, 7),
      message: c.message,
      date: c.date,
      author: c.author_name,
    }))
  } catch {
    return []
  }
}
