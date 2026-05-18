'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Link2, Link2Off, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Badge, Chip, Spinner } from '@/components/ui';

interface Pitfall {
  id: string;
  problem: string;
  solution: string;
  lessons: string;
  linkedProjects: string[];
}

interface ProjectOption {
  id: string;
  name: string;
}

/* ─── Pitfall Card ─── */
function PitfallCard({
  pitfall,
  projects,
  onLink,
  onUnlink,
  linkingId,
}: {
  pitfall: Pitfall;
  projects: ProjectOption[];
  onLink: (pitfallId: string, projectId: string) => void;
  onUnlink: (pitfallId: string, projectId: string) => void;
  linkingId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showLinkMenu, setShowLinkMenu] = useState(false);

  const unlinked = projects.filter(p => !pitfall.linkedProjects.includes(p.id));

  return (
    <div className="subcard" style={{ borderLeft: '3px solid var(--warn)' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}
        onClick={() => setExpanded(v => !v)}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-1)', lineHeight: 1.5 }}>
            {pitfall.problem}
          </div>
          {pitfall.linkedProjects.length > 0 && !expanded && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
              {pitfall.linkedProjects.map(pid => {
                const p = projects.find(p => p.id === pid);
                return p ? <Chip key={pid} style={{ fontSize: 10.5 }}>{p.name}</Chip> : null;
              })}
            </div>
          )}
        </div>
        {expanded
          ? <ChevronUp size={13} style={{ color: 'var(--tx-3)', flexShrink: 0, marginTop: 3 }} />
          : <ChevronDown size={13} style={{ color: 'var(--tx-3)', flexShrink: 0, marginTop: 3 }} />}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pitfall.solution && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--tx-3)', marginBottom: 4 }}>解法</div>
              <div style={{ fontSize: 12.5, color: 'var(--tx-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{pitfall.solution}</div>
            </div>
          )}
          {pitfall.lessons && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--tx-3)', marginBottom: 4 }}>教训</div>
              <div style={{ fontSize: 12.5, color: 'var(--ok)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontWeight: 500 }}>{pitfall.lessons}</div>
            </div>
          )}

          {/* Project links */}
          <div style={{ borderTop: '1px solid var(--hl-1)', paddingTop: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--tx-3)', marginBottom: 8 }}>关联项目</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {pitfall.linkedProjects.map(pid => {
                const p = projects.find(p => p.id === pid);
                if (!p) return null;
                return (
                  <span key={pid} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'var(--ac-1)20', border: '1px solid var(--ac-1)40',
                    borderRadius: 5, padding: '3px 8px', fontSize: 11.5, color: 'var(--ac-1)',
                  }}>
                    {p.name}
                    <button onClick={() => onUnlink(pitfall.id, pid)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--ac-1)', lineHeight: 1, display: 'flex' }}>
                      <Link2Off size={10} />
                    </button>
                  </span>
                );
              })}

              {/* Link menu */}
              {unlinked.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <button className="btn btn--ghost btn--sm" onClick={() => setShowLinkMenu(v => !v)}
                    disabled={linkingId === pitfall.id}>
                    {linkingId === pitfall.id ? <Spinner size={11} /> : <Link2 size={11} />} 关联项目
                  </button>
                  {showLinkMenu && (
                    <div style={{
                      position: 'absolute', left: 0, top: '110%', zIndex: 50,
                      background: 'var(--bg-0)', border: '1px solid var(--hl-2)',
                      borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      minWidth: 180, padding: '4px 0',
                    }}>
                      {unlinked.map(p => (
                        <button key={p.id} onClick={() => { onLink(pitfall.id, p.id); setShowLinkMenu(false); }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '7px 14px', fontSize: 13, color: 'var(--tx-1)', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {pitfall.linkedProjects.length === 0 && unlinked.length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--tx-3)' }}>暂无关联项目</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function PitfallsPage() {
  const [pitfalls, setPitfalls] = useState<Pitfall[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [pf, prj] = await Promise.all([
      fetch('/api/pitfalls').then(r => r.json()).catch(() => []),
      fetch('/api/projects').then(r => r.json()).catch(() => []),
    ]);
    setPitfalls(pf);
    setProjects((prj as { id: string; name: string }[]).map(p => ({ id: p.id, name: p.name })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = pitfalls;
    if (filterProject) list = list.filter(p => p.linkedProjects.includes(filterProject));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p =>
        p.problem.toLowerCase().includes(q) ||
        p.solution.toLowerCase().includes(q) ||
        p.lessons.toLowerCase().includes(q)
      );
    }
    return list;
  }, [pitfalls, filterProject, query]);

  const handleLink = async (pitfallId: string, projectId: string) => {
    setLinkingId(pitfallId);
    try {
      await fetch('/api/pitfalls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pitfallId, projectId }) });
      setPitfalls(prev => prev.map(p => p.id === pitfallId ? { ...p, linkedProjects: [...p.linkedProjects, projectId] } : p));
    } finally { setLinkingId(null); }
  };

  const handleUnlink = async (pitfallId: string, projectId: string) => {
    await fetch(`/api/pitfalls?pitfallId=${pitfallId}&projectId=${projectId}`, { method: 'DELETE' });
    setPitfalls(prev => prev.map(p => p.id === pitfallId ? { ...p, linkedProjects: p.linkedProjects.filter(id => id !== projectId) } : p));
  };

  return (
    <div className="page">
      <div className="page__top">
        <div className="page__crumbs">
          <span className="page__crumb-current">踩坑库 · Pitfall Library</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--hl-1)', borderRadius: 10, padding: '14px 20px', minWidth: 140 }}>
          <div style={{ fontSize: 11, color: 'var(--tx-3)', marginBottom: 4 }}>踩坑记录</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--f-mono)', color: 'var(--warn)' }}>{pitfalls.length}</div>
        </div>
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--hl-1)', borderRadius: 10, padding: '14px 20px', minWidth: 140 }}>
          <div style={{ fontSize: 11, color: 'var(--tx-3)', marginBottom: 4 }}>已关联项目</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--f-mono)', color: 'var(--ac-1)' }}>
            {new Set(pitfalls.flatMap(p => p.linkedProjects)).size}
          </div>
        </div>
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--hl-1)', borderRadius: 10, padding: '14px 20px', flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, color: 'var(--tx-3)', marginBottom: 4 }}>数据来源</div>
          <div style={{ fontSize: 12.5, color: 'var(--tx-2)', fontFamily: 'var(--f-mono)' }}>~/.claude/session-log.md</div>
          <div style={{ fontSize: 11, color: 'var(--tx-3)', marginTop: 2 }}>由 Claude Code 自动写入 · 无需手动录入</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-3)', pointerEvents: 'none' }} />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="搜索问题 / 解法 / 教训…"
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, background: 'var(--bg-1)', border: '1px solid var(--hl-2)', borderRadius: 7, fontSize: 13, color: 'var(--tx-1)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          style={{ background: 'var(--bg-1)', border: '1px solid var(--hl-2)', borderRadius: 7, padding: '8px 12px', fontSize: 13, color: filterProject ? 'var(--tx-1)' : 'var(--tx-3)', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
          <option value="">全部项目</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {(query || filterProject) && (
          <button className="btn btn--ghost btn--sm" onClick={() => { setQuery(''); setFilterProject(''); }}>清除筛选</button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--tx-3)' }}><Spinner size={20} /></div>
      ) : pitfalls.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <AlertTriangle size={32} style={{ color: 'var(--tx-3)', marginBottom: 12 }} />
          <div style={{ fontSize: 14, color: 'var(--tx-2)', marginBottom: 6 }}>session-log.md 中暂无踩坑记录</div>
          <div style={{ fontSize: 12, color: 'var(--tx-3)' }}>在 Claude Code 会话收工时，告诉 Claude 记录踩坑内容，下次自动出现在这里</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--tx-3)', fontSize: 13 }}>没有匹配的记录</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(p => (
            <PitfallCard key={p.id} pitfall={p} projects={projects} onLink={handleLink} onUnlink={handleUnlink} linkingId={linkingId} />
          ))}
        </div>
      )}
    </div>
  );
}
