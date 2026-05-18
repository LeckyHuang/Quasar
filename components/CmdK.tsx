'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, Folder, LayoutDashboard, RefreshCw, Settings, GitFork } from 'lucide-react';

interface CmdKProps {
  open: boolean;
  onClose: () => void;
}

interface Item {
  label: string;
  sub?: string;
  icon: React.ReactNode;
  href: string;
  group: string;
}

interface SearchResult {
  id: string;
  name: string;
  kind: 'skill' | 'project';
  href: string;
  snippet: string;
  matchField: string;
}

const NAV_ITEMS: Item[] = [
  { label: 'Dashboard · 仪表盘', icon: <LayoutDashboard size={16} />, href: '/', group: '页面' },
  { label: 'Skills · 技能', icon: <Sparkles size={16} />, href: '/skills', group: '页面' },
  { label: 'Projects · 项目', icon: <Folder size={16} />, href: '/projects', group: '页面' },
  { label: 'Sync · 同步', icon: <RefreshCw size={16} />, href: '/sync', group: '页面' },
  { label: 'Graph · 关联图', icon: <GitFork size={16} />, href: '/graph', group: '页面' },
  { label: 'Settings · 设置', icon: <Settings size={16} />, href: '/settings', group: '页面' },
];

const MATCH_LABEL: Record<string, string> = {
  name: '名称', trigger: '触发词', category: '分类', description: '简介', content: 'SKILL.md', tech: '技术栈', readme: 'README',
};

export default function CmdK({ open, onClose }: CmdKProps) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } catch {}
      setSearching(false);
      setActiveIdx(0);
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Build display items
  const hasQuery = query.length >= 2;
  const displayItems: Item[] = hasQuery
    ? results.map(r => ({
        label: r.name,
        sub: r.snippet,
        icon: r.kind === 'skill' ? <Sparkles size={14} /> : <Folder size={14} />,
        href: r.href,
        group: r.kind === 'skill' ? `Skills · ${MATCH_LABEL[r.matchField] ?? ''}匹配` : `Projects · ${MATCH_LABEL[r.matchField] ?? ''}匹配`,
      }))
    : NAV_ITEMS;

  // Nav items always shown above search results when there's a query but short
  const shortQuery = query.length > 0 && query.length < 2;
  const allDisplayed = shortQuery
    ? NAV_ITEMS.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
    : displayItems;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, allDisplayed.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (allDisplayed[activeIdx]) { router.push(allDisplayed[activeIdx].href); onClose(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (!open) return null;

  const groups: Record<string, Item[]> = {};
  allDisplayed.forEach(item => {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  });

  let globalIdx = 0;

  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="cmdk" onClick={e => e.stopPropagation()}>
        <div className="cmdk__search">
          <Search size={16} />
          <input
            ref={inputRef}
            className="cmdk__input"
            placeholder="搜索名称、触发词、SKILL.md 内容…"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
          />
          {searching
            ? <span style={{ fontSize: 11, color: 'var(--tx-3)' }}>搜索中…</span>
            : <span className="kbd">Esc</span>
          }
        </div>
        <div className="cmdk__list">
          {!hasQuery && (
            <div style={{ padding: '6px 16px 2px', fontSize: 11, color: 'var(--tx-4)', letterSpacing: '0.04em' }}>输入 2 个字符开始搜索</div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="cmdk__group-label">{group}</div>
              {items.map((item) => {
                const idx = globalIdx++;
                const isActive = idx === activeIdx;
                return (
                  <div
                    key={item.href + idx}
                    className={`cmdk__item ${isActive ? 'cmdk__item--active' : ''}`}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => { router.push(item.href); onClose(); }}
                  >
                    <span className="cmdk__item-icon">{item.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="cmdk__item-label">{item.label}</div>
                      {item.sub && (
                        <div style={{ fontSize: 11, color: 'var(--tx-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.sub}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {hasQuery && !searching && allDisplayed.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--tx-3)', fontSize: 13 }}>
              未找到与「{query}」相关的内容
            </div>
          )}
        </div>
        <div className="cmdk__ft">
          <span className="cmdk__ft-item"><span className="kbd">↵</span> 打开</span>
          <span className="cmdk__ft-item"><span className="kbd">↑↓</span> 导航</span>
          <span className="cmdk__ft-item"><span className="kbd">Esc</span> 关闭</span>
        </div>
      </div>
    </div>
  );
}
