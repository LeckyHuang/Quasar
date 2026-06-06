'use client';

import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Trash2, GripVertical } from 'lucide-react';
import type { QuasarConfig, PricingEntry } from '@/types';
import { Toggle, Segmented, Badge, Bi } from '@/components/ui';

function SettingRow({ label, sub, children }: { label: React.ReactNode; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '6px 0' }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--tx-1)', fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--tx-3)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ margin: '24px 0 14px', fontSize: 12, fontWeight: 500, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}
    </h2>
  );
}

const ACCENTS = [
  { id: 'blue',   color: '#5B8DEF', label: 'Blue 电光蓝' },
  { id: 'purple', color: '#7C6EF9', label: 'Purple 紫蓝' },
  { id: 'teal',   color: '#2DD4BF', label: 'Teal 青绿' },
  { id: 'amber',  color: '#F59E0B', label: 'Amber 暖橙' },
];

const EMPTY_ENTRY: Omit<PricingEntry, 'id'> = { type: 'llm', provider: '', model: '', inputPer1k: 0, outputPer1k: 0 }

// crypto.randomUUID() 仅在安全上下文（HTTPS/localhost）可用，
// 服务器经 http://IP 访问时为 undefined，故用 Math.random 兜底
function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function NumInput({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [local, setLocal] = useState(value === 0 ? '' : String(value))

  useEffect(() => {
    setLocal(value === 0 ? '' : String(value))
  }, [value])

  return (
    <input
      type="text" inputMode="decimal"
      className="input" style={{ width: 96, textAlign: 'right', fontSize: 12 }}
      value={local}
      placeholder="0"
      onChange={e => {
        const v = e.target.value
        if (/^(\d+\.?\d*|\.\d*)$/.test(v) || v === '') setLocal(v)
      }}
      onBlur={() => {
        const n = parseFloat(local)
        const committed = isNaN(n) ? 0 : n
        onCommit(committed)
        setLocal(committed === 0 ? '' : String(committed))
      }}
    />
  )
}

function PricingTable({ entries, onChange }: { entries: PricingEntry[]; onChange: (e: PricingEntry[]) => void }) {
  const [draft, setDraft] = useState<Omit<PricingEntry, 'id'>>(EMPTY_ENTRY)

  const update = (id: string, field: keyof PricingEntry, val: string | number) => {
    onChange(entries.map(e => e.id === id ? { ...e, [field]: val } : e))
  }

  const remove = (id: string) => onChange(entries.filter(e => e.id !== id))

  const add = () => {
    if (!draft.provider.trim() || !draft.model.trim()) return
    onChange([...entries, { ...draft, id: genId() }])
    setDraft(EMPTY_ENTRY)
  }

  const thStyle: React.CSSProperties = { fontSize: 10, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 8px', fontWeight: 500, textAlign: 'left', borderBottom: '1px solid var(--hl-2)', whiteSpace: 'nowrap' }
  const tdStyle: React.CSSProperties = { padding: '5px 8px', fontSize: 12, verticalAlign: 'middle' }

  const PriceCell = ({ type, val, onChangeVal }: { type: 'llm' | 'asr'; val: number; onChangeVal: (n: number) => void }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
      <NumInput value={val} onCommit={onChangeVal} />
      <span style={{ fontSize: 10, color: 'var(--tx-3)', whiteSpace: 'nowrap' }}>
        {type === 'asr' ? '¥/min' : '¥/1K'}
      </span>
    </div>
  )

  return (
    <div className="subcard" style={{ marginBottom: 16 }}>
      <div className="subcard__hd">
        <div>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--tx-1)' }}>API 定价表</h3>
          <div className="tx-3" style={{ fontSize: 11.5, marginTop: 2 }}>LLM: 输入/输出分别 ¥/千 tokens；ASR: 统一按 ¥/分钟计费</div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>类型</th>
              <th style={thStyle}>服务商</th>
              <th style={thStyle}>模型 / 标识</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>输入价格</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>输出价格</th>
              <th style={{ ...thStyle, width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} style={{ borderBottom: '1px solid var(--hl-1)' }}>
                <td style={tdStyle}>
                  <select className="input" style={{ fontSize: 12, padding: '2px 6px', width: 68 }}
                    value={e.type} onChange={v => update(e.id, 'type', v.target.value)}>
                    <option value="llm">LLM</option>
                    <option value="asr">ASR</option>
                  </select>
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 12, width: 100 }}
                    value={e.provider} onChange={v => update(e.id, 'provider', v.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 12, width: 190, fontFamily: 'monospace' }}
                    value={e.model} onChange={v => update(e.id, 'model', v.target.value)} />
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <PriceCell type={e.type} val={e.inputPer1k} onChangeVal={n => update(e.id, 'inputPer1k', n)} />
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  {e.type === 'asr'
                    ? <span style={{ color: 'var(--tx-3)', fontSize: 11, paddingRight: 8 }}>—</span>
                    : <PriceCell type="llm" val={e.outputPer1k} onChangeVal={n => update(e.id, 'outputPer1k', n)} />}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <button className="icon-btn btn--danger" onClick={() => remove(e.id)}><Trash2 size={12} /></button>
                </td>
              </tr>
            ))}

            {/* 新增行 */}
            <tr style={{ background: 'var(--bg-2)' }}>
              <td style={tdStyle}>
                <select className="input" style={{ fontSize: 12, padding: '2px 6px', width: 68 }}
                  value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value as 'llm' | 'asr' }))}>
                  <option value="llm">LLM</option>
                  <option value="asr">ASR</option>
                </select>
              </td>
              <td style={tdStyle}>
                <input className="input" style={{ fontSize: 12, width: 100 }}
                  placeholder="moonshot"
                  value={draft.provider} onChange={e => setDraft(d => ({ ...d, provider: e.target.value }))} />
              </td>
              <td style={tdStyle}>
                <input className="input" style={{ fontSize: 12, width: 190, fontFamily: 'monospace' }}
                  placeholder="moonshot-v1-128k"
                  value={draft.model}
                  onChange={e => setDraft(d => ({ ...d, model: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') add() }} />
              </td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>
                <PriceCell type={draft.type} val={draft.inputPer1k} onChangeVal={n => setDraft(d => ({ ...d, inputPer1k: n }))} />
              </td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>
                {draft.type === 'asr'
                  ? <span style={{ color: 'var(--tx-3)', fontSize: 11, paddingRight: 8 }}>—</span>
                  : <PriceCell type="llm" val={draft.outputPer1k} onChangeVal={n => setDraft(d => ({ ...d, outputPer1k: n }))} />}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                <button className="btn btn--sm" onClick={add}><Plus size={12} /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {entries.length === 0 && (
        <div style={{ padding: '8px 16px 12px', color: 'var(--tx-3)', fontSize: 12 }}>
          暂无定价记录 — 在最后一行填入模型信息后点击 + 添加
        </div>
      )}
    </div>
  )
}

function ScanList({ title, sub, dirKey, dirs, newVal, setNewVal, onAdd, onRemove }: {
  title: React.ReactNode; sub: string;
  dirKey: 'skillsDirs' | 'projectsDirs';
  dirs: string[]; newVal: string; setNewVal: (v: string) => void;
  onAdd: (key: 'skillsDirs' | 'projectsDirs', val: string) => void;
  onRemove: (key: 'skillsDirs' | 'projectsDirs', idx: number) => void;
}) {
  return (
    <div className="subcard">
      <div className="subcard__hd">
        <div>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--tx-1)', letterSpacing: '-0.005em' }}>{title}</h3>
          <div className="tx-3" style={{ fontSize: 11.5, marginTop: 2 }}>{sub}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className="input" style={{ width: 220 }}
            placeholder="~/path/to/dir"
            value={newVal}
            onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onAdd(dirKey, newVal); }}
          />
          <button className="btn" onClick={() => onAdd(dirKey, newVal)}>
            <Plus size={13} /> 添加目录
          </button>
        </div>
      </div>
      <div className="set-list">
        {dirs.map((d, i) => (
          <div key={i} className="set-row">
            <div className="set-row__path">
              <span className="set-row__drag"><GripVertical size={14} /></span>
              <span className="set-row__path-text">{d}</span>
              <Badge tone="ok" dot>已配置</Badge>
            </div>
            <div className="set-row__meta">
              <button className="icon-btn" title="重新扫描" onClick={() => fetch('/api/scan', { method: 'POST' })}>
                <RefreshCw size={12} />
              </button>
              <button className="icon-btn btn--danger" title="删除" onClick={() => onRemove(dirKey, i)}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        {dirs.length === 0 && (
          <div style={{ padding: '12px 16px', color: 'var(--tx-3)', fontSize: 12 }}>
            还没有配置目录 — 输入路径后点击「添加目录」
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [config, setConfig] = useState<QuasarConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accent, setAccent] = useState('blue');
  const [newSkillsDir, setNewSkillsDir] = useState('');
  const [newProjectsDir, setNewProjectsDir] = useState('');

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(data => {
      const cfg = data.config ?? data;
      setConfig(cfg);
      if (cfg.accent) setAccent(cfg.accent);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const dispatchTheme = (appearance: string, accentId: string) => {
    window.dispatchEvent(new CustomEvent('quasar:theme-change', { detail: { appearance, accent: accentId } }));
  };

  const save = async (updates: Partial<QuasarConfig>) => {
    if (!config) return;
    const next = { ...config, ...updates };
    setConfig(next);
    setSaving(true);
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
    } finally { setSaving(false); }
  };

  const removeDir = (key: 'skillsDirs' | 'projectsDirs', idx: number) => {
    if (!config) return;
    const arr = [...config[key]];
    arr.splice(idx, 1);
    save({ [key]: arr });
  };

  const addDir = (key: 'skillsDirs' | 'projectsDirs', val: string) => {
    if (!config || !val.trim()) return;
    const arr = [...config[key], val.trim()];
    save({ [key]: arr });
    if (key === 'skillsDirs') setNewSkillsDir('');
    else setNewProjectsDir('');
  };

  if (loading) return <div style={{ padding: 48, color: 'var(--tx-3)' }}>Loading…</div>;
  if (!config) return <div style={{ padding: 48, color: 'var(--bad)' }}>Failed to load config</div>;

  return (
    <div className="page">
      <div className="page__top">
        <h1 className="page__title"><Bi en="Settings" cn="设置" /></h1>
        <div className="page__top-actions">
          <span className="muted" style={{ fontSize: 12 }}>QUASAR v0.1.0{saving ? ' · 保存中…' : ''}</span>
        </div>
      </div>

      <div className="page__scroll">
        <div className="page__body" style={{ maxWidth: 880 }}>
          <SectionHeader>Scan Directories · 扫描目录</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
            <ScanList
              title={<Bi en="Skills directories" cn="Skills 扫描目录" />}
              sub="QUASAR 会在这些目录里扫描 SKILL.md 文件"
              dirKey="skillsDirs"
              dirs={config.skillsDirs}
              newVal={newSkillsDir}
              setNewVal={setNewSkillsDir}
              onAdd={addDir}
              onRemove={removeDir}
            />
            <ScanList
              title={<Bi en="Projects directories" cn="Projects 扫描目录" />}
              sub="QUASAR 会在这些目录里扫描项目"
              dirKey="projectsDirs"
              dirs={config.projectsDirs}
              newVal={newProjectsDir}
              setNewVal={setNewProjectsDir}
              onAdd={addDir}
              onRemove={removeDir}
            />
          </div>

          <SectionHeader>Appearance · 外观</SectionHeader>
          <div className="subcard" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SettingRow label={<Bi en="Theme" cn="主题" />} sub="Dark first; light mode available for export use cases">
                <Segmented value={config.appearance} onChange={v => {
                  const ap = v as QuasarConfig['appearance'];
                  save({ appearance: ap });
                  dispatchTheme(ap, accent);
                }} options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                  { value: 'system', label: 'System' },
                ]} />
              </SettingRow>
              <SettingRow label={<Bi en="Accent color" cn="主题色" />} sub="Affects selection, primary buttons and highlights">
                <div style={{ display: 'flex', gap: 6 }}>
                  {ACCENTS.map(c => (
                    <button key={c.id} onClick={() => {
                      setAccent(c.id);
                      save({ accent: c.id } as Partial<QuasarConfig>);
                      dispatchTheme(config.appearance, c.id);
                    }} style={{
                      appearance: 'none',
                      border: '1px solid ' + (accent === c.id ? c.color : 'var(--hl-2)'),
                      background: 'var(--bg-4)', padding: '4px 8px 4px 4px',
                      borderRadius: 6, color: 'var(--tx-2)', fontSize: 12,
                      display: 'flex', alignItems: 'center', gap: 6, cursor: 'default',
                    }}>
                      <span style={{ width: 14, height: 14, borderRadius: 3, background: c.color, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)', display: 'inline-block' }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </SettingRow>
            </div>
          </div>

          <SectionHeader>Auto Scan · 自动扫描</SectionHeader>
          <div className="subcard" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SettingRow label={<Bi en="Enable auto scan" cn="自动扫描" />} sub="Periodically rescan configured directories to detect changes">
                <Toggle value={config.autoScan} onChange={v => save({ autoScan: v })} />
              </SettingRow>
              <SettingRow label={<Bi en="Scan interval" cn="扫描间隔" />} sub={config.autoScan ? 'Trigger a background scan every N minutes' : 'Disabled while auto scan is off'}>
                <Segmented
                  value={String(config.scanIntervalMs / 60000) + 'min'}
                  onChange={v => {
                    const mins = parseInt(v);
                    save({ scanIntervalMs: mins * 60000 });
                  }}
                  options={[
                    { value: '5min', label: '5 min' },
                    { value: '15min', label: '15 min' },
                    { value: '30min', label: '30 min' },
                  ]}
                />
              </SettingRow>
            </div>
          </div>

          <SectionHeader>Cache & Data · 缓存与数据</SectionHeader>
          <div className="subcard" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SettingRow label={<Bi en="Cache file" cn="缓存文件" />} sub="~/.quasar/cache.json — local scan metadata">
                <span className="mono tx-2" style={{ fontSize: 12 }}>~/.quasar/cache.json</span>
              </SettingRow>
              <SettingRow label={<Bi en="Clear cache" cn="清除缓存" />} sub="Force a full rescan on next load">
                <button className="btn btn--danger btn--sm" onClick={async () => {
                  await fetch('/api/scan', { method: 'POST' });
                }}>
                  <RefreshCw size={12} /> Force rescan
                </button>
              </SettingRow>
            </div>
          </div>

          <SectionHeader>API Pricing · 接口定价</SectionHeader>
          <PricingTable
            entries={config.pricing ?? []}
            onChange={pricing => save({ pricing })}
          />
        </div>
      </div>
    </div>
  );
}
