import simpleGit from 'simple-git'
import type { SyncResult } from '@/types'

// NOTE: ahead/behind status is read locally (offline) by the scanners via
// `git rev-list`. Network access only happens through the explicit sync actions
// below (Fetch / Pull / Push), never on page load.

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
