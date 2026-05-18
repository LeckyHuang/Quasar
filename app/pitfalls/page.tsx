'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Link2, Link2Off, ChevronDown, ChevronUp } from 'lucide-react';
import { Chip, Spinner } from '@/components/ui';

interface Pitfall {
  id: string;
  problem: string;
  solution: string;
  lessons: string;
  linkedProjects: string[];
  linkedSkills: string[];
}

interface EntityOption {
  id: string;
  name: string;
}

/* ─── Pitfall Card ─── */
function PitfallCard({
  pitfall,
  projects,
  skills,
  onLink,
  onUnlink,
  linkingId,
}: {
  pitfall: Pitfall;
  projects: EntityOption[];
  skills: EntityOption[];
  onLink: (pitfallId: string, entityId: string, type: 'project' | 'skill') => void;
  onUnlink: (pitfallId: string, entityId: string, type: 'project' | 'skill') => void;
  linkingId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showLinkMenu, setShowLinkMenu] = useState(false);

  const unlinkedProjects = projects.filter(p => !pitfall.linkedProjects.includes(p.id));
  const unlinkedSkills = skills.filter(s => !pitfall.linkedSkills.includes(s.id));
  const hasUnlinked = unlinkedProjects.length > 0 || unlinkedSkills.length > 0;

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
          {(pitfall.linkedProjects.length > 0 || pitfall.linkedSkills.length > 0) && !expanded && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
              {pitfall.linkedProjects.map(pid => {
                const p = projects.find(p => p.id === pid);
                return p ? <Chip key={pid} style={{ fontSize: 10.5 }}>📁 {p.name}</Chip> : null;
              })}
              {pitfall.linkedSkills.map(sid => {
                const s = skills.find(s => s.id === sid);
                return s ? <Chip key={sid} style={{ fontSize: 10.5, background: 'var(--ac-1)15', borderColor: 'var(--ac-1)40', color: 'var(--ac-1)' }}>✦ {s.name}</Chip> : null;
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

          {/* Linked entities */}
          <div style={{ borderTop: '1px solid var(--hl-1)', paddingTop: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--tx-3)', marginBottom: 8 }}>关联对象</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>

              {/* Linked projects */}
              {pitfall.linkedProjects.map(pid => {
                const p = projects.find(p => p.id === pid);
                if (!p) return null;
                return (
                  <span key={pid} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'var(--bg-2)', border: '1px solid var(--hl-2)',
                    borderRadius: 5, padding: '3px 8px', fontSize: 11.5, color: 'var(--tx-2)',
                  }}>
                    <span style={{ fontSize: 10 }}>📁</span>{p.name}
                    <button onClick={() => onUnlink(pitfall.id, pid, 'project')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--tx-3)', lineHeight: 1, display: 'flex' }}>
                      <Link2Off size={10} />
                    </button>
                  </span>
                );
              })}

              {/* Linked skills */}
              {pitfall.linkedSkills.map(sid => {
                const s = skills.find(s => s.id === sid);
                if (!s) return null;
                return (
                  <span key={sid} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'var(--ac-1)15', border: '1px solid var(--ac-1)40',
                    borderRadius: 5, padding: '3px 8px', fontSize: 11.5, color: 'var(--ac-1)',
                  }}>
                    <span style={{ fontSize: 10 }}>✦</span>{s.name}
                    <button onClick={() => onUnlink(pitfall.id, sid, 'skill')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--ac-1)', lineHeight: 1, display: 'flex' }}>
                      <Link2Off size={10} />
                    </button>
                  </span>
                );
              })}

              {/* Link menu */}
              {hasUnlinked && (
                <div style={{ position: 'relative' }}>
                  <button className="btn btn--ghost btn--sm" onClick={() => setShowLinkMenu(v => !v)}
                    disabled={linkingId === pitfall.id}>
                    {linkingId === pitfall.id ? <Spinner size={11} /> : <Link2 size={11} />} 关联
                  </button>
                  {showLinkMenu && (
                    <div style={{
                      position: 'absolute', left: 0, top: '110%', zIndex: 50,
                      background: 'var(--bg-0)', border: '1px solid var(--hl-2)',
                      borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      minWidth: 200, maxWidth: 260, padding: '4px 0',
                    }}>
                      {unlinkedProjects.length > 0 && (
                        <>
                          <div style={{ padding: '5px 12px 3px', fontSize: 10.5, color: 'var(--tx-3)', fontWeight: 600, letterSpacing: '0.05em' }}>项目</div>
                          {unlinkedProjects.map(p => (
                            <button key={p.id} onClick={() => { onLink(pitfall.id, p.id, 'project'); setShowLinkMenu(false); }}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '7px 14px', fontSize: 13, color: 'var(--tx-1)', cursor: 'pointer' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                              <span style={{ fontSize: 11 }}>📁</span>{p.name}
                            </button>
                          ))}
                        </>
                      )}
                      {unlinkedSkills.length > 0 && (
                        <>
                          {unlinkedProjects.length > 0 && <div style={{ height: 1, background: 'var(--hl-1)', margin: '3px 0' }} />}
                          <div style={{ padding: '5px 12px 3px', fontSize: 10.5, color: 'var(--tx-3)', fontWeight: 600, letterSpacing: '0.05em' }}>Skill</div>
                          {unlinkedSkills.map(s => (
                            <button key={s.id} onClick={() => { onLink(pitfall.id, s.id, 'skill'); setShowLinkMenu(false); }}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '7px 14px', fontSize: 13, color: 'var(--tx-1)', cursor: 'pointer' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                              <span style={{ fontSize: 11 }}>✦</span>{s.name}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {pitfall.linkedProjects.length === 0 && pitfall.linkedSkills.length === 0 && !hasUnlinked && (
                <span style={{ fontSize: 12, color: 'var(--tx-3)' }}>暂无关联</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function LessonsPage() {
  const [pitfalls, setPitfalls] = useState<Pitfall[]>([]);
  const [projects, setProjects] = useState<EntityOption[]>([]);
  const [skills, setSkills] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterSkill, setFilterSkill] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [pf, prj, sk] = await Promise.all([
      fetch('/api/pitfalls').then(r => r.json()).catch(() => []),
      fetch('/api/projects').then(r => r.json()).catch(() => []),
      fetch('/api/skills').then(r => r.json()).catch(() => []),
    ]);
    setPitfalls(pf);
    setProjects((prj as { id: string; name: string }[]).map(p => ({ id: p.id, name: p.name })));
    setSkills((sk as { id: string; name: string }[]).map(s => ({ id: s.id, name: s.name })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = pitfalls;
    if (filterProject) list = list.filter(p => p.linkedProjects.includes(filterProject));
    if (filterSkill) list = list.filter(p => p.linkedSkills.includes(filterSkill));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p =>
        p.problem.toLowerCase().includes(q) ||
        p.solution.toLowerCase().includes(q) ||
        p.lessons.toLowerCase().includes(q)
      );
    }
    return list;
  }, [pitfalls, filterProject, filterSkill, query]);

  const handleLink = async (pitfallId: string, entityId: string, type: 'project' | 'skill') => {
    setLinkingId(pitfallId);
    try {
      await fetch('/api/pitfalls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type === 'project'
          ? { pitfallId, projectId: entityId }
          : { pitfallId, skillId: entityId }),
      });
      setPitfalls(prev => prev.map(p => {
        if (p.id !== pitfallId) return p;
        return type === 'project'
          ? { ...p, linkedProjects: [...p.linkedProjects, entityId] }
          : { ...p, linkedSkills: [...p.linkedSkills, entityId] };
      }));
    } finally { setLinkingId(null); }
  };

  const handleUnlink = async (pitfallId: string, entityId: string, type: 'project' | 'skill') => {
    const param = type === 'project' ? `projectId=${entityId}` : `skillId=${entityId}`;
    await fetch(`/api/pitfalls?pitfallId=${pitfallId}&${param}`, { method: 'DELETE' });
    setPitfalls(prev => prev.map(p => {
      if (p.id !== pitfallId) return p;
      return type === 'project'
        ? { ...p, linkedProjects: p.linkedProjects.filter(id => id !== entityId) }
        : { ...p, linkedSkills: p.linkedSkills.filter(id => id !== entityId) };
    }));
  };

  const linkedProjectCount = new Set(pitfalls.flatMap(p => p.linkedProjects)).size;
  const linkedSkillCount = new Set(pitfalls.flatMap(p => p.linkedSkills)).size;

  return (
    <div className="page">
      <div className="page__top">
        <div className="page__crumbs">
          <span className="page__crumb-current">教训集 · Lessons</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--hl-1)', borderRadius: 10, padding: '14px 20px', minWidth: 130 }}>
          <div style={{ fontSize: 11, color: 'var(--tx-3)', marginBottom: 4 }}>教训记录</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--f-mono)', color: 'var(--warn)' }}>{pitfalls.length}</div>
        </div>
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--hl-1)', borderRadius: 10, padding: '14px 20px', minWidth: 130 }}>
          <div style={{ fontSize: 11, color: 'var(--tx-3)', marginBottom: 4 }}>关联项目</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--f-mono)', color: 'var(--ac-1)' }}>{linkedProjectCount}</div>
        </div>
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--hl-1)', borderRadius: 10, padding: '14px 20px', minWidth: 130 }}>
          <div style={{ fontSize: 11, color: 'var(--tx-3)', marginBottom: 4 }}>关联 Skill</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--f-mono)', color: 'var(--ac-1)' }}>{linkedSkillCount}</div>
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
        <select value={filterProject} onChange={e => { setFilterProject(e.target.value); setFilterSkill(''); }}
          style={{ background: 'var(--bg-1)', border: '1px solid var(--hl-2)', borderRadius: 7, padding: '8px 12px', fontSize: 13, color: filterProject ? 'var(--tx-1)' : 'var(--tx-3)', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
          <option value="">全部项目</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterSkill} onChange={e => { setFilterSkill(e.target.value); setFilterProject(''); }}
          style={{ background: 'var(--bg-1)', border: '1px solid var(--hl-2)', borderRadius: 7, padding: '8px 12px', fontSize: 13, color: filterSkill ? 'var(--tx-1)' : 'var(--tx-3)', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
          <option value="">全部 Skill</option>
          {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {(query || filterProject || filterSkill) && (
          <button className="btn btn--ghost btn--sm" onClick={() => { setQuery(''); setFilterProject(''); setFilterSkill(''); }}>清除筛选</button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--tx-3)' }}><Spinner size={20} /></div>
      ) : pitfalls.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 14, color: 'var(--tx-2)', marginBottom: 6 }}>session-log.md 中暂无教训记录</div>
          <div style={{ fontSize: 12, color: 'var(--tx-3)' }}>在 Claude Code 会话收工时，告诉 Claude 记录踩坑内容，下次自动出现在这里</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--tx-3)', fontSize: 13 }}>没有匹配的记录</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(p => (
            <PitfallCard
              key={p.id} pitfall={p}
              projects={projects} skills={skills}
              onLink={handleLink} onUnlink={handleUnlink}
              linkingId={linkingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
