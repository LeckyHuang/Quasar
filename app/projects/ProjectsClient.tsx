'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Terminal, FolderOpen, Clock, GitBranch, AlertTriangle } from 'lucide-react';
import type { ProjectMeta } from '@/types';
import { HealthRing, Badge, Chip, Segmented, Bi } from '@/components/ui';

function timeAgo(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ProjCard({ p }: { p: ProjectMeta }) {
  return (
    <Link href={`/projects/${p.id}`} className="proj-card" style={{ textDecoration: 'none' }}>
      <div className="card-hover-actions" style={{ top: 56 }}>
        <button className="icon-btn" title="在终端打开" onClick={e => { e.preventDefault(); fetch('/api/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'terminal', path: p.path }) }) }}>
          <Terminal size={13} />
        </button>
        <button className="icon-btn" title="在 Finder 打开" onClick={e => { e.preventDefault(); fetch('/api/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'finder', path: p.path }) }) }}>
          <FolderOpen size={13} />
        </button>
      </div>

      <div className="proj-card__health">
        <HealthRing value={p.healthScore} size={38} stroke={4} />
      </div>

      <div className="proj-card__hd">
        <div className="proj-card__hd-main">
          <div className="proj-card__name">{p.name}</div>
          <Badge tone="soft">{p.type}</Badge>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {p.techStack.slice(0, 4).map(t => <Chip key={t}>{t}</Chip>)}
      </div>

      {p.hasGitRemote && p.gitRemote ? (
        <div className="proj-card__statline">
          <GitBranch size={11} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.gitRemote.replace('git@github.com:', '').replace('https://github.com/', '').replace('.git', '')}
          </span>
        </div>
      ) : (
        <div className="proj-card__statline" style={{ color: 'var(--warn)' }}>
          <AlertTriangle size={11} /> 没有 Git Remote
        </div>
      )}

      <div className="proj-card__commit">
        {p.lastCommit?.message || '暂无提交信息'}
      </div>

      <div className="proj-card__indicators">
        <span className="proj-card__indicator">
          <span className={`proj-card__indicator-dot ${p.hasClaudeConfig ? 'proj-card__indicator-dot--ok' : 'proj-card__indicator-dot--bad'}`} />
          CLAUDE.md
        </span>
        <span className="proj-card__indicator">
          <span className={`proj-card__indicator-dot ${p.hasDeployConfig ? 'proj-card__indicator-dot--ok' : 'proj-card__indicator-dot--warn'}`} />
          部署
        </span>
        <span className="spacer" />
        <span style={{ fontSize: 11 }}>
          <Clock size={10} strokeWidth={1.8} style={{ verticalAlign: '-1.5px', marginRight: 4, opacity: 0.7 }} />
          {timeAgo(p.lastModified)}
        </span>
      </div>
    </Link>
  );
}

export default function ProjectsClient({ projects }: { projects: ProjectMeta[] }) {
  const [sort, setSort] = useState('updated');
  const [filterType, setFilterType] = useState('all');
  const [q, setQ] = useState('');

  const types = Array.from(new Set(projects.map(p => p.type)));
  const counts: Record<string, number> = { all: projects.length };
  projects.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1; });

  const filtered = projects.filter(p => {
    if (filterType !== 'all' && p.type !== filterType) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !p.description.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'health') return b.healthScore - a.healthScore;
    return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
  });

  const gitCount = projects.filter(p => p.hasGitRemote).length;
  const noGitCount = projects.filter(p => !p.hasGitRemote).length;
  const hasClaudeCount = projects.filter(p => p.hasClaudeConfig).length;
  const noClaudeCount = projects.filter(p => !p.hasClaudeConfig).length;

  return (
    <div className="page">
      <div className="page__top">
        <h1 className="page__title">
          <Bi en="Projects" cn="项目" />
          <span className="tx-3" style={{ fontWeight: 400, fontSize: 13 }}>· {projects.length}</span>
        </h1>
        <div className="page__top-actions">
          <div className="search" style={{ width: 240 }}>
            <Search size={13} />
            <input className="input" placeholder="Search projects · 搜索…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Segmented value={sort} onChange={setSort} options={[
            { value: 'health', label: 'Health' },
            { value: 'updated', label: 'Updated' },
            { value: 'name', label: 'Name' },
          ]} />
        </div>
      </div>

      <div className="page__scroll">
        <div className="page__body">
          <div className="with-filter">
            <aside className="filter-side">
              <div>
                <h3>Type · 类型</h3>
                <div className="filter-side__group">
                  <div className={`filter-item ${filterType === 'all' ? 'filter-item--active' : ''}`} onClick={() => setFilterType('all')}>
                    <span className="filter-item__sw" style={{ background: 'var(--tx-3)' }} />
                    All <span className="filter-item__count">{counts.all}</span>
                  </div>
                  {types.map(t => (
                    <div key={t} className={`filter-item ${filterType === t ? 'filter-item--active' : ''}`} onClick={() => setFilterType(t)}>
                      <span className="filter-item__sw" style={{ background: 'var(--ac-1)' }} />
                      {t} <span className="filter-item__count">{counts[t] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3>Git Remote</h3>
                <div className="filter-side__group">
                  <div className="filter-item">
                    <span className="filter-item__sw" style={{ background: 'var(--ok)' }} />
                    Configured <span className="filter-item__count">{gitCount}</span>
                  </div>
                  <div className="filter-item">
                    <span className="filter-item__sw" style={{ background: 'var(--bad)' }} />
                    None <span className="filter-item__count">{noGitCount}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3>Claude config</h3>
                <div className="filter-side__group">
                  <div className="filter-item">
                    <span className="filter-item__sw" style={{ background: 'var(--ok)' }} />
                    Has CLAUDE.md <span className="filter-item__count">{hasClaudeCount}</span>
                  </div>
                  <div className="filter-item">
                    <span className="filter-item__sw" style={{ background: 'var(--bad)' }} />
                    Missing <span className="filter-item__count">{noClaudeCount}</span>
                  </div>
                </div>
              </div>
            </aside>

            <div className="grid">
              {sorted.map(p => <ProjCard key={p.id} p={p} />)}
              {sorted.length === 0 && (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--tx-3)', gridColumn: '1/-1' }}>
                  No projects match your filter
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
