'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Terminal, FolderOpen, GitBranch, ArrowUp, ArrowDown, RefreshCw, Clock, Plus, ChevronDown, ChevronUp, Trash2, Edit2, X, Check } from 'lucide-react';
import { HealthRing, Badge, Chip, AheadBehind, Markdown, Bi, useToast, ToastStack, Spinner } from '@/components/ui';
import ConstitutionEditor from '@/components/ConstitutionEditor';

/* ─── Postmortem Types ─── */
interface Incident {
  id: string;
  entityId: string;
  entityType: 'skill' | 'project';
  date: string;
  severity: 'critical' | 'major' | 'minor';
  title: string;
  problem: string;
  rootCause: string;
  solution: string;
  lessons: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'var(--bad)',
  major: 'var(--warn)',
  minor: 'var(--ok)',
};
const SEVERITY_ICONS: Record<string, string> = { critical: '🔴', major: '🟡', minor: '🟢' };
const EMPTY_INCIDENT = (entityId: string): Omit<Incident, 'id' | 'createdAt' | 'updatedAt'> => ({
  entityId, entityType: 'project',
  date: new Date().toISOString().slice(0, 10),
  severity: 'major', title: '', problem: '', rootCause: '', solution: '', lessons: '', tags: [],
});

/* ─── PostmortemTab Component ─── */
function PostmortemTab({ projectId }: { projectId: string }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // 'new' or incident id
  const [draft, setDraft] = useState<Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>>(EMPTY_INCIDENT(projectId));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/postmortems?entityId=${projectId}`)
      .then(r => r.json()).then(setIncidents).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const startNew = () => {
    setDraft(EMPTY_INCIDENT(projectId));
    setEditingId('new');
    setExpandedId(null);
  };

  const startEdit = (inc: Incident) => {
    setDraft({ entityId: inc.entityId, entityType: inc.entityType, date: inc.date, severity: inc.severity, title: inc.title, problem: inc.problem, rootCause: inc.rootCause, solution: inc.solution, lessons: inc.lessons, tags: inc.tags });
    setEditingId(inc.id);
    setExpandedId(null);
  };

  const cancelEdit = () => { setEditingId(null); };

  const save = async () => {
    if (!draft.title.trim()) return;
    setSaving(true);
    try {
      if (editingId === 'new') {
        const res = await fetch('/api/postmortems', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
        const created = await res.json();
        setIncidents(prev => [created, ...prev]);
      } else {
        const res = await fetch('/api/postmortems', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, id: editingId }) });
        const updated = await res.json();
        setIncidents(prev => prev.map(i => i.id === editingId ? updated : i));
      }
      setEditingId(null);
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/postmortems?id=${id}&entityId=${projectId}`, { method: 'DELETE' });
      setIncidents(prev => prev.filter(i => i.id !== id));
      if (expandedId === id) setExpandedId(null);
    } finally { setDeletingId(null); }
  };

  const Field = ({ label, field, multiline = false }: { label: string; field: keyof typeof draft; multiline?: boolean }) => (
    <div>
      <label style={{ fontSize: 11, color: 'var(--tx-3)', display: 'block', marginBottom: 4 }}>{label}</label>
      {multiline ? (
        <textarea value={String(draft[field])} onChange={e => setDraft(p => ({ ...p, [field]: e.target.value }))}
          rows={3} style={{ width: '100%', background: 'var(--bg-1)', border: '1px solid var(--hl-2)', borderRadius: 6, padding: '7px 10px', fontSize: 12.5, fontFamily: 'inherit', color: 'var(--tx-1)', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }} />
      ) : (
        <input value={String(draft[field])} onChange={e => setDraft(p => ({ ...p, [field]: e.target.value }))}
          style={{ width: '100%', background: 'var(--bg-1)', border: '1px solid var(--hl-2)', borderRadius: 6, padding: '7px 10px', fontSize: 12.5, fontFamily: 'inherit', color: 'var(--tx-1)', outline: 'none', boxSizing: 'border-box' }} />
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--tx-1)', flex: 1 }}>
          事故复盘 <span style={{ color: 'var(--tx-3)', fontWeight: 400, fontSize: 12 }}>· 共 {incidents.length} 条</span>
        </h3>
        {editingId !== 'new' && (
          <button className="btn btn--primary btn--sm" onClick={startNew}>
            <Plus size={11} /> 记录新事故
          </button>
        )}
      </div>

      {/* New incident form */}
      {editingId === 'new' && (
        <div className="subcard" style={{ borderColor: 'var(--ac-1)', borderWidth: 2 }}>
          <div className="subcard__hd" style={{ marginBottom: 14 }}>
            <h3 className="subcard__title">记录新事故</h3>
            <button onClick={cancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', padding: 4 }}><X size={14} /></button>
          </div>
          <IncidentForm draft={draft} setDraft={setDraft} Field={Field} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button className="btn btn--sm" onClick={cancelEdit}>取消</button>
            <button className="btn btn--primary btn--sm" onClick={save} disabled={!draft.title.trim() || saving}>
              {saving ? <><Spinner size={11} /> 保存中…</> : <><Check size={11} /> 保存</>}
            </button>
          </div>
        </div>
      )}

      {/* Incident list */}
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--tx-3)', fontSize: 13 }}>加载中…</div>
      ) : incidents.length === 0 && editingId !== 'new' ? (
        <div className="subcard" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 13, color: 'var(--tx-2)', marginBottom: 6 }}>暂无事故记录</div>
          <div style={{ fontSize: 12, color: 'var(--tx-3)' }}>遇到问题时及时记录，避免重复踩坑</div>
        </div>
      ) : (
        incidents.map(inc => (
          <div key={inc.id} className="subcard" style={{ borderLeft: `3px solid ${SEVERITY_COLORS[inc.severity]}` }}>
            {editingId === inc.id ? (
              <>
                <div className="subcard__hd" style={{ marginBottom: 14 }}>
                  <h3 className="subcard__title">编辑事故</h3>
                  <button onClick={cancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', padding: 4 }}><X size={14} /></button>
                </div>
                <IncidentForm draft={draft} setDraft={setDraft} Field={Field} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                  <button className="btn btn--sm" onClick={cancelEdit}>取消</button>
                  <button className="btn btn--primary btn--sm" onClick={save} disabled={!draft.title.trim() || saving}>
                    {saving ? <><Spinner size={11} /> 保存中…</> : <><Check size={11} /> 保存</>}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Collapsed header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                  onClick={() => setExpandedId(expandedId === inc.id ? null : inc.id)}>
                  <span style={{ fontSize: 15 }}>{SEVERITY_ICONS[inc.severity]}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--tx-3)', flexShrink: 0 }}>{inc.date}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-1)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.title}</span>
                  <Badge tone={inc.severity === 'critical' ? 'warn' : 'soft'} style={{ flexShrink: 0 }}>{inc.severity}</Badge>
                  {expandedId === inc.id ? <ChevronUp size={13} style={{ color: 'var(--tx-3)', flexShrink: 0 }} /> : <ChevronDown size={13} style={{ color: 'var(--tx-3)', flexShrink: 0 }} />}
                </div>

                {/* Expanded content */}
                {expandedId === inc.id && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { label: '问题描述', value: inc.problem },
                      { label: '根因分析', value: inc.rootCause },
                      { label: '解决方案', value: inc.solution },
                      { label: '经验教训', value: inc.lessons },
                    ].filter(f => f.value?.trim()).map(f => (
                      <div key={f.label}>
                        <div style={{ fontSize: 11, color: 'var(--tx-3)', marginBottom: 4 }}>{f.label}</div>
                        <div style={{ fontSize: 13, color: 'var(--tx-2)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{f.value}</div>
                      </div>
                    ))}
                    {inc.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {inc.tags.map(t => <Chip key={t}>{t}</Chip>)}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--hl-1)', paddingTop: 10 }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => startEdit(inc)}><Edit2 size={11} /> 编辑</button>
                      <button className="btn btn--sm" onClick={() => del(inc.id)} disabled={deletingId === inc.id}>
                        {deletingId === inc.id ? <Spinner size={11} /> : <Trash2 size={11} />}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function IncidentForm({ draft, setDraft, Field }: {
  draft: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>;
  setDraft: React.Dispatch<React.SetStateAction<Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>>>;
  Field: (props: { label: string; field: keyof typeof draft; multiline?: boolean }) => React.ReactElement;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
        <Field label="标题 *" field="title" />
        <div>
          <label style={{ fontSize: 11, color: 'var(--tx-3)', display: 'block', marginBottom: 4 }}>日期</label>
          <input type="date" value={draft.date} onChange={e => setDraft(p => ({ ...p, date: e.target.value }))}
            style={{ background: 'var(--bg-1)', border: '1px solid var(--hl-2)', borderRadius: 6, padding: '7px 10px', fontSize: 12.5, color: 'var(--tx-1)', outline: 'none', fontFamily: 'inherit' }} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'var(--tx-3)', display: 'block', marginBottom: 6 }}>严重程度</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['critical', 'major', 'minor'] as const).map(s => (
            <button key={s} onClick={() => setDraft(p => ({ ...p, severity: s }))} style={{
              padding: '5px 12px', borderRadius: 6, border: `1px solid ${draft.severity === s ? SEVERITY_COLORS[s] : 'var(--hl-2)'}`,
              background: draft.severity === s ? `${SEVERITY_COLORS[s]}20` : 'transparent',
              color: draft.severity === s ? SEVERITY_COLORS[s] : 'var(--tx-3)',
              cursor: 'pointer', fontSize: 12, fontWeight: draft.severity === s ? 600 : 400,
            }}>{SEVERITY_ICONS[s]} {s}</button>
          ))}
        </div>
      </div>
      <Field label="问题描述" field="problem" multiline />
      <Field label="根因分析" field="rootCause" multiline />
      <Field label="解决方案" field="solution" multiline />
      <Field label="经验教训" field="lessons" multiline />
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
    { id: 'postmortem', label: 'Postmortem', cn: '复盘' },
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
          </div>
        </div>
      </div>
    </div>
  );
}
