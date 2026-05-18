import { readConfig } from './config'
import { readCache, writeCache, getCacheAge } from './cache'
import { scanAllSkills } from './scanners/skillScanner'
import { scanAllProjects } from './scanners/projectScanner'
import { buildUsageMap } from './scanners/historyParser'
import type { SkillMeta, ProjectMeta } from '@/types'

const CACHE_MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes

export interface DataPayload {
  skills: SkillMeta[]
  projects: ProjectMeta[]
  lastScanned: string | null
  fromCache: boolean
}

export async function getData(forceRefresh = false): Promise<DataPayload> {
  const age = getCacheAge()
  if (!forceRefresh && age !== null && age < CACHE_MAX_AGE_MS) {
    const cached = readCache()
    if (cached) {
      return { skills: cached.skills, projects: cached.projects, lastScanned: cached.lastScanned, fromCache: true }
    }
  }

  const config = readConfig()
  const skills = await scanAllSkills(config.skillsDirs)

  // Build trigger word map for usage counting
  const triggerWordMap: Record<string, string[]> = {}
  for (const skill of skills) {
    triggerWordMap[skill.id] = skill.triggerWords
  }
  const usageMap = buildUsageMap(triggerWordMap)

  // Re-scan with usage data
  const skillsWithUsage = await scanAllSkills(config.skillsDirs, usageMap)
  const projects = await scanAllProjects(config.projectsDirs)

  writeCache({ skills: skillsWithUsage, projects })

  return {
    skills: skillsWithUsage,
    projects,
    lastScanned: new Date().toISOString(),
    fromCache: false,
  }
}
