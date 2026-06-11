'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Terminal, FolderOpen, GitBranch, ArrowUp, ArrowDown, RefreshCw, Clock, ChevronDown, ChevronUp, Link2, Link2Off } from 'lucide-react';
import { HealthRing, Badge, Chip, AheadBehind, Markdown, Bi, useToast, ToastStack, Spinner } from '@/components/ui';
import ConstitutionEditor from '@/components/ConstitutionEditor';

/* ─── Pitfall type (from session-log.md) ─── */
interface Pitfall {
  id: string;
  problem: string;
  solution: string;
  lessons: string;
  linkedProjects: string[];
  linkedSkills: string[];
}

/* ─── ObsTab — LLM 可观测性数据 ─── */
interface ObsSummary {
  total_calls: number; error_count: number; error_rate: number;
  avg_latency_ms: number; total_cost_cny: number; total_tokens: number; period_days: number;
}
interface ObsCall {
  id: number; ts: number; project: string; operation: string; model: string;
  provider: string; input_tokens: number | null; output_tokens: number | null;
  latency_ms: number; cost_cny: number | null; status: string;
}
interface ObsError {
  id: number; ts: number; project: string; operation: string;
  model: string; error_msg: string; latency_ms: number;
}
interface ObsData {
  summary: ObsSummary;
  recent_calls: ObsCall[];
  recent_errors: ObsError[];
}

function fmtLatency(ms: number | null) {
  if (ms == null) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}
function fmtCost(v: number | null) {
  if (v == null) return '—';
  return v < 0.001 ? '<¥0.001' : `¥${v.toFixed(v < 1 ? 3 : 2)}`;
}
function fmtTs(ts: number) {
  const d = new Date(ts * 1000);
  return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function fmtTokens(v: number | null) {
  if (v == null) return '—';
  return v >= 1000 ? `${(v/1000).toFixed(1)}K` : String(v);
}

function ObsTab({ projectName }: { projectName: string }) {
  const [data, setData] = React.useState<ObsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [days, setDays] = React.useState(7);

  const load = React.useCallback(async (d: number) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/obs?project=${encodeURIComponent(projectName)}&days=${d}`);
      const json = await res.json();
      if (json.error) { setError(json.error); setData(null); }
      else setData(json);
    } catch (e) {
      setError(String(e));
    } finally { setLoading(false); }
  }, [projectName]);

  // Fetch-on-mount/refetch-on-change: load() sets loading state before awaiting.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional async data load
  useEffect(() => { load(days); }, [load, days]);

  const s = data?.summary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 顶部控制 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--tx-3)' }}>周期</span>
        {[7, 14, 30].map(d => (
          <button key={d}
            className={`btn btn--sm${days === d ? ' btn--active' : ''}`}
            style={days === d ? { background: 'var(--ac-1)', color: '#fff' } : {}}
            onClick={() => { setDays(d); load(d); }}>
            {d}d
          </button>
        ))}
        <button className="btn btn--sm" style={{ marginLeft: 'auto' }} onClick={() => load(days)}>↻ 刷新</button>
      </div>

      {loading && <div style={{ color: 'var(--tx-3)', fontSize: 13 }}><Spinner /> 加载中…</div>}
      {error && <div style={{ color: '#ef4444', fontSize: 12, fontFamily: 'monospace' }}>❌ {error}</div>}

      {!loading && !error && s && (
        <>
          {s.total_calls === 0 ? (
            <div style={{ color: 'var(--tx-3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
              暂无 LLM 调用记录<br />
              <span style={{ fontSize: 11 }}>obs 项目名需与 obs.init() 中传入的名称一致（当前：{projectName}）</span>
            </div>
          ) : (
            <>
              {/* 指标卡片 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { label: '总成本', value: fmtCost(s.total_cost_cny), color: '#10b981' },
                  { label: '平均响应', value: fmtLatency(s.avg_latency_ms), color: '#f59e0b' },
                  { label: '错误率', value: `${(s.error_rate * 100).toFixed(1)}%`, color: s.error_rate > 0.05 ? '#ef4444' : 'var(--tx-1)' },
                  { label: '调用总量', value: s.total_calls.toLocaleString(), color: '#3b82f6' },
                ].map(card => (
                  <div key={card.label} className="subcard" style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--tx-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: card.color }}>{card.value}</div>
                  </div>
                ))}
              </div>

              {/* 最近错误 */}
              {data!.recent_errors.length > 0 && (
                <div className="subcard">
                  <div className="subcard__hd">
                    <h3 className="subcard__title" style={{ color: '#ef4444' }}>⚠ 最近异常 · {data!.recent_errors.length} 条</h3>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--br-1)' }}>
                          {['时间', '操作', '模型', '错误', '耗时'].map(h => (
                            <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--tx-3)', fontWeight: 500, fontSize: 11 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data!.recent_errors.map(e => (
                          <tr key={e.id} style={{ borderBottom: '1px solid var(--br-1)' }}>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: 'var(--tx-3)', whiteSpace: 'nowrap' }}>{fmtTs(e.ts)}</td>
                            <td style={{ padding: '6px 10px', color: 'var(--tx-2)' }}>{e.operation || '—'}</td>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11 }}>{e.model || '—'}</td>
                            <td style={{ padding: '6px 10px', color: '#ef4444', fontFamily: 'monospace', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.error_msg || '—'}</td>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: 'var(--tx-3)' }}>{fmtLatency(e.latency_ms)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 最近调用 */}
              <div className="subcard">
                <div className="subcard__hd">
                  <h3 className="subcard__title">最近调用 · {data!.recent_calls.length} 条</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--br-1)' }}>
                        {['时间', '操作', '模型', 'Tokens', '耗时', '成本', '状态'].map(h => (
                          <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--tx-3)', fontWeight: 500, fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data!.recent_calls.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--br-1)', opacity: c.status === 'error' ? 0.8 : 1 }}>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: 'var(--tx-3)', whiteSpace: 'nowrap', fontSize: 11 }}>{fmtTs(c.ts)}</td>
                          <td style={{ padding: '6px 10px', color: 'var(--tx-2)', fontSize: 11 }}>{c.operation || '—'}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11 }}>{c.model || '—'}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11, color: 'var(--tx-3)' }}>{fmtTokens(c.input_tokens)}/{fmtTokens(c.output_tokens)}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: 'var(--tx-3)' }}>{fmtLatency(c.latency_ms)}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: '#10b981' }}>{fmtCost(c.cost_cny)}</td>
                          <td style={{ padding: '6px 10px' }}>
                            <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: 'monospace',
                              background: c.status === 'ok' ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)',
                              color: c.status === 'ok' ? '#10b981' : '#ef4444' }}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ─── PostmortemTab — session-log sourced pitfalls ─── */
function PostmortemTab({ projectId }: { projectId: string }) {
  const [linked, setLinked] = useState<Pitfall[]>([]);
  const [all, setAll] = useState<Pitfall[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [linkedRes, allRes] = await Promise.all([
        fetch(`/api/pitfalls?projectId=${projectId}`).then(r => r.json()).catch(() => []),
        fetch('/api/pitfalls').then(r => r.json()).catch(() => []),
      ]);
      setLinked(Array.isArray(linkedRes) ? linkedRes : []);
      setAll(Array.isArray(allRes) ? allRes : []);
    } finally {
      setLoading(false);
    }
  };

  // Fetch-on-mount: load() sets loading state before awaiting.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional async data load
  useEffect(() => { load(); }, [projectId]);

  const unlinked = all.filter(p => !linked.some(l => l.id === p.id));

  const handleLink = async (pitfallId: string) => {
    setLinkingId(pitfallId);
    try {
      await fetch('/api/pitfalls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitfallId, projectId }),
      });
      const found = all.find(p => p.id === pitfallId);
      if (found) setLinked(prev => [...prev, found]);
    } finally {
      setLinkingId(null);
      setShowLinkMenu(false);
    }
  };

  const handleUnlink = async (pitfallId: string) => {
    await fetch(`/api/pitfalls?pitfallId=${pitfallId}&projectId=${projectId}`, { method: 'DELETE' });
    setLinked(prev => prev.filter(p => p.id !== pitfallId));
    if (expandedId === pitfallId) setExpandedId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--tx-1)', flex: 1 }}>
          教训集
          <span style={{ color: 'var(--tx-3)', fontWeight: 400, fontSize: 12 }}>
            {' '}· 来自 session-log.md · 共 {linked.length} 条
          </span>
        </h3>
        {unlinked.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button className="btn btn--sm" onClick={() => setShowLinkMenu(v => !v)}>
              <Link2 size={11} /> 关联踩坑
            </button>
            {showLinkMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', zIndex: 50,
                background: 'var(--bg-0)', border: '1px solid var(--hl-2)',
                borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                minWidth: 260, maxWidth: 340, maxHeight: 300, overflowY: 'auto', padding: '4px 0',
              }}>
                {unlinked.map(p => (
                  <button key={p.id}
                    onClick={() => handleLink(p.id)}
                    disabled={linkingId === p.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      width: '100%', textAlign: 'left', background: 'none',
                      border: 'none', padding: '8px 14px', fontSize: 12.5,
                      color: 'var(--tx-1)', cursor: 'pointer', lineHeight: 1.4,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    {linkingId === p.id ? <Spinner size={11} /> : <span style={{ flexShrink: 0 }}>⚠️</span>}
                    <span>{p.problem.length > 60 ? p.problem.slice(0, 60) + '…' : p.problem}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--tx-3)' }}><Spinner size={20} /></div>
      ) : linked.length === 0 ? (
        <div className="subcard" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
          <div style={{ fontSize: 13, color: 'var(--tx-2)', marginBottom: 6 }}>暂无关联踩坑记录</div>
          <div style={{ fontSize: 12, color: 'var(--tx-3)' }}>
            {all.length > 0
              ? '点击「关联踩坑」将 session-log.md 中的踩坑记录与本项目关联'
              : '踩坑库为空 — 在 Claude Code 收工时告诉 Claude 记录踩坑，下次自动显示在这里'}
          </div>
        </div>
      ) : (
        linked.map(pitfall => (
          <div key={pitfall.id} className="subcard" style={{ borderLeft: '3px solid var(--warn)' }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, cursor: 'pointer', minWidth: 0 }}
                onClick={() => setExpandedId(expandedId === pitfall.id ? null : pitfall.id)}>
                <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-1)', lineHeight: 1.5, flex: 1 }}>
                  {pitfall.problem}
                </span>
                {expandedId === pitfall.id
                  ? <ChevronUp size={13} style={{ color: 'var(--tx-3)', flexShrink: 0, marginTop: 3 }} />
                  : <ChevronDown size={13} style={{ color: 'var(--tx-3)', flexShrink: 0, marginTop: 3 }} />}
              </div>
              <button
                onClick={() => handleUnlink(pitfall.id)}
                title="取消关联"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', padding: 4, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <Link2Off size={12} />
              </button>
            </div>

            {/* Expanded */}
            {expandedId === pitfall.id && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 22 }}>
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
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

interface ProjectData {
  id: string;
  name: string;
  description: string;
  path: string;
  type: string;
  techStack: string[];
  hasGitRemote: boolean;
  gitRemote?: string;
  gitBranch?: string;
  lastCommit?: { message: string; date: string };
  gitAhead: number;
  gitBehind: number;
  hasClaudeConfig: boolean;
  hasAgentsConfig: boolean;
  hasDeployConfig: boolean;
  deployFiles: string[];
  lastModified: string;
  healthScore: number;
}

interface CommitData { hash: string; message: string; date: string; }
interface ProjectExtras {
  fileCount: number;
  hasEnv: boolean;
  hasEnvExample: boolean;
  depCount: number;
  scripts: Record<string, string>;
  makeTargets: string[];
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Indicator({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
      <span style={{ color: 'var(--tx-2)' }}>{label}</span>
      <span style={{ color: ok ? 'var(--ok)' : 'var(--bad)', fontFamily: 'var(--f-mono)', fontSize: 11 }}>
        {ok ? '✓' : '✕'}
      </span>
    </div>
  );
}

export default function ProjectDetailClient({
  project, readmeContent, claudeContent, agentsContent, deployContent, commits, ahead, behind, extras,
}: {
  project: ProjectData;
  readmeContent: string;
  claudeContent: string;
  agentsContent: string;
  deployContent: string;
  commits: CommitData[];
  ahead: number;
  behind: number;
  extras: ProjectExtras;
}) {
  const router = useRouter();
  const [tab, setTab] = useState('readme');
  const [syncing, setSyncing] = useState<string | null>(null);
  const { toasts, show: showToast } = useToast();
  const [claudeDraft, setClaudeDraft] = useState(claudeContent);
  const [claudeSaving, setClaudeSaving] = useState(false);

  const sync = async (action: string) => {
    setSyncing(action);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'project', id: project.id, action }),
      });
      const data = await res.json();
      if (data.result?.success) showToast('ok', `${action === 'push' ? 'Push' : 'Pull'} succeeded`);
      else showToast('err', data.result?.message || data.error || 'Git operation failed');
    } catch {
      showToast('err', 'Network error');
    } finally { setSyncing(null); }
  };

  const hasRunCommands = Object.keys(extras.scripts).length > 0 || extras.makeTargets.length > 0;
  const tabs = [
    { id: 'readme', label: 'README', cn: '' },
    { id: 'git', label: 'Git', cn: '状态' },
    { id: 'claude', label: 'Claude', cn: '配置' },
    { id: 'deploy', label: 'Deploy', cn: '部署' },
    ...(hasRunCommands ? [{ id: 'run', label: 'Run', cn: '命令' }] : []),
    { id: 'postmortem', label: 'Lessons', cn: '教训' },
    { id: 'obs', label: 'Obs', cn: '监控' },
  ];

  const healthItems = [
    { label: 'Git Remote', points: 40, has: project.hasGitRemote },
    { label: 'CLAUDE.md', points: 30, has: project.hasClaudeConfig },
    { label: 'Deploy Config', points: 20, has: project.hasDeployConfig },
    { label: 'Synced (ahead=0)', points: 10, has: ahead === 0 && project.hasGitRemote },
  ];

  return (
    <div className="page">
      <ToastStack toasts={toasts} />
      <div className="page__top">
        <div className="page__crumbs">
          <button onClick={() => router.back()} style={{ appearance: 'none', border: 0, background: 'transparent', color: 'var(--tx-3)', padding: 0, cursor: 'pointer', fontSize: 13 }}>
            Projects
          </button>
          <span className="page__crumbs-sep">/</span>
          <span className="page__crumb-current mono">{project.name}</span>
        </div>
        <div className="page__top-actions">
          <button className="btn btn--ghost btn--sm" onClick={() => router.back()}>
            <ChevronLeft size={12} /> Back · 返回
          </button>
        </div>
      </div>

      <div className="detail-header">
        <div className="detail-header__main">
          <h2 className="detail-header__title">
            {project.name}
            <Badge tone="soft">{project.type}</Badge>
            <HealthRing value={project.healthScore} size={28} stroke={3} label="" />
            <span className="mono" style={{
              fontSize: 14,
              color: project.healthScore >= 80 ? 'var(--ok)' : project.healthScore >= 60 ? 'var(--warn)' : 'var(--bad)',
              fontWeight: 600
            }}>{project.healthScore}</span>
          </h2>
          <div className="detail-header__meta">
            <span className="detail-header__meta-item">
              <FolderOpen size={12} /><span className="mono" style={{ fontSize: 11 }}>{project.path}</span>
            </span>
            {project.gitBranch && (
              <span className="detail-header__meta-item">
                <GitBranch size={12} /><span className="mono">{project.gitBranch}</span>
              </span>
            )}
            <span className="detail-header__meta-item">
              <Clock size={12} /> Last active · {timeAgo(project.lastModified)}
            </span>
          </div>
        </div>
        <div className="detail-header__actions">
          <button className="btn" onClick={() => fetch('/api/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'terminal', path: project.path }) })}><Terminal size={13} /> Terminal</button>
          <button className="btn" onClick={() => fetch('/api/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'finder', path: project.path }) })}><FolderOpen size={13} /> Finder</button>
          {project.gitRemote && (
            <a href={project.gitRemote.replace('git@github.com:', 'https://github.com/').replace('.git', '')}
              target="_blank" rel="noopener noreferrer" className="btn" style={{ textDecoration: 'none' }}>
              <GitBranch size={13} /> GitHub
            </a>
          )}
        </div>
      </div>

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'tab--active' : ''}`} onClick={() => setTab(t.id)}>
            <Bi en={t.label} cn={t.cn} />
          </button>
        ))}
      </div>

      <div className="page__scroll">
        <div className="detail-body" style={{ paddingTop: 20 }}>
          {/* Left sidebar */}
          <aside className="detail-side">
            {/* Basics */}
            <div className="subcard">
              <div className="subcard__hd"><h3 className="subcard__title"><Bi en="Basics" cn="基础信息" /></h3></div>
              <dl className="kv-grid">
                <dt>Type</dt><dd><Badge tone="soft">{project.type}</Badge></dd>
                <dt>Health</dt><dd>
                  <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 600, color: project.healthScore >= 80 ? 'var(--ok)' : project.healthScore >= 60 ? 'var(--warn)' : 'var(--bad)' }}>
                    {project.healthScore} / 100
                  </span>
                </dd>
                <dt>Last active</dt><dd style={{ fontSize: 12 }}>{timeAgo(project.lastModified)}</dd>
                <dt>Files</dt><dd className="mono">{extras.fileCount}</dd>
                {extras.depCount > 0 && <><dt>Deps</dt><dd className="mono">{extras.depCount}</dd></>}
                <dt>.env</dt><dd>
                  {extras.hasEnv
                    ? <Badge tone="warn" dot>.env found</Badge>
                    : extras.hasEnvExample
                    ? <Badge tone="info" dot>.env.example</Badge>
                    : <span style={{ color: 'var(--tx-3)', fontSize: 12 }}>—</span>}
                </dd>
              </dl>
            </div>

            {/* Health breakdown */}
            <div className="subcard">
              <div className="subcard__hd"><h3 className="subcard__title"><Bi en="Health Score" cn="健康度" /></h3></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {healthItems.map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ color: 'var(--tx-2)' }}>{item.label}</span>
                    <span style={{ color: item.has ? 'var(--ok)' : 'var(--bad)', fontFamily: 'var(--f-mono)', fontSize: 11 }}>
                      {item.has ? `+${item.points}` : `−${item.points}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech stack */}
            {project.techStack.length > 0 && (
              <div className="subcard">
                <div className="subcard__hd"><h3 className="subcard__title"><Bi en="Tech Stack" cn="技术栈" /></h3></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {project.techStack.map(t => <Chip key={t}>{t}</Chip>)}
                </div>
              </div>
            )}

            {/* Quick git actions */}
            {project.hasGitRemote && (
              <div className="subcard">
                <div className="subcard__hd">
                  <h3 className="subcard__title"><Bi en="Git" cn="" /></h3>
                  <AheadBehind ahead={ahead} behind={behind} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn--primary btn--sm" onClick={() => sync('push')} disabled={!!syncing}>
                    <ArrowUp size={11} /> Push
                  </button>
                  <button className="btn btn--sm" onClick={() => sync('pull')} disabled={!!syncing}>
                    <ArrowDown size={11} /> Pull
                  </button>
                  <button className="btn btn--sm" onClick={() => sync('fetch')} disabled={!!syncing}>
                    <RefreshCw size={11} /> Fetch
                  </button>
                </div>
              </div>
            )}
          </aside>

          {/* Main content */}
          <div className="detail-main">
            {tab === 'readme' && (
              <div className="subcard">
                <div className="subcard__hd">
                  <h3 className="subcard__title">README.md</h3>
                </div>
                {readmeContent
                  ? <Markdown>{readmeContent.slice(0, 10000)}</Markdown>
                  : <p style={{ color: 'var(--tx-3)', fontSize: 13 }}>No README found</p>}
              </div>
            )}

            {tab === 'git' && (
              <>
                <div className="subcard">
                  <div className="subcard__hd">
                    <h3 className="subcard__title"><Bi en="Remote" cn="远程信息" /></h3>
                    {project.hasGitRemote
                      ? <Badge tone="ok" dot>connected</Badge>
                      : <Badge tone="warn" dot>not configured</Badge>}
                  </div>
                  <dl className="kv-grid">
                    <dt>Remote URL</dt>
                    <dd className="mono" style={{ fontSize: 11, wordBreak: 'break-all' }}>{project.gitRemote || '—'}</dd>
                    <dt>Branch</dt><dd className="mono">{project.gitBranch || '—'}</dd>
                    <dt>Ahead / Behind</dt><dd><AheadBehind ahead={ahead} behind={behind} /></dd>
                  </dl>
                </div>

                {commits.length > 0 && (
                  <div className="subcard">
                    <div className="subcard__hd">
                      <h3 className="subcard__title"><Bi en="Recent commits" cn="最近提交" /></h3>
                    </div>
                    <div className="commits">
                      {commits.map((c, i) => (
                        <div key={i} className="commit">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="commit__bullet" />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <span className="commit__sha">{c.hash.slice(0, 7)}</span>
                            <span className="commit__msg">{c.message}</span>
                          </div>
                          <span className="commit__meta">{timeAgo(c.date)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === 'claude' && (
              <>
                <div className="subcard">
                  <div className="subcard__hd">
                    <h3 className="subcard__title">CLAUDE.md</h3>
                    {claudeContent && <Badge tone="ok" dot>found</Badge>}
                  </div>
                  <ConstitutionEditor
                    initialContent={claudeDraft}
                    onSave={async (content) => {
                      setClaudeSaving(true);
                      try {
                        const res = await fetch('/api/projects/claudemd', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ projectId: project.id, content }),
                        });
                        const data = await res.json();
                        if (data.ok) { showToast('ok', 'CLAUDE.md saved'); setClaudeDraft(content); }
                        else showToast('err', data.error || 'Save failed');
                      } catch { showToast('err', 'Network error'); }
                      finally { setClaudeSaving(false); }
                    }}
                    saving={claudeSaving}
                  />
                </div>
                {agentsContent && (
                  <div className="subcard">
                    <div className="subcard__hd">
                      <h3 className="subcard__title">AGENTS.md</h3>
                      <Badge tone="info" dot>found</Badge>
                    </div>
                    <Markdown>{agentsContent}</Markdown>
                  </div>
                )}
              </>
            )}

            {tab === 'run' && (
              <>
                {Object.keys(extras.scripts).length > 0 && (
                  <div className="subcard">
                    <div className="subcard__hd">
                      <h3 className="subcard__title"><Bi en="npm scripts" cn="npm 命令" /></h3>
                      <Badge tone="soft">{Object.keys(extras.scripts).length}</Badge>
                    </div>
                    <div className="commits">
                      {Object.entries(extras.scripts).map(([name, cmd]) => (
                        <div key={name} className="commit" style={{ gridTemplateColumns: 'auto 1fr' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <span className="mono" style={{ fontSize: 12, color: 'var(--ac-1)', fontWeight: 600, flexShrink: 0 }}>{name}</span>
                            <span className="mono" style={{ fontSize: 11, color: 'var(--tx-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cmd}</span>
                          </div>
                          <div />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {extras.makeTargets.length > 0 && (
                  <div className="subcard">
                    <div className="subcard__hd">
                      <h3 className="subcard__title"><Bi en="Makefile targets" cn="Make 命令" /></h3>
                      <Badge tone="soft">{extras.makeTargets.length}</Badge>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {extras.makeTargets.map(t => (
                        <Badge key={t} tone="soft">make {t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === 'deploy' && (
              <>
                {project.deployFiles.length > 0 ? (
                  <div className="subcard">
                    <div className="subcard__hd">
                      <h3 className="subcard__title"><Bi en="Deploy files" cn="部署文件" /></h3>
                      <Badge tone="ok" dot>found</Badge>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: deployContent ? 16 : 0 }}>
                      {project.deployFiles.map(f => <Badge key={f} tone="soft">{f}</Badge>)}
                    </div>
                    {deployContent && (
                      <>
                        <div style={{ height: 1, background: 'var(--hl-1)', margin: '12px 0' }} />
                        <Markdown>{deployContent.slice(0, 6000)}</Markdown>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="subcard">
                    <p style={{ color: 'var(--tx-3)', fontSize: 13 }}>No deployment configuration found.</p>
                    <p style={{ color: 'var(--tx-3)', fontSize: 12, marginTop: 8 }}>
                      Expected: DEPLOY.md, DEPLOYMENT.md, Dockerfile, docker-compose.yml, helm/
                    </p>
                  </div>
                )}
              </>
            )}

            {tab === 'postmortem' && <PostmortemTab projectId={project.id} />}
            {tab === 'obs' && <ObsTab projectName={project.path.split('/').pop() || project.name} />}
          </div>
        </div>
      </div>
    </div>
  );
}
