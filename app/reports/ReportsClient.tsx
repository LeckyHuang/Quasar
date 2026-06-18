'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, Filter, Dna, FlaskConical, Share2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Badge, Spinner, Bi } from '@/components/ui';
import type { QuasarReport, ReportRunType, ReportTargetType, DarwinPayload, TestPayload, UniversalizerPayload } from '@/types';

/* ─── helpers ─── */
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? '昨天' : `${d}d ago`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ─── type config ─── */
const RUN_TYPE_CONFIG: Record<ReportRunType, { label: string; icon: React.ReactNode; color: string }> = {
  'darwin': { label: 'Darwin', icon: <Dna size={13} />, color: 'var(--ac-1)' },
  'test-architect': { label: 'Test', icon: <FlaskConical size={13} />, color: '#4ED4B5' },
  'skill-universalizer': { label: 'Universalizer', icon: <Share2 size={13} />, color: '#A78BFA' },
};

function statusTone(status: string, runType: ReportRunType): 'ok' | 'warn' | 'bad' | 'soft' {
  if (runType === 'darwin') {
    if (status === 'improved') return 'ok';
    if (status === 'rolled_back') return 'warn';
    if (status === 'no_change') return 'soft';
  }
  if (runType === 'test-architect') {
    if (status === 'completed') return 'ok';
    if (status === 'failed') return 'bad';
  }
  if (runType === 'skill-universalizer') {
    if (status === 'go') return 'ok';
    if (status === 'no-go') return 'bad';
    if (status === 'go-with-changes') return 'warn';
  }
  return 'soft';
}

/* ─── Payload detail views ─── */
function DarwinDetail({ p }: { p: DarwinPayload }) {
  const delta = p.scoreAfter - p.scoreBefore;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
      {[
        { label: '优化前', value: `${p.scoreBefore}` },
        { label: '优化后', value: `${p.scoreAfter}` },
        { label: '变化', value: delta > 0 ? `+${delta}` : `${delta}` },
      ].map(item => (
        <div key={item.label} style={{ background: 'var(--bg-1)', borderRadius: 6, padding: '8px 12px' }}>
          <div style={{ fontSize: 10, color: 'var(--tx-3)', marginBottom: 3 }}>{item.label}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: delta > 0 ? 'var(--ok)' : delta < 0 ? 'var(--bad)' : 'var(--tx-2)', fontFamily: 'var(--f-mono)' }}>{item.value}</div>
        </div>
      ))}
      {p.dimension && (
        <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--tx-2)' }}>
          优化维度：<span style={{ color: 'var(--ac-1)', fontWeight: 500 }}>{p.dimension}</span>
          {p.mode && <span style={{ color: 'var(--tx-3)', marginLeft: 12 }}>模式：{p.mode}</span>}
          {p.commit && <span className="mono" style={{ color: 'var(--tx-3)', marginLeft: 12, fontSize: 11 }}>{p.commit.slice(0, 7)}</span>}
        </div>
      )}
    </div>
  );
}

function TestDetail({ p }: { p: TestPayload }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { label: '总计', value: p.total },
          { label: '通过', value: p.passed, color: 'var(--ok)' },
          { label: '新失败', value: p.failed_new, color: p.failed_new > 0 ? 'var(--bad)' : 'var(--ok)' },
          { label: '既有问题', value: p.failed_preexisting, color: p.failed_preexisting > 0 ? 'var(--warn)' : 'var(--ok)' },
        ].map(item => (
          <div key={item.label} style={{ background: 'var(--bg-1)', borderRadius: 6, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--tx-3)', marginBottom: 3 }}>{item.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: item.color ?? 'var(--tx-1)', fontFamily: 'var(--f-mono)' }}>{item.value}</div>
          </div>
        ))}
      </div>
      {p.new_issues && p.new_issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--tx-3)' }}>新发现问题</div>
          {p.new_issues.map((issue, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--tx-2)' }}>
              <Badge tone={issue.priority === 'P0' || issue.priority === 'P1' ? 'bad' : 'warn'}>{issue.priority}</Badge>
              <span>{issue.title}</span>
              <span style={{ color: 'var(--tx-3)', fontSize: 11 }}>{issue.layer}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UniversalizerDetail({ p }: { p: UniversalizerPayload }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: '价值评分', value: `${p.valueScore}/10` },
          { label: '可行性', value: `${p.feasibilityScore}/10` },
          { label: '结论', value: p.verdict === 'go' ? '✓ GO' : p.verdict === 'no-go' ? '✗ NO-GO' : '△ 有条件' },
        ].map(item => (
          <div key={item.label} style={{ background: 'var(--bg-1)', borderRadius: 6, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--tx-3)', marginBottom: 3 }}>{item.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ac-1)', fontFamily: 'var(--f-mono)' }}>{item.value}</div>
          </div>
        ))}
      </div>
      {p.summary && <div style={{ fontSize: 12.5, color: 'var(--tx-2)', lineHeight: 1.6 }}>{p.summary}</div>}
    </div>
  );
}

function ReportRow({ report }: { report: QuasarReport }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = RUN_TYPE_CONFIG[report.runType];
  const tone = statusTone(report.status, report.runType);

  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--hl-1)',
      borderLeft: `3px solid ${cfg.color}`,
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
        onClick={() => setExpanded(v => !v)}
      >
        <span style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-1)' }}>{report.targetName}</span>
            <Badge tone="soft" style={{ fontSize: 10 }}>{cfg.label}</Badge>
            <Badge tone={tone}>{report.status}</Badge>
          </div>
          <div style={{ fontSize: 12, color: 'var(--tx-3)', marginTop: 2 }}>
            {report.targetType === 'skill' ? '🔧 Skill' : '📁 Project'} · {fmtDate(report.timestamp)} · {timeAgo(report.timestamp)}
          </div>
        </div>

        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 13, fontWeight: 700, color: 'var(--ac-1)', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {report.headline}
        </div>

        <span style={{ color: 'var(--tx-3)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--hl-1)' }}>
          <div style={{ paddingTop: 12 }}>
            {report.runType === 'darwin' && <DarwinDetail p={report.payload as DarwinPayload} />}
            {report.runType === 'test-architect' && <TestDetail p={report.payload as TestPayload} />}
            {report.runType === 'skill-universalizer' && <UniversalizerDetail p={report.payload as UniversalizerPayload} />}

            {report.nativeReportPath && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--tx-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ExternalLink size={11} />
                <span className="mono">{report.nativeReportPath}</span>
              </div>
            )}

            <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
              {report.targetType === 'skill' && (
                <Link href={`/skills/${encodeURIComponent(report.targetPath.split('/').pop() ?? report.targetName)}`}
                  className="btn btn--sm btn--ghost" style={{ textDecoration: 'none', fontSize: 11 }}>
                  → 查看 Skill
                </Link>
              )}
              {report.targetType === 'project' && (
                <Link href={`/projects/${encodeURIComponent(report.targetPath.split('/').pop() ?? report.targetName)}`}
                  className="btn btn--sm btn--ghost" style={{ textDecoration: 'none', fontSize: 11 }}>
                  → 查看 Project
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Summary stats ─── */
function SummaryBar({ reports }: { reports: QuasarReport[] }) {
  const darwin = reports.filter(r => r.runType === 'darwin');
  const tests = reports.filter(r => r.runType === 'test-architect');
  const univ = reports.filter(r => r.runType === 'skill-universalizer');
  const improved = darwin.filter(r => r.status === 'improved').length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
      {[
        { label: '总报告数', value: reports.length, color: 'var(--ac-1)' },
        { label: 'Darwin 运行', value: darwin.length, sub: `${improved} 轮改进`, color: 'var(--ac-1)' },
        { label: '测试运行', value: tests.length, color: '#4ED4B5' },
        { label: '通用化评估', value: univ.length, color: '#A78BFA' },
      ].map(item => (
        <div key={item.label} style={{ background: 'var(--bg-2)', border: '1px solid var(--hl-1)', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: 'var(--tx-3)', marginBottom: 6 }}>{item.label}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: item.color, fontFamily: 'var(--f-mono)' }}>{item.value}</div>
          {item.sub && <div style={{ fontSize: 11, color: 'var(--tx-3)', marginTop: 3 }}>{item.sub}</div>}
        </div>
      ))}
    </div>
  );
}

/* ─── Main ─── */
export default function ReportsClient() {
  const [reports, setReports] = useState<QuasarReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<ReportRunType | 'all'>('all');
  const [filterTarget, setFilterTarget] = useState<ReportTargetType | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.set('runType', filterType);
      if (filterTarget !== 'all') params.set('targetType', filterTarget);
      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      setReports(data.reports ?? []);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterTarget]);

  useEffect(() => { load(); }, [load]);

  const runTypeFilters: Array<{ id: ReportRunType | 'all'; label: string }> = [
    { id: 'all', label: '全部' },
    { id: 'darwin', label: 'Darwin' },
    { id: 'test-architect', label: 'Test' },
    { id: 'skill-universalizer', label: 'Universalizer' },
  ];

  const targetFilters: Array<{ id: ReportTargetType | 'all'; label: string }> = [
    { id: 'all', label: '全部类型' },
    { id: 'skill', label: 'Skill' },
    { id: 'project', label: 'Project' },
  ];

  return (
    <div className="page">
      <div className="page__top">
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--tx-1)' }}>
          <Bi en="Reports" cn="报告历史" />
        </h1>
        <div className="page__top-actions">
          <button className="btn btn--ghost btn--sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      <div className="page__scroll">
        <div style={{ padding: '0 0 32px' }}>
          <SummaryBar reports={reports} />

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <Filter size={13} style={{ color: 'var(--tx-3)' }} />
            <div style={{ display: 'flex', gap: 4 }}>
              {runTypeFilters.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`btn btn--sm ${filterType === f.id ? 'btn--primary' : 'btn--ghost'}`}
                  style={{ fontSize: 11 }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{ width: 1, height: 16, background: 'var(--hl-2)' }} />
            <div style={{ display: 'flex', gap: 4 }}>
              {targetFilters.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterTarget(f.id)}
                  className={`btn btn--sm ${filterTarget === f.id ? 'btn--primary' : 'btn--ghost'}`}
                  style={{ fontSize: 11 }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--tx-3)' }}>{reports.length} 条记录</span>
          </div>

          {/* Timeline */}
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--tx-3)' }}><Spinner size={24} /></div>
          ) : reports.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--bg-2)', border: '1px solid var(--hl-1)', borderRadius: 8 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx-1)', marginBottom: 8 }}>暂无报告记录</div>
              <div style={{ fontSize: 13, color: 'var(--tx-3)' }}>
                在 Skill 或 Project 详情页点击「Run Darwin」「Run Test」等按钮触发工具运行，报告将自动汇流到此处。
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reports.map(r => <ReportRow key={r.id} report={r} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
