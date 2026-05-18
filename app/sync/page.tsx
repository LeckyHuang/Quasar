'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowUp, ArrowDown, CheckCircle, XCircle, Sparkles, Folder } from 'lucide-react';
import type { SkillMeta, ProjectMeta } from '@/types';
import { AheadBehind, Spinner, Bi, useToast, ToastStack } from '@/components/ui';

interface SyncItem {
  id: string;
  name: string;
  path: string;
  ahead: number;
  behind: number;
  type: 'skill' | 'project';
  lastSync?: string;
}

interface LogEntry {
  timestamp: number;
  name: string;
  type: string;
  action: string;
  success: boolean;
  message: string;
}

function SyncListBlock({ title, items, busyMap, onAction, onSyncAll }: {
  title: React.ReactNode;
  items: SyncItem[];
  busyMap: Record<string, string>;
  onAction: (id: string, type: string, action: string) => void;
  onSyncAll: () => void;
}) {
  const hasPending = items.some(i => i.ahead > 0);
  return (
    <div className="sync-list">
      <div className="sync-list__hd">
        <span className="sync-list__title">{title}</span>
        <button className="btn btn--ghost btn--sm" onClick={onSyncAll} disabled={!hasPending}>
          Sync all <RefreshCw size={11} />
        </button>
      </div>
      {items.length === 0 && (
        <div style={{ padding: '20px 16px', color: 'var(--tx-3)', fontSize: 12 }}>
          All up to date ✓
        </div>
      )}
      {items.map(it => {
        const busy = busyMap[it.id];
        return (
          <div key={it.id} className="sync-row">
            <div className="sync-row__main">
              <div className="sync-row__name">{it.name}</div>
              <div className="sync-row__sub mono">{it.path}</div>
            </div>
            <div className="sync-row__badges">
              <AheadBehind ahead={it.ahead} behind={it.behind} />
              {it.lastSync && <span className="tx-3" style={{ fontSize: 11 }}>{it.lastSync}</span>}
            </div>
            <div className="sync-row__actions">
              <button className="btn btn--sm"
                disabled={!!busy || it.ahead === 0}
                onClick={() => onAction(it.id, it.type, 'push')}>
                {busy === 'push' ? <><Spinner size={11} /> Pushing…</> : <>Push</>}
              </button>
              <button className="btn btn--sm"
                disabled={!!busy || it.behind === 0}
                onClick={() => onAction(it.id, it.type, 'pull')}>
                {busy === 'pull' ? <><Spinner size={11} /> Pulling…</> : <>Pull</>}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SyncPage() {
  const [skills, setSkills] = useState<SkillMeta[]>([]);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [busyMap, setBusyMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [syncLog, setSyncLog] = useState<LogEntry[]>([]);
  const { toasts, show: showToast } = useToast();

  const loadData = () => Promise.all([
    fetch('/api/skills').then(r => r.json()),
    fetch('/api/projects').then(r => r.json()),
    fetch('/api/sync').then(r => r.json()),
  ]).then(([s, p, log]) => {
    setSkills(s.skills || s);
    setProjects(p.projects || p);
    setSyncLog(Array.isArray(log) ? log : []);
    setLoading(false);
  }).catch(() => setLoading(false));

  useEffect(() => { loadData(); }, []);

  const onAction = async (id: string, type: string, action: string) => {
    setBusyMap(m => ({ ...m, [id]: action }));
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, action }),
      });
      const data = await res.json();
      const name = [...skills, ...projects].find(x => x.id === id)?.name ?? id;
      if (data.result?.success) showToast('ok', `${name}: ${action} succeeded`);
      else showToast('err', `${name}: ${data.result?.message || data.error || 'failed'}`);
    } catch {
      showToast('err', 'Network error');
    } finally {
      setBusyMap(m => { const n = { ...m }; delete n[id]; return n; });
      fetch('/api/sync').then(r => r.json()).then(log => setSyncLog(Array.isArray(log) ? log : [])).catch(() => {});
    }
  };

  const skillItems: SyncItem[] = skills
    .filter(s => s.hasGit)
    .map(s => ({ id: s.id, name: s.name, path: s.path, ahead: s.gitAhead, behind: s.gitBehind, type: 'skill' as const }));

  const projItems: SyncItem[] = projects
    .filter(p => p.hasGitRemote)
    .map(p => ({ id: p.id, name: p.name, path: p.path, ahead: p.gitAhead, behind: p.gitBehind, type: 'project' as const }));

  const toPush = [...skillItems, ...projItems].filter(i => i.ahead > 0).length;
  const toPull = [...skillItems, ...projItems].filter(i => i.behind > 0).length;
  const synced = [...skillItems, ...projItems].filter(i => i.ahead === 0 && i.behind === 0).length;

  const [rescanning, setRescanning] = useState(false);
  const rescan = async () => {
    setRescanning(true);
    try {
      await fetch('/api/scan', { method: 'POST' });
      showToast('ok', 'Rescan complete');
      await loadData();
    } catch { showToast('err', 'Rescan failed'); }
    finally { setRescanning(false); }
  };

  const syncAll = async () => {
    const allWithRemote = [...skillItems.filter(i => i.ahead > 0), ...projItems.filter(i => i.ahead > 0)];
    for (const item of allWithRemote) {
      await onAction(item.id, item.type, 'push');
    }
  };

  return (
    <div className="page">
      <ToastStack toasts={toasts} />
      <div className="page__top">
        <h1 className="page__title">
          <Bi en="Sync" cn="同步" />
          {toPush + toPull > 0 && (
            <span className="tx-3" style={{ fontWeight: 400, fontSize: 13 }}>· {toPush + toPull} pending</span>
          )}
        </h1>
        <div className="page__top-actions">
          <button className="btn" onClick={rescan} disabled={rescanning}>
            <RefreshCw size={12} style={rescanning ? { animation: 'spin 1s linear infinite' } : {}} />
            {rescanning ? 'Scanning…' : 'Refresh all · 刷新全部扫描'}
          </button>
          <button className="btn btn--primary" onClick={syncAll} disabled={toPush === 0}>
            <RefreshCw size={12} /> Sync all · 同步全部
          </button>
        </div>
      </div>

      <div className="page__scroll">
        <div className="page__body">
          {/* Summary stats */}
          <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', marginBottom: 20 }}>
            <div className="stat">
              <div className="stat__label"><ArrowUp size={11} strokeWidth={2.4} style={{ color: 'var(--info)' }} /> To Push · 待推送</div>
              <div className="stat__value">{toPush}</div>
              <div className="stat__delta">assets with unpushed commits</div>
            </div>
            <div className="stat">
              <div className="stat__label"><ArrowDown size={11} strokeWidth={2.4} style={{ color: 'var(--bad)' }} /> To Pull · 待拉取</div>
              <div className="stat__value">{toPull}</div>
              <div className="stat__delta">assets behind remote</div>
            </div>
            <div className="stat">
              <div className="stat__label"><CheckCircle size={11} strokeWidth={2.2} style={{ color: 'var(--ok)' }} /> Synced · 已同步</div>
              <div className="stat__value">{synced}</div>
              <div className="stat__delta">up to date</div>
            </div>
            <div className="stat">
              <div className="stat__label"><XCircle size={11} strokeWidth={2.2} style={{ color: 'var(--bad)' }} /> No Remote · 无远程</div>
              <div className="stat__value">{skills.filter(s => !s.hasGit).length + projects.filter(p => !p.hasGitRemote).length}</div>
              <div className="stat__delta stat__delta--down">local only</div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--tx-3)' }}><Spinner size={20} /></div>
          ) : (
            <div className="sync-grid">
              <SyncListBlock
                title={<><Sparkles size={13} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--ac-1)' }} />Skills <span className="cn-sub">技能 · {skillItems.length} with git</span></>}
                items={skillItems}
                busyMap={busyMap}
                onAction={onAction}
                onSyncAll={() => skillItems.filter(i => i.ahead > 0).forEach(i => onAction(i.id, i.type, 'push'))}
              />
              <SyncListBlock
                title={<><Folder size={13} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--ac-1)' }} />Projects <span className="cn-sub">项目 · {projItems.length} with remote</span></>}
                items={projItems}
                busyMap={busyMap}
                onAction={onAction}
                onSyncAll={() => projItems.filter(i => i.ahead > 0).forEach(i => onAction(i.id, i.type, 'push'))}
              />
            </div>
          )}

          {/* Activity timeline */}
          <div className="timeline">
            <div className="timeline__hd">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><Bi en="Sync log" cn="同步操作日志" /></span>
                <span className="tx-3" style={{ fontSize: 11 }}>{syncLog.length} entries</span>
              </div>
            </div>
            {syncLog.length === 0 && (
              <div style={{ padding: '16px', color: 'var(--tx-3)', fontSize: 12 }}>No sync operations yet</div>
            )}
            {syncLog.slice(0, 20).map((e, i) => {
              const d = new Date(e.timestamp);
              const now = Date.now();
              const diff = now - e.timestamp;
              const timeStr = diff < 60000 ? 'just now'
                : diff < 3600000 ? `${Math.floor(diff / 60000)}m ago`
                : diff < 86400000 ? `${Math.floor(diff / 3600000)}h ago`
                : d.toLocaleDateString();
              return (
                <div key={i} className="timeline__row">
                  <span className="timeline__time">{timeStr}</span>
                  <span className="timeline__icon-wrap">
                    {e.success ? <CheckCircle size={13} style={{ color: 'var(--ok)' }} /> : <XCircle size={13} style={{ color: 'var(--bad)' }} />}
                  </span>
                  <span className="timeline__msg">
                    <b>{e.name}</b> {e.action} {e.success ? 'succeeded' : 'failed'}{e.message ? ` — ${e.message}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
