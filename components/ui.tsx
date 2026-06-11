'use client';

import React, { useState, useCallback } from 'react';
import { X, ArrowUp, ArrowDown, Flame, CheckCircle, XCircle } from 'lucide-react';

// ─── Badge ───────────────────────────────────────────────────────────────────
interface BadgeProps {
  tone?: 'soft' | 'ok' | 'warn' | 'bad' | 'info' | 'accent';
  dot?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
export function Badge({ tone = 'soft', dot, children, style }: BadgeProps) {
  return (
    <span className={`badge badge--${tone} ${dot ? 'badge--dot' : ''}`} style={style}>
      {children}
    </span>
  );
}

// ─── Chip ────────────────────────────────────────────────────────────────────
interface ChipProps {
  mono?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
export function Chip({ mono, removable, onRemove, children, style }: ChipProps) {
  return (
    <span className={`chip ${mono ? 'chip--mono' : ''} ${removable ? 'chip--removable' : ''}`} style={style}>
      {children}
      {removable && (
        <button onClick={onRemove} aria-label="remove">
          <X size={10} strokeWidth={2} />
        </button>
      )}
    </span>
  );
}

// ─── CatChip ─────────────────────────────────────────────────────────────────
const CATEGORIES: Record<string, { label: string; color: string }> = {
  engineering: { label: 'Engineering', color: '#5B8DEF' },
  content:     { label: 'Content',     color: '#E07AC7' },
  design:      { label: 'Design',      color: '#A78BFA' },
  data:        { label: 'Data',        color: '#4ED4B5' },
  uncategorized: { label: 'Other',     color: '#74747F' },
};

export function CatChip({ catId }: { catId: string }) {
  const cat = CATEGORIES[catId] || CATEGORIES.uncategorized;
  return <span className={`cat-chip cat--${catId}`}>{cat.label}</span>;
}

export { CATEGORIES };

// ─── Heat ────────────────────────────────────────────────────────────────────
export function Heat({ level }: { level: 'hot' | 'warm' | 'cold' }) {
  return (
    <span className={`heat heat--${level}`}>
      {level === 'hot' && <Flame size={10} strokeWidth={2} />}
      {level === 'hot' ? 'Hot' : level === 'warm' ? 'Warm' : 'Cold'}
    </span>
  );
}

// ─── HealthRing ───────────────────────────────────────────────────────────────
interface HealthRingProps {
  value?: number;
  size?: number;
  stroke?: number;
  label?: string | number;
}
export function HealthRing({ value = 0, size = 38, stroke = 4, label }: HealthRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  const color = value >= 80 ? 'var(--ok)' : value >= 60 ? 'var(--warn)' : 'var(--bad)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-5)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)' }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.34} fontWeight="600" fill="var(--tx-1)"
        style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
        {label != null ? label : value}
      </text>
    </svg>
  );
}

// ─── AheadBehind ─────────────────────────────────────────────────────────────
export function AheadBehind({ ahead = 0, behind = 0 }: { ahead?: number; behind?: number }) {
  if (!ahead && !behind) {
    return <span className="ahead-behind"><span className="ahead-behind__sep">·</span>up to date</span>;
  }
  return (
    <span className="ahead-behind">
      {ahead > 0 && (
        <>
          <ArrowUp size={10} strokeWidth={2.4} className="ahead-behind__up" />
          <span className="ahead-behind__up">{ahead}</span>
        </>
      )}
      {ahead > 0 && behind > 0 && <span className="ahead-behind__sep">·</span>}
      {behind > 0 && (
        <>
          <ArrowDown size={10} strokeWidth={2.4} className="ahead-behind__down" />
          <span className="ahead-behind__down">{behind}</span>
        </>
      )}
    </span>
  );
}

// ─── Donut ────────────────────────────────────────────────────────────────────
interface DonutItem { name: string; value: number; color: string; }
interface DonutProps { data: DonutItem[]; size?: number; stroke?: number; }
export function Donut({ data, size = 132, stroke = 18 }: DonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // Precompute each segment's cumulative start offset (prefix sum) so we never
  // reassign a variable during render.
  const offsets: number[] = [];
  let running = 0;
  for (const d of data) {
    offsets.push(running);
    running += total > 0 ? (d.value / total) * c : 0;
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-5)" strokeWidth={stroke} />
      {data.map((d, i) => {
        const len = total > 0 ? (d.value / total) * c : 0;
        const dasharray = `${len} ${c - len}`;
        const dashoffset = -offsets[i];
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={d.color} strokeWidth={stroke}
            strokeDasharray={dasharray} strokeDashoffset={dashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} strokeLinecap="butt" />
        );
      })}
    </svg>
  );
}

// ─── BarChart ─────────────────────────────────────────────────────────────────
interface BarChartProps { data: number[]; peakIdx?: number; axisLabels?: string[]; }
export function BarChart({ data, peakIdx, axisLabels }: BarChartProps) {
  const max = Math.max(...data, 1);
  return (
    <div>
      <div className="bar-chart">
        {data.map((v, i) => (
          <div key={i}
            className={`bar-chart__bar ${i === peakIdx ? 'bar-chart__bar--peak' : ''}`}
            style={{ height: `${Math.max(2, (v / max) * 100)}%` }}
            title={`${v}`}
          />
        ))}
      </div>
      {axisLabels && (
        <div className="bar-chart__axis">
          {axisLabels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
    </div>
  );
}

// ─── Segmented ───────────────────────────────────────────────────────────────
interface SegOption { value: string; label: string; icon?: React.ReactNode; }
interface SegmentedProps {
  value: string;
  options: (string | SegOption)[];
  onChange: (v: string) => void;
}
export function Segmented({ value, options, onChange }: SegmentedProps) {
  return (
    <div className="seg">
      {options.map((o) => {
        const isObj = typeof o === 'object' && o !== null;
        const v = isObj ? (o as SegOption).value : o as string;
        const lbl = isObj ? (o as SegOption).label : o as string;
        const icon = isObj ? (o as SegOption).icon : null;
        return (
          <button key={v} className={`seg__btn ${v === value ? 'seg__btn--active' : ''}`}
            onClick={() => onChange(v)}>
            {icon}{lbl}
          </button>
        );
      })}
    </div>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────────
export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle ${value ? 'toggle--on' : ''}`}
      onClick={() => onChange(!value)} role="switch" aria-checked={value} />
  );
}

// ─── Bi ──────────────────────────────────────────────────────────────────────
export function Bi({ en, cn, block }: { en: string; cn?: string; block?: boolean }) {
  return (
    <>
      {en}
      {cn && <span className={`cn-sub ${block ? 'cn-sub--block' : ''}`}>{cn}</span>}
    </>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="spinner" width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="var(--hl-3)" strokeWidth="2" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="var(--ac-1)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Markdown ─────────────────────────────────────────────────────────────────
function renderMarkdown(src: string): React.ReactNode[] {
  const lines = src.split('\n');
  const out: React.ReactNode[] = [];
  let inCode = false; let codeBuf: string[] = []; let codeLang = '';
  let listBuf: string[] | null = null; let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listBuf) {
      const Tag = listType === 'ol' ? 'ol' : 'ul';
      out.push(
        <Tag key={'l-' + out.length}>
          {listBuf.map((li, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(li) }} />)}
        </Tag>
      );
      listBuf = null; listType = null;
    }
  };
  const inline = (s: string) => s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Collect consecutive pipe-table lines and flush as a <table>
  let tableBuf: string[] | null = null;
  const flushTable = () => {
    if (!tableBuf || tableBuf.length < 2) { tableBuf = null; return; }
    const parseRow = (row: string) =>
      row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    const headers = parseRow(tableBuf[0]);
    // skip separator row (index 1)
    const rows = tableBuf.slice(2).map(parseRow);
    out.push(
      <div key={'t-' + out.length} style={{ overflowX: 'auto', marginBottom: 12 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
          <thead>
            <tr>{headers.map((h, hi) => (
              <th key={hi} style={{ padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid var(--hl-2)', color: 'var(--tx-2)', fontWeight: 600, whiteSpace: 'nowrap' }}
                dangerouslySetInnerHTML={{ __html: inline(h) }} />
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: '1px solid var(--hl-1)' }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: '6px 12px', color: 'var(--tx-2)' }}
                    dangerouslySetInnerHTML={{ __html: inline(cell) }} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuf = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.startsWith('```')) {
      if (!inCode) { inCode = true; codeLang = raw.slice(3).trim(); codeBuf = []; flushList(); flushTable(); }
      else {
        inCode = false;
        out.push(<pre key={'c-' + i}><code data-lang={codeLang}>{codeBuf.join('\n')}</code></pre>);
        codeBuf = [];
      }
      continue;
    }
    if (inCode) { codeBuf.push(raw); continue; }

    // Pipe table detection: line must contain | and not be empty
    const isPipeRow = /^\|.+\|/.test(raw.trim()) || (raw.includes('|') && raw.trim().startsWith('|'));
    const isSepRow = /^\|[\s|:-]+\|/.test(raw.trim());
    if (isPipeRow || isSepRow) {
      flushList();
      tableBuf = tableBuf || [];
      tableBuf.push(raw);
      continue;
    } else if (tableBuf) {
      flushTable();
    }

    if (/^#\s/.test(raw)) { flushList(); out.push(<h1 key={i} dangerouslySetInnerHTML={{ __html: inline(raw.slice(2)) }} />); continue; }
    if (/^##\s/.test(raw)) { flushList(); out.push(<h2 key={i} dangerouslySetInnerHTML={{ __html: inline(raw.slice(3)) }} />); continue; }
    if (/^###\s/.test(raw)) { flushList(); out.push(<h3 key={i} dangerouslySetInnerHTML={{ __html: inline(raw.slice(4)) }} />); continue; }
    if (/^---\s*$/.test(raw)) { flushList(); out.push(<hr key={i} />); continue; }
    const ul = raw.match(/^\s*[-*]\s+(.+)/);
    const ol = raw.match(/^\s*\d+\.\s+(.+)/);
    if (ul) { if (listType !== 'ul') flushList(); listBuf = listBuf || []; listType = 'ul'; listBuf.push(ul[1]); continue; }
    if (ol) { if (listType !== 'ol') flushList(); listBuf = listBuf || []; listType = 'ol'; listBuf.push(ol[1]); continue; }
    if (raw.startsWith('>')) { flushList(); out.push(<blockquote key={i} dangerouslySetInnerHTML={{ __html: inline(raw.replace(/^>\s?/, '')) }} />); continue; }
    if (raw.trim() === '') { flushList(); continue; }
    flushList();
    out.push(<p key={i} dangerouslySetInnerHTML={{ __html: inline(raw) }} />);
  }
  flushList();
  flushTable();
  if (inCode) out.push(<pre key="c-end"><code>{codeBuf.join('\n')}</code></pre>);
  return out;
}

export function Markdown({ children }: { children: string }) {
  return <div className="md">{renderMarkdown(children)}</div>;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
interface ToastMsg { id: number; kind: 'ok' | 'err'; text: string }

export function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const show = useCallback((kind: 'ok' | 'err', text: string) => {
    const id = Date.now();
    setToasts(t => [...t, { id, kind, text }]);
    setTimeout(() => setToasts(t => t.filter(m => m.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

export function ToastStack({ toasts }: { toasts: ToastMsg[] }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 999 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: t.kind === 'ok' ? 'var(--ok)' : 'var(--bad)',
          color: '#fff', borderRadius: 8, padding: '9px 14px', fontSize: 13,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)', minWidth: 220,
        }}>
          {t.kind === 'ok' ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {t.text}
        </div>
      ))}
    </div>
  );
}
