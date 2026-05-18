import { notFound } from 'next/navigation';
import { getData } from '@/lib/dataService';
import fs from 'fs';
import path from 'path';
import { getRecentCommits } from '@/lib/git/gitClient';
import SkillDetailClient from './SkillDetailClient';

function getRelatedProjects(skillName: string, skillId: string, projects: { id: string; name: string; path: string; type: string }[]) {
  return projects
    .filter(p => {
      if (p.type === 'skill-source' && (p.name === skillId || p.name === skillName)) return true
      for (const filename of ['CLAUDE.md', 'README.md', 'AGENTS.md']) {
        const fp = path.join(p.path, filename)
        if (!fs.existsSync(fp)) continue
        try {
          const content = fs.readFileSync(fp, 'utf-8')
          if (content.toLowerCase().includes(skillName.toLowerCase()) || content.toLowerCase().includes(skillId.toLowerCase())) return true
        } catch {}
      }
      return false
    })
    .map(p => ({ id: p.id, name: p.name }))
}

function getUsageTimeline(triggerWords: string[], skillName: string): { date: string; count: number }[] {
  const historyPath = path.join(process.env.HOME || '', '.claude', 'history.jsonl')
  if (!fs.existsSync(historyPath)) return []

  const words = [...triggerWords, skillName].map(w => w.toLowerCase()).filter(Boolean)
  if (words.length === 0) return []

  const counts: Record<string, number> = {}
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

  try {
    const lines = fs.readFileSync(historyPath, 'utf-8').split('\n')
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const entry = JSON.parse(line)
        if (!entry.timestamp || entry.timestamp < thirtyDaysAgo) continue
        const display = (entry.display || '').toLowerCase()
        if (words.some(w => display.includes(w))) {
          const date = new Date(entry.timestamp).toISOString().slice(0, 10)
          counts[date] = (counts[date] || 0) + 1
        }
      } catch {}
    }
  } catch {}

  return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }))
}

export const dynamic = 'force-dynamic';

export default async function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { skills, projects } = await getData();
  const skill = skills.find(s => s.id === id);
  if (!skill) notFound();

  const skillMdPath = path.join(skill.path, 'SKILL.md');
  const skillMdContent = fs.existsSync(skillMdPath) ? fs.readFileSync(skillMdPath, 'utf-8') : '';

  const commits = skill.hasGit ? await getRecentCommits(skill.path) : [];

  const templatesDir = path.join(skill.path, 'templates');
  const templateFiles: { name: string; size: number }[] = [];
  if (fs.existsSync(templatesDir)) {
    const walk = (dir: string, prefix = '') => {
      for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        const rel = prefix ? `${prefix}/${entry}` : entry;
        if (fs.statSync(full).isDirectory()) walk(full, rel);
        else templateFiles.push({ name: rel, size: fs.statSync(full).size });
      }
    };
    walk(templatesDir);
  }

  const relatedProjects = getRelatedProjects(skill.name, skill.id, projects)
  const usageTimeline = getUsageTimeline(skill.triggerWords, skill.name)

  const skillData = {
    ...skill,
    lastModified: skill.lastModified instanceof Date ? skill.lastModified.toISOString() : skill.lastModified,
  };

  return (
    <SkillDetailClient
      skill={skillData as never}
      skillMdContent={skillMdContent}
      commits={commits}
      templateFiles={templateFiles}
      relatedProjects={relatedProjects}
      usageTimeline={usageTimeline}
    />
  );
}
