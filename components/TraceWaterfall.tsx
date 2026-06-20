'use client';

import React, { useState } from 'react';

interface TraceSpan {
  type: 'span' | 'llm';
  operation: string;
  provider?: string;
  model?: string;
  start_ts: number;
  end_ts: number;
  latency_ms: number;
  status: 'ok' | 'error';
  error_msg?: string;
  cost_cny?: number;
  input_tokens?: number;
  output_tokens?: number;
  metadata?: Record<string, unknown>;
}

interface Trace {
  trace_id: string;
  start_ts: number;
  total_latency_ms: number;
  status: 'ok' | 'error';
  spans: TraceSpan[];
}

interface TraceWaterfallProps {
  traces: Trace[];
  serviceName: string;
}

// Common operation → human-readable label. Unknown ops fall back to formatted snake_case.
const OP_LABELS: Record<string, string> = {
  asr: 'ASR',
  ingest: '摄入',
  intent_analysis: '意图分析',
  business_opportunity: '商机识别',
  reception_review: '接待复盘',
  customer_brief: '客户简报',
  summarize: '摘要',
  summarization: '摘要',
  classify: '分类',
  extract: '提取',
  rerank: '重排',
  embedding: '向量化',
  retrieval: '检索',
  qa: 'QA',
  response: '生成回复',
  response_generation: '生成回复',
  plan: '规划',
  reflection: '反思',
  tool_call: '工具调用',
};

function fmtOpName(op: string): string {
  return OP_LABELS[op] ?? op.replace(/_/g, ' ');
}

// Build a readable flow label from spans, e.g. "ASR → 意图分析 → 生成回复"
function traceSemanticLabel(spans: TraceSpan[]): string {
  const seen = new Set<string>();
  const ops: string[] = [];
  for (const s of spans) {
    if (!seen.has(s.operation)) {
      seen.add(s.operation);
      ops.push(fmtOpName(s.operation));
    }
  }
  if (ops.length === 0) return '—';
  if (ops.length <= 4) return ops.join(' → ');
  return ops.slice(0, 3).join(' → ') + ` +${ops.length - 3}`;
}

function traceTotalTokens(spans: TraceSpan[]): number {
  return spans.reduce((sum, s) => sum + (s.input_tokens ?? 0) + (s.output_tokens ?? 0), 0);
}

function traceTotalCost(spans: TraceSpan[]): number | null {
  let total = 0;
  let any = false;
  for (const s of spans) {
    if (s.cost_cny != null && s.cost_cny > 0) { total += s.cost_cny; any = true; }
  }
  return any ? total : null;
}

function fmtLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function fmtTs(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function opColor(span: TraceSpan): string {
  if (span.status === 'error') return 'var(--bad)';
  if (span.type === 'llm') return 'var(--ac-1)';
  return 'var(--ok)';
}

const STRIPE = `repeating-linear-gradient(
  45deg,
  transparent,
  transparent 3px,
  rgba(255,255,255,0.08) 3px,
  rgba(255,255,255,0.08) 6px
)`;

function SpanRow({ span, traceStart, totalMs }: { span: TraceSpan; traceStart: number; totalMs: number }) {
  const [hover, setHover] = useState(false);
  const leftPct = totalMs > 0 ? ((span.start_ts - traceStart) / (totalMs / 1000)) * 100 : 0;
  const widthPct = totalMs > 0 ? (span.latency_ms / totalMs) * 100 : 0;
  const color = opColor(span);

  const hasTokens = span.input_tokens != null;
  const hasCost = span.cost_cny != null && span.cost_cny > 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '3px 0', position: 'relative' }}>
      {/* Left: label column */}
      <div style={{ width: 200, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, paddingRight: 10 }}>
        <span style={{
          fontSize: 10, padding: '1px 6px', borderRadius: 3,
          background: span.type === 'llm' ? 'rgba(91,141,239,0.15)' : 'rgba(45,212,191,0.12)',
          color: span.type === 'llm' ? 'var(--ac-1)' : 'var(--ok)',
          fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.03em',
          flexShrink: 0,
        }}>
          {span.type === 'llm' ? 'LLM' : 'SPAN'}
        </span>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: 11.5, color: 'var(--tx-2)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fmtOpName(span.operation)}
          </div>
          {/* Sub-label: provider/model */}
          {(span.provider || span.model) && (
            <div style={{ fontSize: 9.5, color: 'var(--tx-3)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
              {[span.provider, span.model].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>

      {/* Center: waterfall bar */}
      <div style={{ flex: 1, position: 'relative', height: 20 }}>
        {/* Track */}
        <div style={{ position: 'absolute', inset: '6px 0', background: 'var(--hl-1)', borderRadius: 2 }} />
        {/* Bar */}
        <div
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            position: 'absolute',
            top: 4, bottom: 4,
            left: `${Math.min(leftPct, 99)}%`,
            width: `${Math.max(widthPct, 0.5)}%`,
            background: span.status === 'error'
              ? 'var(--bad)'
              : span.type === 'llm'
                ? `${STRIPE}, rgba(91,141,239,0.55)`
                : color,
            borderRadius: 3,
            transition: 'opacity 0.15s',
            opacity: hover ? 1 : 0.85,
            cursor: 'default',
            boxShadow: hover ? `0 0 8px ${color}55` : 'none',
          }}
        />
        {/* Hover tooltip */}
        {hover && (
          <div style={{
            position: 'absolute',
            top: -38, left: `${Math.min(leftPct + widthPct / 2, 70)}%`,
            transform: 'translateX(-50%)',
            background: 'var(--bg-4)', border: '1px solid var(--hl-2)',
            borderRadius: 6, padding: '5px 9px', zIndex: 10,
            fontSize: 11, fontFamily: 'monospace', whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}>
            <span style={{ color: 'var(--tx-1)', fontWeight: 600 }}>{fmtLatency(span.latency_ms)}</span>
            {span.error_msg && <span style={{ color: 'var(--bad)', marginLeft: 6 }}>{span.error_msg.slice(0, 40)}</span>}
          </div>
        )}
      </div>

      {/* Right: latency */}
      <div style={{ width: 52, textAlign: 'right', fontSize: 11, fontFamily: 'monospace', color: span.status === 'error' ? 'var(--bad)' : 'var(--tx-3)', flexShrink: 0 }}>
        {fmtLatency(span.latency_ms)}
      </div>

      {/* Far right: token / cost / ASR duration */}
      <div style={{ width: 120, textAlign: 'right', flexShrink: 0, paddingLeft: 8 }}>
        {hasTokens && (
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--tx-3)' }}>
            ↑{(span.input_tokens ?? 0).toLocaleString()} ↓{(span.output_tokens ?? 0).toLocaleString()}
          </span>
        )}
        {hasCost && (
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--warn)', marginLeft: hasTokens ? 6 : 0 }}>
            ¥{span.cost_cny!.toFixed(4)}
          </span>
        )}
        {!hasTokens && !hasCost && span.type === 'span' && (() => {
          const dur = span.metadata?.audio_duration_s as number | undefined
          if (span.operation === 'asr' && dur != null && dur > 0) {
            const mins = Math.floor(dur / 60)
            const secs = Math.round(dur % 60)
            const label = mins > 0 ? `${mins}m${secs}s` : `${secs}s`
            return (
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--warn)' }}>
                🎙 {label}
              </span>
            )
          }
          if (span.operation === 'asr') {
            return <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 3, background: 'rgba(245,158,11,0.12)', color: 'var(--warn)', fontFamily: 'monospace', letterSpacing: '0.02em' }}>时长计费</span>
          }
          return <span style={{ fontSize: 10, color: 'var(--tx-4, var(--tx-3))', fontFamily: 'monospace' }}>—</span>
        })()}
      </div>
    </div>
  );
}

function TraceRow({ trace }: { trace: Trace }) {
  const [open, setOpen] = useState(false);

  const semanticLabel = traceSemanticLabel(trace.spans);
  const totalTokens = traceTotalTokens(trace.spans);
  const totalCost = traceTotalCost(trace.spans);
  const shortId = trace.trace_id.slice(0, 10);

  // Compute effective display duration from (span_start_offset + span_latency).
  // Avoids the waterfall collapsing when a span's end_ts is corrupted in the DB,
  // which would inflate total_latency_ms to hours while actual spans take seconds.
  const effectiveMs = trace.spans.reduce((max, s) => {
    const spanEndMs = (s.start_ts - trace.start_ts) * 1000 + s.latency_ms
    return Math.max(max, spanEndMs)
  }, 0) || trace.total_latency_ms
  const isInflated = trace.total_latency_ms > effectiveMs * 5 && effectiveMs > 500
  const displayMs = isInflated ? effectiveMs : trace.total_latency_ms

  return (
    <div style={{ borderBottom: '1px solid var(--hl-1)' }}>
      {/* Header */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
          cursor: 'pointer', userSelect: 'none',
          background: open ? 'var(--bg-2)' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        {/* Chevron */}
        <span style={{ fontSize: 10, color: 'var(--tx-3)', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>

        {/* Semantic label + short id */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 12.5, color: 'var(--tx-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {semanticLabel}
          </span>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--tx-4, var(--tx-3))', opacity: 0.6 }}>
            #{shortId}
          </span>
        </div>

        {/* Total tokens (if any LLM spans) */}
        {totalTokens > 0 && (
          <span style={{ fontSize: 10.5, fontFamily: 'monospace', color: 'var(--tx-3)', whiteSpace: 'nowrap' }}>
            {totalTokens.toLocaleString()} tok
          </span>
        )}

        {/* Total cost */}
        {totalCost != null && (
          <span style={{ fontSize: 10.5, fontFamily: 'monospace', color: 'var(--warn)', whiteSpace: 'nowrap' }}>
            ¥{totalCost.toFixed(4)}
          </span>
        )}

        {/* span count */}
        <span style={{ fontSize: 11, color: 'var(--tx-3)' }}>{trace.spans.length} spans</span>

        {/* total latency */}
        <span
          title={isInflated ? `实际有效耗时 ${fmtLatency(effectiveMs)}，原始记录 ${fmtLatency(trace.total_latency_ms)}（end_ts 异常）` : undefined}
          style={{
            fontSize: 12, fontFamily: 'monospace', fontWeight: 600,
            color: isInflated ? 'var(--tx-3)' : displayMs > 30000 ? 'var(--warn)' : 'var(--tx-1)',
            minWidth: 48, textAlign: 'right',
            textDecoration: isInflated ? 'line-through' : 'none',
          }}>
          {fmtLatency(trace.total_latency_ms)}
        </span>
        {isInflated && (
          <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: 'var(--warn)' }}
            title={`end_ts 异常，已用各 span 实际耗时重算`}>
            {fmtLatency(effectiveMs)} ⚠
          </span>
        )}

        {/* status badge */}
        <span style={{
          fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 700,
          background: trace.status === 'ok' ? 'rgba(45,212,191,0.12)' : 'rgba(239,68,68,0.15)',
          color: trace.status === 'ok' ? 'var(--ok)' : 'var(--bad)',
          fontFamily: 'monospace',
        }}>
          {trace.status.toUpperCase()}
        </span>

        {/* timestamp */}
        <span style={{ fontSize: 11, color: 'var(--tx-3)', fontFamily: 'monospace', minWidth: 70, textAlign: 'right' }}>
          {fmtTs(trace.start_ts)}
        </span>
      </div>

      {/* Waterfall body */}
      {open && (
        <div style={{ padding: '8px 14px 12px', background: 'var(--bg-1)' }}>
          {/* Column header */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid var(--hl-1)' }}>
            <div style={{ width: 200, fontSize: 10, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>操作</div>
            <div style={{ flex: 1, fontSize: 10, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>时间线</div>
            <div style={{ width: 52, fontSize: 10, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>耗时</div>
            <div style={{ width: 120, fontSize: 10, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right', paddingLeft: 8 }}>用量 / 成本</div>
          </div>
          {trace.spans.map((span, i) => (
            <SpanRow key={i} span={span} traceStart={trace.start_ts} totalMs={displayMs} />
          ))}
          {/* Timeline scale */}
          <div style={{ display: 'flex', marginLeft: 200, marginRight: 172, marginTop: 6, paddingTop: 4, borderTop: '1px solid var(--hl-1)' }}>
            {[0, 25, 50, 75, 100].map(pct => (
              <div key={pct} style={{ position: 'relative', left: `${pct === 100 ? 'auto' : pct + '%'}`, right: pct === 100 ? 0 : 'auto', marginRight: pct < 100 ? 'auto' : 0 }}>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--tx-3)' }}>
                  {fmtLatency(displayMs * pct / 100)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TraceWaterfall({ traces, serviceName }: TraceWaterfallProps) {
  if (traces.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--tx-3)', fontSize: 13 }}>
        暂无链路记录
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, padding: '8px 14px 8px', borderBottom: '1px solid var(--hl-2)', fontSize: 11, color: 'var(--tx-3)' }}>
        <span>{serviceName} · {traces.length} 条链路</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--ok)', display: 'inline-block' }} />非LLM阶段
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: `${STRIPE}, rgba(91,141,239,0.55)`, display: 'inline-block' }} />LLM调用
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--bad)', display: 'inline-block' }} />错误
          </span>
        </span>
      </div>
      {traces.map(trace => (
        <TraceRow key={trace.trace_id} trace={trace} />
      ))}
    </div>
  );
}

export default TraceWaterfall;
