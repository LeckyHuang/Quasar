'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import CmdK from './CmdK';

const ACCENT_COLORS: Record<string, string> = {
  blue:   '#5B8DEF',
  purple: '#7C6EF9',
  teal:   '#2DD4BF',
  amber:  '#F59E0B',
};

function applyTheme(appearance: string, accent: string) {
  const html = document.documentElement;
  html.dataset.theme = appearance === 'light' ? 'light' : 'dark';
  const color = ACCENT_COLORS[accent] ?? ACCENT_COLORS.blue;
  html.style.setProperty('--ac-1', color);
}

function WelcomeModal({ onDismiss }: { onDismiss: () => void }) {
  const router = useRouter();
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-1)', border: '1px solid var(--hl-2)', borderRadius: 16,
        padding: '32px 36px', maxWidth: 480, width: '90%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>👋</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx-1)', margin: '0 0 8px' }}>
          欢迎使用 QUASAR
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--tx-2)', lineHeight: 1.7, margin: '0 0 20px' }}>
          你的 AI 资产管理中心。在开始之前，先配置扫描目录——告诉 QUASAR 你的 Skills 和 Projects 放在哪里。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, padding: '14px 16px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 13, color: 'var(--tx-2)' }}>
          <div>📁 <b>Skills 目录</b>：例如 <code style={{ fontFamily: 'var(--f-mono)', fontSize: 12, background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 4 }}>~/.claude/skills</code></div>
          <div>💼 <b>Projects 目录</b>：例如 <code style={{ fontFamily: 'var(--f-mono)', fontSize: 12, background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 4 }}>~/Desktop/project</code></div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn--primary"
            style={{ flex: 1 }}
            onClick={() => { onDismiss(); router.push('/settings'); }}
          >
            去设置扫描目录 →
          </button>
          <button className="btn" onClick={onDismiss}>稍后再说</button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(false);
  const router = useRouter();

  const openCmdK = useCallback(() => setCmdkOpen(true), []);
  const closeCmdK = useCallback(() => setCmdkOpen(false), []);

  // Load theme from config on mount, detect firstRun
  useEffect(() => {
    fetch('/api/config')
      .then(r => {
        if (r.status === 401) { router.replace('/login'); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        const cfg = data.config ?? data;
        applyTheme(cfg.appearance ?? 'dark', cfg.accent ?? 'blue');
        if (data.firstRun) setShowWelcome(true);
        setAuthEnabled(!!data.authEnabled);
      })
      .catch(() => {});
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  // Listen for theme changes from settings page
  useEffect(() => {
    const handler = (e: Event) => {
      const { appearance, accent } = (e as CustomEvent).detail;
      applyTheme(appearance, accent);
    };
    window.addEventListener('quasar:theme-change', handler);
    return () => window.removeEventListener('quasar:theme-change', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={`app ${collapsed ? 'app--collapsed' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(v => !v)}
        onOpenCmdK={openCmdK}
        onLogout={authEnabled ? handleLogout : undefined}
      />
      <div className="content">
        {children}
      </div>
      <CmdK open={cmdkOpen} onClose={closeCmdK} />
      {showWelcome && <WelcomeModal onDismiss={() => setShowWelcome(false)} />}
    </div>
  );
}
