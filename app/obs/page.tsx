'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Plus, Trash2, AlertTriangle, Activity, CheckCircle, XCircle, Bell, BellOff, Lightbulb } from 'lucide-react';
import { Badge, Spinner, Bi } from '@/components/ui';
import type { ObsService, AlertRule, AlertEvent } from '@/types';
import { generateSuggestions } from '@/lib/obsSuggestions';
import type { Suggestion } from '@/lib/obsSuggestions';
import { TraceWaterfall } from '@/components/TraceWaterfall';

/* ─── helpers ─── */
function fmtCost(v: number | null) {
  if (v == null || v === 0) return '¥0';
  return v < 0.001 ? '<¥0.001' : `¥${v.toFixed(v < 1 ? 3 : 2)}`;
}
function fmtLatency(ms: number | null) {
  if (!ms) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}
function fmtTs(ts: number) {
  const d = new Date(ts * 1000);
  return `${d.getMonth()+1}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function uid() { return Math.random().toString(36).slice(2, 10); }

/* ─── types ─── */
interface ServiceResult {
  id: string; name: string; baseUrl: string;
  status: 'ok' | 'down';
  data?: {
    summary: { total_calls: number; error_count: number; error_rate: number; avg_latency_ms: number; total_cost_cny: number; total_tokens: number };
    by_project: Array<{ project: string; calls: number; cost_cny: number | null; avg_latency_ms: number | null; errors: number }>;
    recent_errors: unknown[]; recent_calls: unknown[];
  };
  error?: string;
}
interface ModelRow {
  model: string; provider: string; service: string;
  calls: number; total_tokens: number; cost_cny: number; avg_latency_ms: number | null;
}
interface AggregateTrace {
  trace_id: string; start_ts: number; total_latency_ms: number; status: string
  spans: unknown[]; serviceName: string; serviceId: string
}
interface AggregateData {
  summary: { total_calls: number; error_count: number; error_rate: number; avg_latency_ms: number; total_cost_cny: number; total_tokens: number; latency_p50?: number | null; latency_p95?: number | null; latency_p99?: number | null; auth_error_count?: number; rate_limit_count?: number } | null;
  services: ServiceResult[];
  by_model: ModelRow[];
  traces: AggregateTrace[];
  alerts: AlertEvent[];
  days: number;
}

/* ─── metric labels ─── */
const METRIC_LABELS: Record<string, string> = {
  error_rate: '错误率',
  avg_latency_ms: '平均延迟 (ms)',
  total_cost_cny: '总成本 (¥)',
  asr_cost_cny: 'ASR 成本 (¥)',
  daily_calls: '日调用量 (次)',
  auth_error_count: 'Auth 失败次数',
  rate_limit_count: '限流触发次数',
};
const METRIC_DEFAULTS: Record<string, number> = {
  error_rate: 0.1,
  avg_latency_ms: 30000,
  total_cost_cny: 10,
  asr_cost_cny: 5,
  daily_calls: 200,
  auth_error_count: 3,
  rate_limit_count: 5,
};

/* ─── Sub-components ─── */
function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="subcard" style={{ padding: '14px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--tx-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color }}>{value}</div>
    </div>
  );
}

function ServiceCard({ svc }: { svc: ServiceResult }) {
  const s = svc.status === 'ok' ? svc.data!.summary : null;
  return (
    <div className="subcard" style={{ borderLeft: `3px solid ${svc.status === 'ok' ? 'var(--ok)' : 'var(--bad)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: s ? 10 : 0 }}>
        {svc.status === 'ok'
          ? <CheckCircle size={14} color="var(--ok)" />
          : <XCircle size={14} color="var(--bad)" />}
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--tx-1)', flex: 1 }}>{svc.name}</span>
        <span style={{ fontSize: 11, color: 'var(--tx-3)', fontFamily: 'monospace' }}>{svc.baseUrl}</span>
        <Badge tone={svc.status === 'ok' ? 'ok' : 'bad'} dot>{svc.status === 'ok' ? '在线' : '离线'}</Badge>
      </div>
      {svc.status === 'ok' && s && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { label: '调用', value: s.total_calls.toLocaleString(), color: '#3b82f6' },
            { label: '成本', value: fmtCost(s.total_cost_cny), color: '#10b981' },
            { label: '延迟', value: fmtLatency(s.avg_latency_ms), color: '#f59e0b' },
            { label: '错误率', value: `${(s.error_rate * 100).toFixed(1)}%`, color: s.error_rate > 0.05 ? '#ef4444' : 'var(--tx-2)' },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--bg-3)', borderRadius: 6, padding: '6px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--tx-3)', marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      )}
      {svc.status === 'down' && (
        <div style={{ fontSize: 12, color: '#ef4444', fontFamily: 'monospace', marginTop: 4 }}>{svc.error}</div>
      )}
    </div>
  );
}

/* ─── Alert Rules Editor ─── */
function AlertRulesPanel({ rules, services, onChange }: {
  rules: AlertRule[];
  services: ObsService[];
  onChange: (rules: AlertRule[]) => void;
}) {
  const addRule = () => {
    onChange([...rules, {
      id: uid(), name: '新规则', metric: 'error_rate', operator: '>', threshold: 0.1,
      serviceIds: [], enabled: true, cooldownMs: 3600000,
    }]);
  };
  const update = (id: string, patch: Partial<AlertRule>) => {
    onChange(rules.map(r => r.id === id ? { ...r, ...patch } : r));
  };
  const remove = (id: string) => onChange(rules.filter(r => r.id !== id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rules.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--tx-3)', padding: '12px 0' }}>暂无规则 — 点击「添加规则」新建</div>
      )}
      {rules.map(rule => (
        <div key={rule.id} className="subcard" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="input" style={{ width: 140 }}
              value={rule.name}
              onChange={e => update(rule.id, { name: e.target.value })}
              placeholder="规则名称"
            />
            <select className="input" style={{ width: 160 }} value={rule.metric}
              onChange={e => update(rule.id, {
                metric: e.target.value as AlertRule['metric'],
                threshold: METRIC_DEFAULTS[e.target.value],
              })}>
              {Object.entries(METRIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="input" style={{ width: 60 }} value={rule.operator}
              onChange={e => update(rule.id, { operator: e.target.value as AlertRule['operator'] })}>
              <option value=">">{'>'}</option>
              <option value=">=">{'>='}</option>
            </select>
            <input className="input" style={{ width: 90 }} type="number" step="any"
              value={rule.threshold}
              onChange={e => update(rule.id, { threshold: parseFloat(e.target.value) || 0 })}
            />
            <select className="input" style={{ width: 110 }}
              value={rule.serviceIds.length === 0 ? '__all__' : rule.serviceIds[0]}
              onChange={e => update(rule.id, { serviceIds: e.target.value === '__all__' ? [] : [e.target.value] })}>
              <option value="__all__">所有服务</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button
              className={`btn btn--sm${rule.enabled ? '' : ' btn--ghost'}`}
              onClick={() => update(rule.id, { enabled: !rule.enabled })}
              style={rule.enabled ? { background: 'rgba(16,185,129,.15)', color: '#10b981', border: '1px solid rgba(16,185,129,.3)' } : {}}>
              {rule.enabled ? <Bell size={11} /> : <BellOff size={11} />}
              {rule.enabled ? '已启用' : '已停用'}
            </button>
            <button className="btn btn--sm" style={{ marginLeft: 'auto', color: 'var(--bad)' }} onClick={() => remove(rule.id)}>
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      ))}
      <div>
        <button className="btn btn--sm" onClick={addRule}><Plus size={12} /> 添加规则</button>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function ObsPage() {
  const [tab, setTab] = useState<'overview' | 'alerts' | 'services' | 'traces'>('overview');
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AggregateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // settings state
  const [services, setServices] = useState<ObsService[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pollResult, setPollResult] = useState<string | null>(null);

  // new service form
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newToken, setNewToken] = useState('');

  // load config
  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => {
      const cfg = d.config ?? d;
      setServices(cfg.obsServices ?? []);
      setRules(cfg.alertRules ?? []);
      setSettingsLoaded(true);
    });
  }, []);

  const saveConfig = async (svcList: ObsService[], ruleList: AlertRule[]) => {
    setSaving(true);
    try {
      const cfg = await fetch('/api/config').then(r => r.json()).then(d => d.config ?? d);
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cfg, obsServices: svcList, alertRules: ruleList }),
      });
    } finally { setSaving(false); }
  };

  const addService = () => {
    if (!newUrl.trim()) return;
    const svc: ObsService = { id: uid(), name: newName.trim() || newUrl.trim(), baseUrl: newUrl.trim(), enabled: true, authToken: newToken.trim() || undefined };
    const next = [...services, svc];
    setServices(next);
    setNewName(''); setNewUrl(''); setNewToken('');
    saveConfig(next, rules);
  };

  const updateToken = (id: string, token: string) => {
    const next = services.map(s => s.id === id ? { ...s, authToken: token.trim() || undefined } : s);
    setServices(next);
    saveConfig(next, rules);
  };

  const removeService = (id: string) => {
    const next = services.filter(s => s.id !== id);
    setServices(next);
    saveConfig(next, rules);
  };

  const toggleService = (id: string) => {
    const next = services.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
    setServices(next);
    saveConfig(next, rules);
  };

  const updateRules = (r: AlertRule[]) => {
    setRules(r);
    saveConfig(services, r);
  };

  const load = useCallback(async (d: number) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/obs/aggregate?days=${d}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally { setLoading(false); }
  }, []);

  // Fetch-on-mount/refetch-on-change: load() sets loading state before awaiting.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional async data load
  useEffect(() => { load(days); }, [load, days]);

  const runPoll = async () => {
    setPollResult('正在评估…');
    try {
      const res = await fetch('/api/obs/poll', { method: 'POST' });
      const json = await res.json();
      setPollResult(`已评估，触发 ${json.fired} 条告警`);
      load(days);
    } catch {
      setPollResult('评估失败');
    }
    setTimeout(() => setPollResult(null), 4000);
  };

  const s = data?.summary;
  const alertCount = (data?.alerts ?? []).length;

  return (
    <div className="page">
      <div className="page__top">
        <h1 className="page__title"><Bi en="Obs" cn="可观测性" /></h1>
        <div className="page__top-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {pollResult && <span style={{ fontSize: 12, color: 'var(--tx-3)' }}>{pollResult}</span>}
          <button className="btn btn--sm" onClick={runPoll}><Activity size={12} /> 评估告警</button>
          <button className="btn btn--sm" onClick={() => load(days)}><RefreshCw size={12} /> 刷新</button>
          <span style={{ fontSize: 12, color: 'var(--tx-3)' }}>周期</span>
          {[7, 14, 30].map(d => (
            <button key={d} className={`btn btn--sm${days === d ? ' btn--active' : ''}`}
              style={days === d ? { background: 'var(--ac-1)', color: '#fff' } : {}}
              onClick={() => setDays(d)}>{d}d</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {([
          { id: 'overview', label: 'Overview', cn: '总览' },
          { id: 'traces', label: `Traces${(data?.traces ?? []).length > 0 ? ` (${(data?.traces ?? []).length})` : ''}`, cn: '链路' },
          { id: 'alerts', label: `Alerts${alertCount > 0 ? ` (${alertCount})` : ''}`, cn: '告警' },
          { id: 'services', label: 'Services', cn: '服务配置' },
        ] as Array<{ id: typeof tab; label: string; cn: string }>).map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'tab--active' : ''}`} onClick={() => setTab(t.id)}>
            <Bi en={t.label} cn={t.cn} />
          </button>
        ))}
      </div>

      <div className="page__scroll">
        <div className="page__body" style={{ maxWidth: 1100 }}>
          {loading && <div style={{ padding: 32, color: 'var(--tx-3)' }}><Spinner /> 加载中…</div>}
          {error && <div style={{ color: '#ef4444', fontSize: 12, fontFamily: 'monospace', padding: '12px 0' }}>❌ {error}</div>}

          {!loading && tab === 'overview' && (() => {
            const suggestions: Suggestion[] = data ? generateSuggestions({
              summary: data.summary,
              services: data.services as Parameters<typeof generateSuggestions>[0]['services'],
              days,
            }) : [];
            const LEVEL_COLOR: Record<string, string> = { critical: '#ef4444', warn: '#f59e0b', info: '#3b82f6' };
            const LEVEL_LABEL: Record<string, string> = { critical: '严重', warn: '警告', info: '建议' };
            return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {data?.services.length === 0 && (
                <div className="subcard" style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>📡</div>
                  <div style={{ fontSize: 13, color: 'var(--tx-2)', marginBottom: 6 }}>还没有配置监控服务</div>
                  <div style={{ fontSize: 12, color: 'var(--tx-3)' }}>
                    前往「服务配置」标签页，添加你的 Agent 服务地址（如 <code>http://server:8000</code>）
                  </div>
                </div>
              )}

              {s && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    <MetricCard label="总成本" value={fmtCost(s.total_cost_cny)} color="#10b981" />
                    <MetricCard label="总调用" value={s.total_calls.toLocaleString()} color="#3b82f6" />
                    <MetricCard label={
                      s.latency_p95 != null
                        ? `平均延迟  P95:${(s.latency_p95/1000).toFixed(1)}s  P99:${s.latency_p99 != null ? (s.latency_p99/1000).toFixed(1)+'s' : '—'}`
                        : '平均延迟'
                    } value={fmtLatency(s.avg_latency_ms)} color="#f59e0b" />
                    <MetricCard label="错误率" value={`${(s.error_rate * 100).toFixed(1)}%`} color={s.error_rate > 0.05 ? '#ef4444' : 'var(--tx-1)'} />
                  </div>
                  {((s.auth_error_count ?? 0) > 0 || (s.rate_limit_count ?? 0) > 0) && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '0.06em', alignSelf: 'center', whiteSpace: 'nowrap' }}>安全事件</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, flex: 1 }}>
                        <MetricCard label="Auth 失败" value={String(s.auth_error_count ?? 0)} color={(s.auth_error_count ?? 0) > 0 ? '#ef4444' : 'var(--tx-3)'} />
                        <MetricCard label="限流触发" value={String(s.rate_limit_count ?? 0)} color={(s.rate_limit_count ?? 0) > 3 ? '#f59e0b' : 'var(--tx-3)'} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {(data?.services ?? []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>服务状态</div>
                  {(data?.services ?? []).map(svc => <ServiceCard key={svc.id} svc={svc} />)}
                </div>
              )}

              {/* 模型明细 */}
              {(data?.by_model ?? []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>模型明细</div>
                  <div className="subcard" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--hl-2)' }}>
                          {['模型', '服务', '调用', 'Token', '成本', '平均延迟'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: h === '模型' || h === '服务' ? 'left' : 'right', color: 'var(--tx-3)', fontWeight: 500, fontSize: 11 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.by_model ?? []).map((m, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--hl-1)' }}>
                            <td style={{ padding: '9px 14px', color: 'var(--tx-1)', fontFamily: 'monospace', fontSize: 12 }}>{m.model}</td>
                            <td style={{ padding: '9px 14px', color: 'var(--tx-3)' }}>{m.service}</td>
                            <td style={{ padding: '9px 14px', textAlign: 'right', color: 'var(--ac-1)', fontWeight: 600 }}>{m.calls}</td>
                            <td style={{ padding: '9px 14px', textAlign: 'right', color: 'var(--tx-2)' }}>{m.total_tokens.toLocaleString()}</td>
                            <td style={{ padding: '9px 14px', textAlign: 'right', color: m.cost_cny > 0 ? 'var(--warn)' : 'var(--tx-3)', fontFamily: 'monospace' }}>
                              {m.cost_cny > 0 ? `¥${m.cost_cny.toFixed(4)}` : '—'}
                            </td>
                            <td style={{ padding: '9px 14px', textAlign: 'right', color: m.avg_latency_ms && m.avg_latency_ms > 30000 ? 'var(--warn)' : 'var(--tx-2)', fontFamily: 'monospace' }}>
                              {m.avg_latency_ms ? `${(m.avg_latency_ms / 1000).toFixed(1)}s` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 优化建议 */}
              {suggestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <Lightbulb size={12} /> 优化建议 · {suggestions.length} 条
                  </div>
                  {suggestions.map((sg, i) => (
                    <div key={i} className="subcard" style={{ borderLeft: `3px solid ${LEVEL_COLOR[sg.level]}`, padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                          background: `${LEVEL_COLOR[sg.level]}22`, color: LEVEL_COLOR[sg.level],
                          fontFamily: 'monospace', letterSpacing: '0.05em',
                        }}>{LEVEL_LABEL[sg.level]}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-1)' }}>{sg.title}</span>
                        {sg.service && <span style={{ fontSize: 11, color: 'var(--tx-3)', marginLeft: 'auto' }}>{sg.service}</span>}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--tx-2)', lineHeight: 1.7 }}>{sg.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            );
          })()}

          {!loading && tab === 'alerts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Alert rules */}
              <div className="subcard">
                <div className="subcard__hd">
                  <h3 className="subcard__title">告警规则 {saving && <Spinner size={12} />}</h3>
                  <span style={{ fontSize: 11, color: 'var(--tx-3)' }}>规则修改后自动保存</span>
                </div>
                {settingsLoaded
                  ? <AlertRulesPanel rules={rules} services={services} onChange={updateRules} />
                  : <Spinner />}
                <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg-3)', borderRadius: 6, fontSize: 11.5, color: 'var(--tx-3)', lineHeight: 1.6 }}>
                  <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  告警仅在「评估告警」按钮触发或外部调用 <code>POST /api/obs/poll</code> 时运行，页面不会自动后台监测。
                  如需无人值守预警，请将 <code>POST /api/obs/poll</code> 加入服务器 cron。
                </div>
              </div>

              {/* Alert history */}
              <div className="subcard">
                <div className="subcard__hd">
                  <h3 className="subcard__title">告警历史 · {(data?.alerts ?? []).length} 条</h3>
                </div>
                {(data?.alerts ?? []).length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--tx-3)', padding: '16px 0' }}>暂无告警记录</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--br-1)' }}>
                        {['时间', '规则', '服务', '指标', '当前值', '阈值'].map(h => (
                          <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--tx-3)', fontWeight: 500, fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.alerts ?? []).map(ev => (
                        <tr key={ev.id} style={{ borderBottom: '1px solid var(--br-1)' }}>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: 'var(--tx-3)', whiteSpace: 'nowrap' }}>{fmtTs(ev.ts)}</td>
                          <td style={{ padding: '6px 10px', fontWeight: 600, color: '#f59e0b' }}>{ev.ruleName}</td>
                          <td style={{ padding: '6px 10px', color: 'var(--tx-2)' }}>{ev.serviceName}</td>
                          <td style={{ padding: '6px 10px', color: 'var(--tx-3)', fontSize: 11 }}>{METRIC_LABELS[ev.metric] || ev.metric}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: '#ef4444', fontWeight: 700 }}>
                            {ev.metric === 'error_rate' ? `${(ev.value * 100).toFixed(1)}%`
                              : ev.metric === 'avg_latency_ms' ? fmtLatency(ev.value)
                              : (ev.metric === 'auth_error_count' || ev.metric === 'rate_limit_count' || ev.metric === 'daily_calls') ? `${ev.value} 次`
                              : fmtCost(ev.value)}
                          </td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: 'var(--tx-3)' }}>
                            {ev.metric === 'error_rate' ? `${(ev.threshold * 100).toFixed(1)}%`
                              : ev.metric === 'avg_latency_ms' ? fmtLatency(ev.threshold)
                              : fmtCost(ev.threshold)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {tab === 'traces' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(data?.services ?? []).filter(s => s.status === 'ok').map(svc => {
                const svcTraces = (data?.traces ?? []).filter(t => t.serviceId === svc.id)
                return (
                  <div key={svc.id} className="subcard" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--hl-2)', fontSize: 12, fontWeight: 600, color: 'var(--tx-2)' }}>
                      {svc.name}
                    </div>
                    <TraceWaterfall traces={svcTraces as never} serviceName={svc.name} />
                  </div>
                )
              })}
              {(data?.services ?? []).filter(s => s.status === 'ok').length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx-3)', fontSize: 13 }}>暂无在线服务</div>
              )}
            </div>
          )}

          {tab === 'services' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="subcard">
                <div className="subcard__hd">
                  <h3 className="subcard__title">监控服务 {saving && <Spinner size={12} />}</h3>
                </div>

                {/* Add service */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  <input className="input" style={{ width: 140 }} placeholder="服务名称（可选）"
                    value={newName} onChange={e => setNewName(e.target.value)} />
                  <input className="input" style={{ flex: 2, minWidth: 180 }} placeholder="Base URL，如 http://server:8000"
                    value={newUrl} onChange={e => setNewUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addService(); }} />
                  <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Auth Token（可选）"
                    value={newToken} onChange={e => setNewToken(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addService(); }} />
                  <button className="btn" onClick={addService}><Plus size={13} /> 添加服务</button>
                </div>

                {/* Service list */}
                {services.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--tx-3)', padding: '12px 0' }}>
                    暂无服务 — 输入服务地址后点击「添加服务」
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {services.map(svc => (
                      <div key={svc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-3)', borderRadius: 8 }}>
                        <button
                          onClick={() => toggleService(svc.id)}
                          style={{
                            width: 32, height: 18, borderRadius: 999, border: 'none', cursor: 'pointer',
                            background: svc.enabled ? 'var(--ok)' : 'var(--hl-2)',
                            position: 'relative', flexShrink: 0,
                          }}>
                          <span style={{
                            position: 'absolute', top: 2, left: svc.enabled ? 16 : 2,
                            width: 14, height: 14, borderRadius: 999, background: '#fff',
                            transition: 'left 0.15s', display: 'block',
                          }} />
                        </button>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--tx-1)', whiteSpace: 'nowrap' }}>{svc.name}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--tx-3)' }}>{svc.baseUrl}</span>
                        <input
                          className="input"
                          style={{ flex: 1, minWidth: 120, fontSize: 12, padding: '3px 8px', fontFamily: 'monospace' }}
                          placeholder="Auth Token"
                          defaultValue={svc.authToken ?? ''}
                          onBlur={e => updateToken(svc.id, e.target.value)}
                        />
                        <button className="btn btn--sm" style={{ color: 'var(--bad)' }} onClick={() => removeService(svc.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 14, fontSize: 12, color: 'var(--tx-3)', lineHeight: 1.6 }}>
                  每个服务需要运行 obs FastAPI router（<code>/obs/stats</code>）。<br />
                  Quasar 会定期从各服务拉取数据，无需修改服务本身的数据库。
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
