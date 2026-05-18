import { getData } from '@/lib/dataService';
import { ArrowUp, ArrowDown, Sparkles, Folder } from 'lucide-react';
import Link from 'next/link';
import { Donut, HealthRing, Badge, Bi } from '@/components/ui';
import { RefreshButton, QuickActions } from './DashboardActions';

export const dynamic = 'force-dynamic';

const CAT_COLORS: Record<string, string> = {
  engineering: '#5B8DEF',
  content: '#E07AC7',
  design: '#A78BFA',
  data: '#4ED4B5',
  uncategorized: '#74747F',
};
const CAT_LABELS: Record<string, string> = {
  engineering: 'Engineering',
  content: 'Content',
  design: 'Design',
  data: 'Data',
  uncategorized: 'Other',
};

function timeAgo(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function DashboardPage() {
  const { skills, projects, lastScanned } = await getData();

  // Stats
  const avgHealth = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.healthScore, 0) / projects.length)
    : 0;
  const gitSynced = [...skills.filter(s => s.hasGit), ...projects.filter(p => p.hasGitRemote)].length;
  const alerts = [
    ...projects.filter(p => !p.hasClaudeConfig).map(p => ({ dot: 'bad' as const, title: `${p.name} 缺少 CLAUDE.md`, sub: p.path, href: `/projects/${p.id}` })),
    ...projects.filter(p => !p.hasGitRemote).map(p => ({ dot: 'bad' as const, title: `${p.name} 没有 Git Remote`, sub: p.path, href: `/projects/${p.id}` })),
    ...projects.filter(p => !p.hasDeployConfig).map(p => ({ dot: 'warn' as const, title: `${p.name} 缺少部署文档`, sub: p.path, href: `/projects/${p.id}` })),
    ...skills.filter(s => s.hasGit && s.gitRemote).slice(0, 3).map(s => ({ dot: 'info' as const, title: `${s.name} 有未推送提交`, sub: s.path, href: `/skills/${s.id}` })),
  ].slice(0, 7);

  const stats = [
    { id: 'skills', label: 'Skills', value: skills.length, delta: '+2 本周', deltaKind: 'up' as const, icon: <Sparkles size={13} />, href: '/skills' },
    { id: 'projects', label: 'Projects', value: projects.length, delta: '本地管理', deltaKind: null, icon: <Folder size={13} />, href: '/projects' },
    { id: 'health', label: 'Avg Health', value: avgHealth, delta: avgHealth >= 70 ? '健康' : '需关注', deltaKind: avgHealth >= 70 ? 'up' as const : 'down' as const, icon: null, href: '/projects' },
    { id: 'git', label: 'Git Synced', value: gitSynced, delta: `共 ${skills.length + projects.length} 个资产`, deltaKind: null, icon: null, href: '/sync' },
    { id: 'alerts', label: 'Alerts', value: alerts.length, delta: alerts.length > 0 ? '需处理' : '全部正常', deltaKind: alerts.length > 0 ? 'down' as const : 'up' as const, icon: null, href: '/sync' },
  ];

  // Recent items
  const recent = [
    ...skills.map(s => ({ kind: 'skill' as const, id: s.id, name: s.name, meta: s.category, when: timeAgo(s.lastModified), href: `/skills/${s.id}` })),
    ...projects.map(p => ({ kind: 'project' as const, id: p.id, name: p.name, meta: p.lastCommit?.message?.slice(0, 40) || p.type, when: timeAgo(p.lastModified), href: `/projects/${p.id}` })),
  ].sort(() => Math.random() - 0.5).slice(0, 5);

  // Donut data
  const catBuckets: Record<string, number> = {};
  skills.forEach(s => { catBuckets[s.category] = (catBuckets[s.category] || 0) + 1; });
  const donutData = Object.entries(catBuckets).map(([id, v]) => ({
    name: CAT_LABELS[id] || id,
    value: v,
    color: CAT_COLORS[id] || '#74747F',
  }));

  // Health buckets
  const high = projects.filter(p => p.healthScore >= 80).length;
  const mid = projects.filter(p => p.healthScore >= 60 && p.healthScore < 80).length;
  const low = projects.filter(p => p.healthScore < 60).length;
  const total = projects.length || 1;

  return (
    <div className="page">
      <div className="page__top">
        <h1 className="page__title"><Bi en="Dashboard" cn="仪表盘" /></h1>
        <div className="page__top-actions">
          <span className="muted" style={{ fontSize: 12 }}>
            {lastScanned ? `Indexed ${timeAgo(lastScanned)} · 本地索引` : '未扫描'}
          </span>
          <RefreshButton />
        </div>
      </div>

      <div className="page__scroll">
        <div className="page__body">
          {/* Stats row */}
          <div className="stats-row">
            {stats.map(s => (
              <Link key={s.id} href={s.href} className="stat" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <div className="stat__label">
                  {s.icon && <span className="stat__icon">{s.icon}</span>}
                  {s.label}
                </div>
                <div className="stat__value">{s.value}</div>
                <div className={`stat__delta ${s.deltaKind === 'up' ? 'stat__delta--up' : s.deltaKind === 'down' ? 'stat__delta--down' : ''}`}>
                  {s.deltaKind === 'up' && <ArrowUp size={10} strokeWidth={2.4} />}
                  {s.deltaKind === 'down' && <ArrowDown size={10} strokeWidth={2.4} />}
                  {s.delta}
                </div>
              </Link>
            ))}
          </div>

          <div className="dash-grid">
            <div className="col" style={{ gap: 16 }}>
              {/* Recently active */}
              <div className="section">
                <div className="section__hd">
                  <h2 className="section__title"><Bi en="Recently Active" cn="最近活跃" /></h2>
                  <span className="section__sub">Skills + Projects, by last modified</span>
                </div>
                <div className="recent">
                  {recent.map((r, i) => (
                    <Link key={i} href={r.href} className="recent-card" style={{ textDecoration: 'none' }}>
                      <div className="recent-card__hd">
                        <span className="recent-card__dot" style={{ background: r.kind === 'skill' ? 'var(--ac-1)' : 'var(--ok)' }} />
                        {r.kind === 'skill' ? 'Skill' : 'Project'} · <span style={{ color: 'var(--tx-3)' }}>{r.when}</span>
                      </div>
                      <div className="recent-card__title">{r.name}</div>
                      <div className="recent-card__meta">{r.meta}</div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Donut + Health bars */}
              <div className="spark-row">
                <div className="section">
                  <div className="section__hd">
                    <h2 className="section__title"><Bi en="Skills by Category" cn="分类分布" /></h2>
                    <span className="section__sub">{skills.length} 个</span>
                  </div>
                  <div className="donut-wrap">
                    <div className="donut">
                      <Donut data={donutData} size={132} stroke={16} />
                      <div className="donut__center">
                        <div>
                          <div className="donut__center-num">{skills.length}</div>
                          <div className="donut__center-lbl">Skills</div>
                        </div>
                      </div>
                    </div>
                    <div className="donut-legend">
                      {donutData.map(d => (
                        <div key={d.name} className="donut-legend__row">
                          <span className="donut-legend__sw" style={{ background: d.color }} />
                          <span className="donut-legend__name">{d.name}</span>
                          <span className="donut-legend__val">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="section">
                  <div className="section__hd">
                    <h2 className="section__title"><Bi en="Project Health" cn="项目健康度" /></h2>
                    <span className="section__sub">{projects.length} 个</span>
                  </div>
                  <div className="health-bars">
                    {[
                      { label: '高 (80+)', count: high, color: 'var(--ok)' },
                      { label: '中 (60-79)', count: mid, color: 'var(--warn)' },
                      { label: '低 (<60)', count: low, color: 'var(--bad)' },
                    ].map(b => (
                      <div className="health-bar" key={b.label}>
                        <div className="health-bar__hd">
                          <span className="health-bar__name">
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: b.color, marginRight: 6, verticalAlign: 'middle' }} />
                            {b.label}
                          </span>
                          <span className="health-bar__val">{b.count} · {Math.round(b.count / total * 100)}%</span>
                        </div>
                        <div className="health-bar__track">
                          <div className="health-bar__fill" style={{ width: `${b.count / total * 100}%`, background: b.color }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop: 6, paddingTop: 12, borderTop: '1px solid var(--hl-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5 }}>
                      <span className="tx-3">Average · 平均</span>
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--tx-1)', fontWeight: 600 }}>
                        {avgHealth}<span className="tx-3" style={{ fontWeight: 400 }}> / 100</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: alerts + quick actions */}
            <div className="col" style={{ gap: 16 }}>
              <div className="section">
                <div className="section__hd">
                  <h2 className="section__title"><Bi en="Needs Attention" cn="需要关注" /></h2>
                  <Badge tone="soft">{alerts.length}</Badge>
                </div>
                <div className="alert-list">
                  {alerts.map((a, i) => (
                    <Link key={i} href={a.href} className="alert" style={{ textDecoration: 'none' }}>
                      <span className={`alert__dot alert__dot--${a.dot}`} />
                      <div className="alert__body">
                        <div className="alert__title">{a.title}</div>
                        <div className="alert__sub">{a.sub}</div>
                      </div>
                      <span className="alert__action">查看</span>
                    </Link>
                  ))}
                  {alerts.length === 0 && (
                    <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--ok)', fontSize: 12 }}>
                      ✓ 全部正常
                    </div>
                  )}
                </div>
              </div>

              <div className="section">
                <div className="section__hd">
                  <h2 className="section__title"><Bi en="Quick Actions" cn="快速操作" /></h2>
                </div>
                <QuickActions />
              </div>

              {/* Top projects by health */}
              <div className="section">
                <div className="section__hd">
                  <h2 className="section__title"><Bi en="Top Projects" cn="优质项目" /></h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {projects.sort((a, b) => b.healthScore - a.healthScore).slice(0, 4).map(p => (
                    <Link key={p.id} href={`/projects/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                      <HealthRing value={p.healthScore} size={32} stroke={3} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--tx-3)' }}>{p.techStack.slice(0, 3).join(' · ')}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
