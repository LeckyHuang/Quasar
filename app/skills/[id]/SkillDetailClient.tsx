'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FolderOpen, ExternalLink, GitBranch, MoreHorizontal, Copy, Plus, ArrowUp, ArrowDown, RefreshCw, File, Folder } from 'lucide-react';
import { CatChip, Heat, Badge, Chip, AheadBehind, BarChart, Markdown, Bi } from '@/components/ui';

interface SkillData {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerWords: string[];
  path: string;
  lastModified: string;
  hasGit: boolean;
  gitRemote?: string;
  gitBranch?: string;
  usageCount: number;
  templates: string[];
}

interface CommitData {
  hash: string;
  message: string;
  date: string;
  author?: string;
}

interface TemplateFile {
  name: string;
  size: number;
}

function heatLevel(count: number): 'hot' | 'warm' | 'cold' {
  if (count > 10) return 'hot';
  if (count > 3) return 'warm';
  return 'cold';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
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

function TreeNode({ files, activeFile, onSelect }: { files: TemplateFile[]; activeFile: string | null; onSelect: (f: string) => void }) {
  return (
    <>
      {files.map((f, i) => (
        <div key={i}
          className={`tree__item ${activeFile === f.name ? 'tree__item--active' : ''}`}
          onClick={() => onSelect(f.name)}>
          <span className="tree__item-indent" />
          <File size={12} style={{ color: 'var(--tx-4)' }} />
          {f.name}
        </div>
      ))}
    </>
  );
}

function OverviewTab({ skill, templateFiles, usageTimeline, relatedProjects }: {
  skill: SkillData;
  templateFiles: TemplateFile[];
  usageTimeline: { date: string; count: number }[];
  relatedProjects: { id: string; name: string }[];
}) {
  const usageArr = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return usageTimeline.find(u => u.date === d)?.count ?? 0;
  });
  const peak = Math.max(...usageArr, 0);
  const total30 = usageArr.reduce((s, v) => s + v, 0);
  const peakIdx = usageArr.indexOf(peak);

  const [words, setWords] = useState<string[]>(skill.triggerWords);
  const [adding, setAdding] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const saveTriggerWords = async (updated: string[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/skills/triggerwords', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId: skill.id, triggerWords: updated }),
      });
      const data = await res.json();
      if (data.ok) { setWords(updated); setToast({ kind: 'ok', text: '触发词已保存' }); }
      else setToast({ kind: 'err', text: data.error || '保存失败' });
    } catch { setToast({ kind: 'err', text: 'Network error' }); }
    finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const removeWord = (w: string) => saveTriggerWords(words.filter(x => x !== w));
  const addWord = () => {
    const w = newWord.trim();
    if (!w || words.includes(w)) { setAdding(false); setNewWord(''); return; }
    setAdding(false); setNewWord('');
    saveTriggerWords([...words, w]);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          background: toast.kind === 'ok' ? 'var(--ok)' : 'var(--bad)',
          color: '#fff', borderRadius: 8, padding: '9px 14px', fontSize: 13,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>{toast.text}</div>
      )}
      <div className="subcard">
        <div className="subcard__hd">
          <h3 className="subcard__title"><Bi en="Triggers" cn="触发词" /></h3>
          {!adding && (
            <button className="btn btn--ghost btn--sm" onClick={() => setAdding(true)} disabled={saving}>
              <Plus size={12} /> 添加
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {words.map(t => (
            <Chip key={t} mono removable onRemove={() => removeWord(t)}>{t}</Chip>
          ))}
          {words.length === 0 && !adding && (
            <span style={{ color: 'var(--tx-3)', fontSize: 12 }}>SKILL.md 中未定义触发词</span>
          )}
          {adding && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                autoFocus
                value={newWord}
                onChange={e => setNewWord(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addWord(); if (e.key === 'Escape') { setAdding(false); setNewWord(''); } }}
                placeholder="输入触发词…"
                style={{
                  height: 26, padding: '0 8px', fontSize: 12, fontFamily: 'var(--f-mono)',
                  background: 'var(--bg-2)', border: '1px solid var(--hl-2)', borderRadius: 6,
                  color: 'var(--tx-1)', outline: 'none', width: 120,
                }}
              />
              <button className="btn btn--primary btn--sm" onClick={addWord}>确认</button>
              <button className="btn btn--sm" onClick={() => { setAdding(false); setNewWord(''); }}>取消</button>
            </div>
          )}
        </div>
      </div>

      <div className="subcard">
        <div className="subcard__hd">
          <h3 className="subcard__title"><Bi en="Category & Info" cn="分类与信息" /></h3>
        </div>
        <dl className="kv-grid">
          <dt>Category</dt><dd><CatChip catId={skill.category} /></dd>
          <dt>Heat</dt><dd><Heat level={heatLevel(skill.usageCount)} /></dd>
          <dt>Sync</dt><dd>
            {skill.hasGit
              ? <Badge tone="ok" dot>Synced</Badge>
              : <Badge tone="warn" dot>Local only</Badge>}
          </dd>
          <dt>Modified</dt><dd style={{ fontSize: 12 }}>{timeAgo(skill.lastModified)}</dd>
          <dt>Templates</dt><dd style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}>{templateFiles.length} files</dd>
        </dl>
      </div>

      <div className="subcard" style={{ gridColumn: '1 / -1' }}>
        <div className="subcard__hd">
          <h3 className="subcard__title"><Bi en="Usage · Last 30 days" cn="最近 30 天" /></h3>
          <div className="row" style={{ gap: 12 }}>
            {peak > 0 && <span className="tx-3" style={{ fontSize: 11.5 }}>Peak <b style={{ color: 'var(--tx-1)' }} className="mono">{peak}</b> / day</span>}
            <span className="tx-3" style={{ fontSize: 11.5 }}>Total <b style={{ color: 'var(--tx-1)' }} className="mono">{total30}</b></span>
          </div>
        </div>
        {peak > 0
          ? <BarChart data={usageArr} peakIdx={peakIdx} axisLabels={['30d ago', '20d', '10d', 'today']} />
          : <div style={{ padding: '12px 0', color: 'var(--tx-3)', fontSize: 12 }}>No usage detected in history (matched via trigger words)</div>
        }
      </div>

      {relatedProjects.length > 0 && (
        <div className="subcard" style={{ gridColumn: '1 / -1' }}>
          <div className="subcard__hd">
            <h3 className="subcard__title"><Bi en="Related Projects" cn="关联项目" /></h3>
            <Badge tone="soft">{relatedProjects.length}</Badge>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {relatedProjects.map(p => (
              <a key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                <Badge tone="info">{p.name}</Badge>
              </a>
            ))}
          </div>
        </div>
      )}

      {templateFiles.length > 0 && (
        <div className="subcard" style={{ gridColumn: '1 / -1' }}>
          <div className="subcard__hd">
            <h3 className="subcard__title"><Bi en="Template Files" cn="模板文件" /></h3>
            <span className="tx-3" style={{ fontSize: 11.5 }}>{templateFiles.length} files</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {templateFiles.slice(0, 8).map((f, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: 10, alignItems: 'center', padding: '7px 4px', fontSize: 12.5, borderBottom: i < Math.min(7, templateFiles.length - 1) ? '1px solid var(--hl-1)' : '0' }}>
                <File size={12} style={{ color: 'var(--tx-4)' }} />
                <span className="mono" style={{ color: 'var(--tx-1)', fontSize: 12 }}>{f.name}</span>
                <span className="tx-3 mono" style={{ fontSize: 11 }}>{formatBytes(f.size)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GitTab({ skill, commits }: { skill: SkillData; commits: CommitData[] }) {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const sync = async (action: string) => {
    if (!skill.gitRemote) return;
    setSyncing(action);
    try {
      const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'skill', id: skill.id, action }) });
      const data = await res.json();
      if (data.result?.success) setToast({ kind: 'ok', text: `${action} succeeded` });
      else setToast({ kind: 'err', text: data.result?.message || data.error || 'Failed' });
    } catch { setToast({ kind: 'err', text: 'Network error' }); }
    finally {
      setSyncing(null);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const hasRemote = skill.hasGit && !!skill.gitRemote;
  const gitStatusBadge = !skill.hasGit
    ? <Badge tone="soft">no git</Badge>
    : hasRemote
      ? <Badge tone="ok" dot>connected</Badge>
      : <Badge tone="warn" dot>local only</Badge>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          background: toast.kind === 'ok' ? 'var(--ok)' : 'var(--bad)',
          color: '#fff', borderRadius: 8, padding: '9px 14px', fontSize: 13,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>{toast.text}</div>
      )}
      <div className="subcard">
        <div className="subcard__hd">
          <h3 className="subcard__title"><Bi en="Remote info" cn="远程信息" /></h3>
          {gitStatusBadge}
        </div>
        <dl className="kv-grid">
          <dt>Remote URL</dt>
          <dd className="mono" style={{ fontSize: 11, wordBreak: 'break-all' }}>{skill.gitRemote || '—'}</dd>
          <dt>Branch</dt><dd className="mono">{skill.gitBranch || (skill.hasGit ? 'main' : '—')}</dd>
          <dt>Last modified</dt><dd>{timeAgo(skill.lastModified)}</dd>
        </dl>
        {!skill.hasGit && (
          <p style={{ fontSize: 12, color: 'var(--tx-3)', margin: '8px 0 0' }}>
            This skill directory has no git repository. Run <code style={{ fontFamily: 'var(--f-mono)', background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 4 }}>git init</code> to initialize one.
          </p>
        )}
        {skill.hasGit && !skill.gitRemote && (
          <p style={{ fontSize: 12, color: 'var(--tx-3)', margin: '8px 0 0' }}>
            Local repo with no remote. Add one with <code style={{ fontFamily: 'var(--f-mono)', background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 4 }}>git remote add origin &lt;url&gt;</code>
          </p>
        )}
        <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
          <button className="btn btn--primary" onClick={() => sync('push')} disabled={!hasRemote || !!syncing}>
            <ArrowUp size={12} strokeWidth={2.2} /> {syncing === 'push' ? 'Pushing…' : 'Push'}
          </button>
          <button className="btn" onClick={() => sync('pull')} disabled={!hasRemote || !!syncing}>
            <ArrowDown size={12} strokeWidth={2.2} /> {syncing === 'pull' ? 'Pulling…' : 'Pull'}
          </button>
          <button className="btn" onClick={() => sync('fetch')} disabled={!hasRemote || !!syncing}>
            <RefreshCw size={12} /> {syncing === 'fetch' ? 'Fetching…' : 'Fetch'}
          </button>
        </div>
      </div>

      <div className="subcard">
        <div className="subcard__hd">
          <h3 className="subcard__title"><Bi en="Recent commits" cn="最近提交" /></h3>
          {skill.gitRemote && (
            <a href={skill.gitRemote.replace('git@github.com:', 'https://github.com/').replace('.git', '')}
              target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm" style={{ textDecoration: 'none' }}>
              <GitBranch size={12} /> All
            </a>
          )}
        </div>
        {commits.length > 0 ? (
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
        ) : (
          <div style={{ color: 'var(--tx-3)', fontSize: 12, padding: '8px 0' }}>
            {skill.hasGit ? 'No commits found' : 'No git repository'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SkillDetailClient({ skill, skillMdContent, commits, templateFiles, relatedProjects, usageTimeline }: {
  skill: SkillData;
  skillMdContent: string;
  commits: CommitData[];
  templateFiles: TemplateFile[];
  relatedProjects: { id: string; name: string }[];
  usageTimeline: { date: string; count: number }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState('overview');
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  const selectFile = async (name: string) => {
    setActiveFile(name);
    setFileContent(null);
    setFileLoading(true);
    try {
      const res = await fetch(`/api/skills/template?skillPath=${encodeURIComponent(skill.path)}&file=${encodeURIComponent(name)}`);
      const data = await res.json();
      setFileContent(data.content ?? data.error ?? '');
    } catch {
      setFileContent('Failed to load file');
    } finally {
      setFileLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', cn: '概览' },
    { id: 'skillmd', label: 'SKILL.md', cn: '' },
    { id: 'templates', label: 'Templates', cn: '模板库' },
    { id: 'git', label: 'Git', cn: '' },
  ];

  return (
    <div className="page">
      <div className="page__top">
        <div className="page__crumbs">
          <button onClick={() => router.back()} style={{ appearance: 'none', border: 0, background: 'transparent', color: 'var(--tx-3)', padding: 0, cursor: 'pointer', fontSize: 13 }}>
            Skills
          </button>
          <span className="page__crumbs-sep">/</span>
          <span className="page__crumb-current mono">{skill.name}</span>
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
            {skill.name}
            <CatChip catId={skill.category} />
            <Heat level={heatLevel(skill.usageCount)} />
          </h2>
          <p style={{ margin: '0 0 8px', color: 'var(--tx-2)', fontSize: 13, maxWidth: 720, lineHeight: 1.6 }}>
            {skill.description}
          </p>
          <div className="detail-header__meta">
            <span className="detail-header__meta-item">
              <FolderOpen size={12} /><span className="mono" style={{ fontSize: 11 }}>{skill.path}</span>
            </span>
            <span className="detail-header__meta-item">Last modified · {timeAgo(skill.lastModified)}</span>
            <span className="detail-header__meta-item">{templateFiles.length} files</span>
          </div>
        </div>
        <div className="detail-header__actions">
          {skill.gitRemote && (
            <a href={skill.gitRemote.replace('git@github.com:', 'https://github.com/').replace('.git', '')}
              target="_blank" rel="noopener noreferrer" className="btn" style={{ textDecoration: 'none' }}>
              <GitBranch size={13} /> GitHub
            </a>
          )}
          <button className="btn" onClick={() => fetch('/api/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'finder', path: skill.path }) })}><FolderOpen size={13} /> Finder</button>
          <button className="btn" onClick={() => fetch('/api/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'editor', path: skill.path }) })}><ExternalLink size={13} /> Editor</button>
          <button className="btn btn--icon"><MoreHorizontal size={14} /></button>
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
        <div className="detail-body detail-body--no-side" style={{ paddingTop: 20 }}>
          {tab === 'overview' && <OverviewTab skill={skill} templateFiles={templateFiles} usageTimeline={usageTimeline} relatedProjects={relatedProjects} />}

          {tab === 'skillmd' && (
            <div className="subcard">
              <div className="subcard__hd">
                <div className="row" style={{ gap: 8 }}>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--tx-3)' }}>SKILL.md</span>
                  <Badge tone="soft">{(skillMdContent.length / 1024).toFixed(1)} KB</Badge>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => navigator.clipboard.writeText(skillMdContent)}>
                  <Copy size={12} /> 复制
                </button>
              </div>
              <Markdown>{skillMdContent || '*No SKILL.md found*'}</Markdown>
            </div>
          )}

          {tab === 'templates' && (
            templateFiles.length > 0 ? (
              <div className="tree-pane">
                <div className="tree">
                  <TreeNode files={templateFiles} activeFile={activeFile} onSelect={selectFile} />
                </div>
                <div className="tree__file-preview scroll-y">
                  {activeFile ? (
                    <>
                      <div className="tree__file-name">{activeFile}</div>
                      {fileLoading ? (
                        <div style={{ padding: 16, color: 'var(--tx-3)', fontSize: 12 }}>Loading…</div>
                      ) : (
                        <pre style={{ background: 'var(--bg-2)', border: '1px solid var(--hl-1)', borderRadius: 8, padding: '12px 14px', fontSize: 11.5, color: 'var(--tx-2)', fontFamily: 'var(--f-mono)', overflowX: 'auto', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {fileContent ?? ''}
                        </pre>
                      )}
                    </>
                  ) : (
                    <div style={{ padding: 24, color: 'var(--tx-3)', fontSize: 13 }}>Select a file to preview</div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--tx-3)' }}>No template files found</div>
            )
          )}

          {tab === 'git' && <GitTab skill={skill} commits={commits} />}
        </div>
      </div>
    </div>
  );
}
