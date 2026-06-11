import { notFound } from 'next/navigation';
import { getData } from '@/lib/dataService';
import { getRecentCommits } from '@/lib/git/gitClient';
import fs from 'fs';
import path from 'path';
import ProjectDetailClient from './ProjectDetailClient';

const EXCLUDE_DIRS = new Set(['.git', 'node_modules', 'dist', '.next', '__pycache__', 'venv', '.venv', '.cache', 'build', 'out'])

function countFiles(dir: string): number {
  let count = 0
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (EXCLUDE_DIRS.has(entry.name)) continue
      if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name))
      else count++
    }
  } catch {}
  return count
}

function getProjectExtras(projectPath: string) {
  const pkgPath = path.join(projectPath, 'package.json')
  let scripts: Record<string, string> = {}
  let depCount = 0

  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      scripts = pkg.scripts || {}
      depCount = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).length
    } catch {}
  } else {
    const reqPath = path.join(projectPath, 'requirements.txt')
    if (fs.existsSync(reqPath)) {
      try {
        depCount = fs.readFileSync(reqPath, 'utf-8').split('\n').filter(l => l.trim() && !l.startsWith('#')).length
      } catch {}
    }
  }

  let makeTargets: string[] = []
  const makefilePath = path.join(projectPath, 'Makefile')
  if (fs.existsSync(makefilePath)) {
    try {
      const content = fs.readFileSync(makefilePath, 'utf-8')
      makeTargets = (content.match(/^([a-zA-Z][a-zA-Z0-9_-]+):/gm) || []).map(m => m.slice(0, -1)).filter(t => t !== 'PHONY')
    } catch {}
  }

  return {
    fileCount: countFiles(projectPath),
    hasEnv: fs.existsSync(path.join(projectPath, '.env')),
    hasEnvExample: fs.existsSync(path.join(projectPath, '.env.example')),
    depCount,
    scripts,
    makeTargets,
  }
}

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { projects } = await getData();
  const project = projects.find(p => p.id === id);
  if (!project) notFound();

  const readFile = (filename: string) => {
    const fp = path.join(project.path, filename);
    if (!fs.existsSync(fp)) return null;
    try { return fs.readFileSync(fp, 'utf-8'); } catch { return null; }
  };

  const readmeContent = readFile('README.md') || readFile('readme.md') || '';
  const claudeContent = readFile('CLAUDE.md') || '';
  const agentsContent = readFile('AGENTS.md') || '';
  const deployContent = project.deployFiles.length > 0
    ? readFile(project.deployFiles[0]) || ''
    : '';

  // ahead/behind come from the scanner's local `git rev-list` (no network fetch);
  // only fetch the recent commit log here (local `git log`, also offline).
  const commits = project.hasGitRemote ? await getRecentCommits(project.path) : [];

  const ahead = project.gitAhead;
  const behind = project.gitBehind;

  const projectData = {
    ...project,
    lastModified: project.lastModified instanceof Date ? project.lastModified.toISOString() : project.lastModified,
  };

  const extras = getProjectExtras(project.path);

  return (
    <ProjectDetailClient
      project={projectData as never}
      readmeContent={readmeContent}
      claudeContent={claudeContent}
      agentsContent={agentsContent}
      deployContent={deployContent}
      commits={commits}
      ahead={ahead}
      behind={behind}
      extras={extras}
    />
  );
}
