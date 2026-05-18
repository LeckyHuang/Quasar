'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Plus, LayoutGrid, List, CheckCircle, AlertCircle, Clock, MoreHorizontal, FolderOpen, ExternalLink } from 'lucide-react';
import type { SkillMeta } from '@/types';
import { Chip, CatChip, Heat, Badge, Segmented, Bi } from '@/components/ui';

const CAT_COLORS: Record<string, string> = {
  engineering: '#5B8DEF',
  content: '#E07AC7',
  design: '#A78BFA',
  data: '#4ED4B5',
  uncategorized: '#74747F',
};
const CAT_LABELS: Record<string, string> = {
  engineering: 'Engineering',
  content: 'Content',
  design: 'Design',
  data: 'Data',
  uncategorized: 'Other',
};

function timeAgo(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function heatLevel(count: number): 'hot' | 'warm' | 'cold' {
  if (count > 10) return 'hot';
  if (count > 3) return 'warm';
  return 'cold';
}

function SkillCard({ s }: { s: SkillMeta }) {
  return (
    <Link href={`/skills/${s.id}`} className="skill-card" style={{ textDecoration: 'none' }}>
      <div className="card-hover-actions">
        <button className="icon-btn" title="在 Finder 打开" onClick={e => e.preventDefault()}>
          <FolderOpen size={13} />
        </button>
        <button className="icon-btn" title="在编辑器打开" onClick={e => e.preventDefault()}>
          <ExternalLink size={13} />
        </button>
      </div>
      <div className="skill-card__hd">
        <div style={{ flex: 1 }}>
          <div className="skill-card__name">{s.name}</div>
          <div style={{ marginTop: 4 }}><CatChip catId={s.category} /></div>
        </div>
      </div>
      <div className="skill-card__desc">{s.description}</div>
      <div className="skill-card__chips">
        {s.triggerWords.slice(0, 3).map(t => <Chip key={t} mono>{t}</Chip>)}
        {s.triggerWords.length > 3 && <Chip mono>+{s.triggerWords.length - 3}</Chip>}
      </div>
      <div className="skill-card__ft">
        <Heat level={heatLevel(s.usageCount)} />
        {s.hasGit
          ? <Badge tone="soft"><CheckCircle size={10} strokeWidth={2.4} style={{ color: 'var(--ok)' }} /> 已同步</Badge>
          : <Badge tone="warn">本地</Badge>}
        <span className="spacer" />
        <span><Clock size={10} strokeWidth={1.8} style={{ verticalAlign: '-1.5px', marginRight: 4, opacity: 0.7 }} />{timeAgo(s.lastModified)}</span>
      </div>
    </Link>
  );
}

function SkillRow({ s }: { s: SkillMeta }) {
  return (
    <Link href={`/skills/${s.id}`} className="list__row" style={{ textDecoration: 'none' }}>
      <div className="list__row-main">
        <span className="list__row-name">{s.name}</span>
        <span className="list__row-desc">{s.description}</span>
      </div>
      <div><CatChip catId={s.category} /></div>
      <div><Heat level={heatLevel(s.usageCount)} /></div>
      <div>
        {s.hasGit
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ok)', fontSize: 11.5 }}><CheckCircle size={12} strokeWidth={2} /> Git</span>
          : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--warn)', fontSize: 11.5 }}><AlertCircle size={12} strokeWidth={2} /> 本地</span>}
      </div>
      <div className="tx-3 mono" style={{ fontSize: 11 }}>{s.templates.length} 文件</div>
      <div className="tx-3" style={{ fontSize: 11.5 }}>{timeAgo(s.lastModified)}</div>
      <div><MoreHorizontal size={14} style={{ color: 'var(--tx-3)' }} /></div>
    </Link>
  );
}

export default function SkillsClient({ skills }: { skills: SkillMeta[] }) {
  const [sort, setSort] = useState('updated');
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const filtered = skills.filter(s => {
    if (filter !== 'all' && s.category !== filter) return false;
    if (q && !s.name.toLowerCase().includes(q.toLowerCase()) && !s.description.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'usage') return b.usageCount - a.usageCount;
    return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
  });

  const counts: Record<string, number> = { all: skills.length };
  skills.forEach(s => { counts[s.category] = (counts[s.category] || 0) + 1; });

  const cats = Array.from(new Set(skills.map(s => s.category)));
  const gitCount = skills.filter(s => s.hasGit).length;
  const localCount = skills.filter(s => !s.hasGit).length;

  return (
    <div className="page">
      <div className="page__top">
        <h1 className="page__title">
          <Bi en="Skills" cn="技能" />
          <span className="tx-3" style={{ fontWeight: 400, fontSize: 13 }}>· {skills.length}</span>
        </h1>
        <div className="page__top-actions">
          <div className="search" style={{ width: 240 }}>
            <Search size={13} />
            <input className="input" placeholder="Search skills · 搜索…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Segmented value={sort} onChange={setSort} options={[
            { value: 'usage', label: 'Usage' },
            { value: 'updated', label: 'Updated' },
            { value: 'name', label: 'Name' },
          ]} />
          <Segmented value={view} onChange={v => setView(v as 'grid' | 'list')} options={[
            { value: 'grid', label: '', icon: <LayoutGrid size={12} /> },
            { value: 'list', label: '', icon: <List size={12} /> },
          ]} />
          <button className="btn btn--primary"><Plus size={13} /> New Skill</button>
        </div>
      </div>

      <div className="page__scroll">
        <div className="page__body">
          <div className="with-filter">
            <aside className="filter-side">
              <div>
                <h3>Category · 类别</h3>
                <div className="filter-side__group">
                  <div className={`filter-item ${filter === 'all' ? 'filter-item--active' : ''}`} onClick={() => setFilter('all')}>
                    <span className="filter-item__sw" style={{ background: 'var(--tx-3)' }} />
                    All <span className="filter-item__count">{counts.all}</span>
                  </div>
                  {cats.map(cat => (
                    <div key={cat} className={`filter-item ${filter === cat ? 'filter-item--active' : ''}`} onClick={() => setFilter(cat)}>
                      <span className="filter-item__sw" style={{ background: CAT_COLORS[cat] || 'var(--tx-3)' }} />
                      {CAT_LABELS[cat] || cat} <span className="filter-item__count">{counts[cat] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3>Status · 状态</h3>
                <div className="filter-side__group">
                  <div className="filter-item">
                    <span className="filter-item__sw" style={{ background: 'var(--ok)' }} />
                    Git Synced <span className="filter-item__count">{gitCount}</span>
                  </div>
                  <div className="filter-item">
                    <span className="filter-item__sw" style={{ background: 'var(--warn)' }} />
                    Local only <span className="filter-item__count">{localCount}</span>
                  </div>
                </div>
              </div>
            </aside>

            <div>
              {view === 'grid' ? (
                <div className="grid">
                  {sorted.map(s => <SkillCard key={s.id} s={s} />)}
                </div>
              ) : (
                <div className="list">
                  <div className="list__hd">
                    <span>Name · 名称</span>
                    <span>Category · 类别</span>
                    <span>Heat</span>
                    <span>Status</span>
                    <span>Files</span>
                    <span>Updated</span>
                    <span></span>
                  </div>
                  {sorted.map(s => <SkillRow key={s.id} s={s} />)}
                </div>
              )}
              {sorted.length === 0 && (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--tx-3)' }}>
                  No skills match your filter
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
