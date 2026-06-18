'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Sparkles, Folder, RefreshCw, Settings,
  Search, ChevronLeft, Zap, GitFork, AlertTriangle, Activity, LogOut, ClipboardList,
} from 'lucide-react';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  cn: string;
  meta?: string | number;
  badge?: number;
  active: boolean;
}

function NavItem({ href, icon, label, cn, meta, badge, active }: NavItemProps) {
  return (
    <Link href={href} className={`nav__item ${active ? 'nav__item--active' : ''}`} style={{ textDecoration: 'none' }}>
      <span className="nav__item-icon">{icon}</span>
      <span className="nav__item-label">
        {label}<span className="nav__item-cn">{cn}</span>
      </span>
      {badge != null && <span className="nav__item-meta nav__item-meta--badge">{badge}</span>}
      {meta != null && badge == null && <span className="nav__item-meta">{meta}</span>}
    </Link>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenCmdK: () => void;
  skillCount?: number;
  projectCount?: number;
  syncAlerts?: number;
  onLogout?: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse, onOpenCmdK, skillCount, projectCount, syncAlerts, onLogout }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (base: string) => {
    if (base === '/') return pathname === '/';
    return pathname.startsWith(base);
  };

  return (
    <aside className="nav">
      <div className="nav__brand">
        <div className="nav__brand-mark">
          <Zap size={18} color="var(--ac-1)" strokeWidth={2.5} />
        </div>
        <div className="nav__brand-text" style={{ display: collapsed ? 'none' : 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span className="nav__brand-name">QUASAR</span>
          <span className="nav__brand-sub">AI 资产管理</span>
        </div>
      </div>

      <button className="nav__search" onClick={onOpenCmdK} style={{ appearance: 'none', border: '1px solid var(--hl-1)', background: 'var(--bg-3)', cursor: 'text', width: '100%' }}>
        <Search size={13} />
        <span className="nav__search-text">搜索 · Search</span>
        <span className="kbd kbd-hint">⌘K</span>
      </button>

      <div className="nav__group">
        <NavItem href="/" icon={<LayoutDashboard size={16} />} label="Dashboard" cn="仪表盘" active={isActive('/')} />
        <NavItem href="/skills" icon={<Sparkles size={16} />} label="Skills" cn="技能" meta={skillCount} active={isActive('/skills')} />
        <NavItem href="/projects" icon={<Folder size={16} />} label="Projects" cn="项目" meta={projectCount} active={isActive('/projects')} />
        <NavItem href="/sync" icon={<RefreshCw size={16} />} label="Sync" cn="同步" badge={syncAlerts} active={isActive('/sync')} />
        <NavItem href="/graph" icon={<GitFork size={16} />} label="Graph" cn="关联图" active={isActive('/graph')} />
        <NavItem href="/pitfalls" icon={<AlertTriangle size={16} />} label="Lessons" cn="教训集" active={isActive('/pitfalls')} />
        <NavItem href="/reports" icon={<ClipboardList size={16} />} label="Reports" cn="报告历史" active={isActive('/reports')} />
        <NavItem href="/obs" icon={<Activity size={16} />} label="Obs" cn="可观测性" active={isActive('/obs')} />
        <NavItem href="/settings" icon={<Settings size={16} />} label="Settings" cn="设置" active={isActive('/settings')} />
      </div>

      <div className="nav__group" style={{ marginTop: 'auto' }}>
        <div className="nav__group-label">Scan Status · 扫描状态</div>
        <div style={{ padding: '4px 10px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11.5, color: 'var(--tx-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: 999,
              background: 'var(--ok)',
              boxShadow: '0 0 6px rgba(34,197,94,0.7)',
              flex: 'none',
              display: 'inline-block',
            }} />
            <span className="nav__footer-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              目录可访问
            </span>
          </div>
          <div className="nav__footer-text" style={{ fontSize: 10.5, color: 'var(--tx-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Last scan · 5m ago
          </div>
        </div>
      </div>

      <div className="nav__footer">
        <button className="nav__collapse-btn" onClick={onToggleCollapse}>
          <ChevronLeft size={14} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flex: 'none' }} />
          <span className="nav__footer-text">{collapsed ? 'Expand · 展开' : 'Collapse · 收起'}</span>
        </button>
        <div className="nav__user" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="nav__user-avatar">Q</div>
          <div className="nav__footer-text" style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 12, color: 'var(--tx-1)', fontWeight: 500 }}>QUASAR</span>
            <span style={{ fontSize: 10.5, color: 'var(--tx-3)' }}>Local mode · 本地模式</span>
          </div>
          {onLogout && (
            <button onClick={onLogout} title="退出登录"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <LogOut size={13} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
