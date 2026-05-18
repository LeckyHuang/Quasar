'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Bookmark, BookOpen, X, Check, Code } from 'lucide-react';
import { Spinner } from '@/components/ui';

/* ─── Types ─── */

interface Section {
  id: string;
  heading: string; // '' = preamble (content before first ##)
  content: string;
}

interface Snippet {
  id: string;
  name: string;
  heading: string;
  content: string;
  createdAt: number;
}

/* ─── Parse / Serialize ─── */

let _id = 0;
function uid() { return `s${++_id}_${Math.random().toString(36).slice(2, 6)}`; }

function parseSections(md: string): Section[] {
  const lines = md.split('\n');
  const sections: Section[] = [];
  let heading = '';
  let buf: string[] = [];
  let inFence = false;

  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;
    if (!inFence && /^## /.test(line)) {
      sections.push({ id: uid(), heading, content: buf.join('\n') });
      heading = line.slice(3).trim();
      buf = [];
    } else {
      buf.push(line);
    }
  }
  sections.push({ id: uid(), heading, content: buf.join('\n') });
  return sections.filter(s => s.heading !== '' || s.content.trim() !== '');
}

function serialize(sections: Section[]): string {
  const parts = sections.map(s =>
    s.heading
      ? `## ${s.heading}\n\n${s.content.trimEnd()}`
      : s.content.trimEnd()
  );
  return parts.join('\n\n').trimEnd() + '\n';
}

/* ─── Section label for sidebar ─── */
function sectionLabel(s: Section): string {
  if (s.heading) return s.heading;
  // Try to extract # title from preamble
  const m = s.content.match(/^#\s+(.+)/m);
  if (m) return m[1].trim();
  // @import lines
  const imp = s.content.match(/@\S+/);
  if (imp) return imp[0];
  return '文件头部';
}

/* ─── Template presets ─── */
const TEMPLATES = [
  { name: '核心规则', heading: '核心规则', content: '- 规则一\n- 规则二\n- 规则三\n' },
  { name: '禁止操作', heading: '禁止操作', content: '- 不得修改 X 文件\n- 不得跳过测试\n- 不得提交 .env 文件\n' },
  { name: '快速操作入口', heading: '快速操作入口', content: '- **操作一**：`prompts/ingest.md`\n- **操作二**：`prompts/query.md`\n' },
  { name: '技术栈约定', heading: '技术栈与约定', content: '- 语言：TypeScript\n- 框架：Next.js\n- 测试：Jest\n' },
  { name: '文件结构', heading: '文件结构', content: '```\n.\n├── src/\n│   └── ...\n└── README.md\n```\n' },
  { name: '测试要求', heading: '测试要求', content: '- 每个功能必须有单元测试\n- 提交前运行 `npm test` 确认全部通过\n- 不得修改已有测试的期望值\n' },
  { name: '代码风格', heading: '代码风格', content: '- TypeScript 优先\n- 函数式优先，避免 class\n- 不添加注释，用清晰命名替代\n' },
  { name: '部署说明', heading: '部署说明', content: '参考 `DEPLOY.md` 或 `Dockerfile`。\n\n- 生产部署前必须通过 staging 验证\n' },
];

/* ─── Snippet Library Modal ─── */
function SnippetModal({
  onClose,
  onInsert,
  onSave,
  currentSection,
}: {
  onClose: () => void;
  onInsert: (s: Snippet) => void;
  onSave: (name: string) => void;
  currentSection: Section | null;
}) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [tab, setTab] = useState<'library' | 'save'>('library');

  useEffect(() => {
    fetch('/api/snippets').then(r => r.json()).then(setSnippets).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!saveName.trim() || !currentSection) return;
    setSaving(true);
    try {
      const res = await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveName.trim(), heading: currentSection.heading, content: currentSection.content }),
      });
      const newSnip = await res.json();
      setSnippets(prev => [newSnip, ...prev]);
      setSaveName('');
      setTab('library');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/snippets?id=${id}`, { method: 'DELETE' });
      setSnippets(prev => prev.filter(s => s.id !== id));
    } finally { setDeleting(null); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--bg-0)', border: '1px solid var(--hl-2)', borderRadius: 12,
        width: 520, maxHeight: '70vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hl-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`tab ${tab === 'library' ? 'tab--active' : ''}`} onClick={() => setTab('library')}>
              <BookOpen size={12} /> 片段库
            </button>
            {currentSection && (
              <button className={`tab ${tab === 'save' ? 'tab--active' : ''}`} onClick={() => setTab('save')}>
                <Bookmark size={12} /> 存为片段
              </button>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {tab === 'library' && (
            snippets.length === 0
              ? <p style={{ color: 'var(--tx-3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>暂无片段 — 把常用章节存入片段库，下次一键插入</p>
              : snippets.map(s => (
                <div key={s.id} style={{
                  border: '1px solid var(--hl-1)', borderRadius: 8, padding: '10px 14px', marginBottom: 8,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-1)', marginBottom: 2 }}>{s.name}</div>
                    {s.heading && <div style={{ fontSize: 11, color: 'var(--ac-1)', fontFamily: 'var(--f-mono)', marginBottom: 4 }}>## {s.heading}</div>}
                    <div style={{ fontSize: 11.5, color: 'var(--tx-3)', whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>{s.content.slice(0, 120)}{s.content.length > 120 ? '…' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn--primary btn--sm" onClick={() => { onInsert(s); onClose(); }}>插入</button>
                    <button className="btn btn--sm" onClick={() => handleDelete(s.id)} disabled={deleting === s.id}>
                      {deleting === s.id ? <Spinner size={11} /> : <Trash2 size={11} />}
                    </button>
                  </div>
                </div>
              ))
          )}

          {tab === 'save' && currentSection && (
            <div style={{ padding: '8px 0' }}>
              <p style={{ fontSize: 13, color: 'var(--tx-2)', marginBottom: 16 }}>
                将当前章节「{sectionLabel(currentSection)}」存入片段库，可在其他项目复用。
              </p>
              <label style={{ fontSize: 12, color: 'var(--tx-3)', display: 'block', marginBottom: 6 }}>片段名称</label>
              <input
                autoFocus
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                placeholder={currentSection.heading || '给这个片段起个名字'}
                style={{
                  width: '100%', background: 'var(--bg-1)', border: '1px solid var(--hl-2)',
                  borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--tx-1)',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn--primary" onClick={handleSave} disabled={!saveName.trim() || saving}>
                  {saving ? <><Spinner size={11} /> 保存中…</> : <><Bookmark size={12} /> 保存到片段库</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main ConstitutionEditor ─── */

export default function ConstitutionEditor({
  initialContent,
  onSave,
  saving,
}: {
  initialContent: string;
  onSave: (content: string) => void;
  saving: boolean;
}) {
  const [mode, setMode] = useState<'visual' | 'raw'>('visual');
  const [sections, setSections] = useState<Section[]>(() => parseSections(initialContent));
  const [activeId, setActiveId] = useState<string>(() => {
    const parsed = parseSections(initialContent);
    return parsed[0]?.id ?? '';
  });
  const [rawDraft, setRawDraft] = useState(initialContent);
  const [showSnippets, setShowSnippets] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [dirty, setDirty] = useState(false);

  const activeSection = sections.find(s => s.id === activeId) ?? null;

  /* Sync raw ↔ visual on mode switch */
  const switchMode = (next: 'visual' | 'raw') => {
    if (next === 'raw') {
      setRawDraft(serialize(sections));
    } else {
      const parsed = parseSections(rawDraft);
      setSections(parsed);
      setActiveId(parsed[0]?.id ?? '');
    }
    setMode(next);
    setDirty(false);
  };

  const updateSection = useCallback((id: string, patch: Partial<Section>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    setDirty(true);
  }, []);

  const moveSection = (id: string, dir: -1 | 1) => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
    setDirty(true);
  };

  const deleteSection = (id: string) => {
    setSections(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (activeId === id) setActiveId(remaining[0]?.id ?? '');
      return remaining;
    });
    setDirty(true);
  };

  const addFromTemplate = (tpl: typeof TEMPLATES[0]) => {
    const newSec: Section = { id: uid(), heading: tpl.heading, content: tpl.content };
    setSections(prev => [...prev, newSec]);
    setActiveId(newSec.id);
    setShowTemplates(false);
    setDirty(true);
  };

  const insertSnippet = (snip: Snippet) => {
    const newSec: Section = { id: uid(), heading: snip.heading, content: snip.content };
    setSections(prev => [...prev, newSec]);
    setActiveId(newSec.id);
    setDirty(true);
  };

  const handleSave = () => {
    const content = mode === 'raw' ? rawDraft : serialize(sections);
    onSave(content);
    setDirty(false);
  };

  /* ─── Render ─── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {showSnippets && (
        <SnippetModal
          onClose={() => setShowSnippets(false)}
          onInsert={insertSnippet}
          onSave={() => {}}
          currentSection={activeSection}
        />
      )}

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0 14px',
        borderBottom: '1px solid var(--hl-1)', marginBottom: 0,
      }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-1)', borderRadius: 6, padding: 2, gap: 2 }}>
          {(['visual', 'raw'] as const).map(m => (
            <button key={m} onClick={() => switchMode(m)} style={{
              padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
              background: mode === m ? 'var(--bg-0)' : 'transparent',
              color: mode === m ? 'var(--tx-1)' : 'var(--tx-3)',
              boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
            }}>
              {m === 'visual' ? '可视化' : <><Code size={11} style={{ verticalAlign: '-1px', marginRight: 3 }} />原始</>}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {mode === 'visual' && (
          <>
            {/* Template picker */}
            <div style={{ position: 'relative' }}>
              <button className="btn btn--sm" onClick={() => setShowTemplates(v => !v)}>
                <Plus size={11} /> 添加章节
              </button>
              {showTemplates && (
                <div style={{
                  position: 'absolute', right: 0, top: '110%', zIndex: 50,
                  background: 'var(--bg-0)', border: '1px solid var(--hl-2)', borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: 200, padding: '6px 0',
                }}>
                  <div style={{ padding: '4px 12px 8px', fontSize: 11, color: 'var(--tx-3)', borderBottom: '1px solid var(--hl-1)', marginBottom: 4 }}>从模板添加</div>
                  {TEMPLATES.map(t => (
                    <button key={t.name} onClick={() => addFromTemplate(t)} style={{
                      display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
                      padding: '7px 14px', fontSize: 13, color: 'var(--tx-1)', cursor: 'pointer',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      {t.name}
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid var(--hl-1)', margin: '4px 0 0' }}>
                    <button onClick={() => {
                      const newSec: Section = { id: uid(), heading: '新章节', content: '' };
                      setSections(prev => [...prev, newSec]);
                      setActiveId(newSec.id);
                      setShowTemplates(false);
                      setDirty(true);
                    }} style={{
                      display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
                      padding: '7px 14px', fontSize: 13, color: 'var(--tx-3)', cursor: 'pointer',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      空白章节…
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Snippet library */}
            <button className="btn btn--sm" onClick={() => setShowSnippets(true)}>
              <Bookmark size={11} /> 片段库
            </button>
          </>
        )}

        <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={saving}>
          {saving ? <><Spinner size={11} /> 保存中…</> : <><Check size={11} /> 保存</>}
          {dirty && !saving && <span style={{ marginLeft: 4, width: 6, height: 6, borderRadius: '50%', background: 'var(--warn)', display: 'inline-block', verticalAlign: 'middle' }} />}
        </button>
      </div>

      {/* ── Raw mode ── */}
      {mode === 'raw' && (
        <textarea
          value={rawDraft}
          onChange={e => { setRawDraft(e.target.value); setDirty(true); }}
          style={{
            width: '100%', minHeight: 480, background: 'var(--bg-1)',
            border: '1px solid var(--hl-2)', borderRadius: 8, padding: '14px 16px',
            fontSize: 12.5, fontFamily: 'var(--f-mono)', color: 'var(--tx-1)',
            resize: 'vertical', outline: 'none', lineHeight: 1.75, marginTop: 14,
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* ── Visual mode ── */}
      {mode === 'visual' && (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, marginTop: 14, minHeight: 480, border: '1px solid var(--hl-1)', borderRadius: 8, overflow: 'hidden' }}>

          {/* Section list */}
          <div style={{ borderRight: '1px solid var(--hl-1)', background: 'var(--bg-1)', overflowY: 'auto' }}>
            {sections.map((s, i) => (
              <div key={s.id}
                onClick={() => setActiveId(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 10px',
                  cursor: 'pointer', borderBottom: '1px solid var(--hl-1)',
                  background: activeId === s.id ? 'var(--bg-0)' : 'transparent',
                  borderLeft: activeId === s.id ? '2px solid var(--ac-1)' : '2px solid transparent',
                }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12.5, fontWeight: activeId === s.id ? 600 : 400,
                    color: activeId === s.id ? 'var(--tx-1)' : 'var(--tx-2)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {sectionLabel(s)}
                  </div>
                  {s.heading && <div style={{ fontSize: 10.5, color: 'var(--tx-3)', fontFamily: 'var(--f-mono)' }}>## 章节</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0, opacity: activeId === s.id ? 1 : 0 }}
                  onClick={e => e.stopPropagation()}>
                  <button onClick={() => moveSection(s.id, -1)} disabled={i === 0}
                    style={{ background: 'none', border: 'none', padding: '1px 2px', cursor: 'pointer', color: 'var(--tx-3)', lineHeight: 1 }}>
                    <ChevronUp size={11} />
                  </button>
                  <button onClick={() => moveSection(s.id, 1)} disabled={i === sections.length - 1}
                    style={{ background: 'none', border: 'none', padding: '1px 2px', cursor: 'pointer', color: 'var(--tx-3)', lineHeight: 1 }}>
                    <ChevronDown size={11} />
                  </button>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteSection(s.id); }}
                  style={{
                    background: 'none', border: 'none', padding: '2px 3px', cursor: 'pointer',
                    color: 'var(--tx-3)', flexShrink: 0, opacity: activeId === s.id ? 1 : 0,
                  }}>
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>

          {/* Section editor */}
          {activeSection ? (
            <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 18px', gap: 10, background: 'var(--bg-0)' }}>
              {/* Heading */}
              {activeSection.heading !== '' && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--tx-3)', marginBottom: 5, fontFamily: 'var(--f-mono)' }}>## 章节标题</div>
                  <input
                    value={activeSection.heading}
                    onChange={e => updateSection(activeSection.id, { heading: e.target.value })}
                    style={{
                      width: '100%', background: 'var(--bg-1)', border: '1px solid var(--hl-2)',
                      borderRadius: 6, padding: '7px 10px', fontSize: 14, fontWeight: 600,
                      color: 'var(--tx-1)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              {/* Content */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontSize: 11, color: 'var(--tx-3)', fontFamily: 'var(--f-mono)' }}>内容（Markdown）</div>
                <textarea
                  value={activeSection.content}
                  onChange={e => updateSection(activeSection.id, { content: e.target.value })}
                  style={{
                    flex: 1, minHeight: 360, width: '100%', background: 'var(--bg-1)',
                    border: '1px solid var(--hl-2)', borderRadius: 6, padding: '10px 12px',
                    fontSize: 13, fontFamily: 'var(--f-mono)', color: 'var(--tx-1)',
                    resize: 'none', outline: 'none', lineHeight: 1.75, boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Save as snippet */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn--ghost btn--sm" onClick={() => setShowSnippets(true)}>
                  <Bookmark size={11} /> 存为片段
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx-3)', fontSize: 13 }}>
              选择左侧章节开始编辑
            </div>
          )}
        </div>
      )}
    </div>
  );
}
